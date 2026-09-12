// src/lib/crypto.ts
// The ONLY module that touches WebCrypto. Everything else calls these functions.
// Primitives: AES-256-GCM (data), PBKDF2 (password->key, Argon2id-swappable), ECDH P-256 (key wrapping).

const te = new TextEncoder();
const td = new TextDecoder();

// Copy bytes into a fresh ArrayBuffer-backed Uint8Array so WebCrypto's BufferSource
// typing is satisfied under strict + bundler moduleResolution (avoids ArrayBufferLike unions).
function buf(u: Uint8Array): Uint8Array<ArrayBuffer> {
  const ab = new ArrayBuffer(u.length);
  const out = new Uint8Array(ab);
  out.set(u);
  return out;
}

export const b64 = (b: ArrayBuffer | Uint8Array): string => {
  const u = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
};
export const unb64 = (s: string): Uint8Array =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export type WrappedKey = { wrapped: string; iv: string; ephPub: JsonWebKey };
export type Enc = { iv: string; ct: string };

export const randomSalt = (): Uint8Array => crypto.getRandomValues(new Uint8Array(16));
export const randomDEK = (): Uint8Array => crypto.getRandomValues(new Uint8Array(32));

// 1. password -> KEK (PBKDF2 now; swap body to Argon2id later, signature unchanged)
export async function deriveKEK(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", buf(te.encode(password)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: buf(salt), iterations: 600_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// 2. AES-256-GCM on raw bytes with a supplied CryptoKey
export async function aesEncrypt(key: CryptoKey, data: Uint8Array): Promise<Enc> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, buf(data));
  return { iv: b64(iv), ct: b64(ct) };
}
export async function aesDecrypt(key: CryptoKey, iv: string, ct: string): Promise<Uint8Array> {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf(unb64(iv)) }, key, buf(unb64(ct)));
  return new Uint8Array(pt);
}

// AES-256-GCM using a raw 32-byte DEK (helper for per-document keys)
export async function aesEncryptRaw(dek: Uint8Array, data: Uint8Array): Promise<Enc> {
  const key = await crypto.subtle.importKey("raw", buf(dek), "AES-GCM", false, ["encrypt"]);
  return aesEncrypt(key, data);
}
export async function aesDecryptRaw(dek: Uint8Array, iv: string, ct: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", buf(dek), "AES-GCM", false, ["decrypt"]);
  return aesDecrypt(key, iv, ct);
}

// 3. identity key-pair (ECDH P-256)
export async function genIdentity(): Promise<{ publicJwk: JsonWebKey; privateJwk: JsonWebKey }> {
  const kp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
  return {
    publicJwk: await crypto.subtle.exportKey("jwk", kp.publicKey),
    privateJwk: await crypto.subtle.exportKey("jwk", kp.privateKey),
  };
}

// 4. wrap a DEK to a recipient's public key (ephemeral-static ECDH)
export async function wrapKeyTo(recipientPublicJwk: JsonWebKey, dek: Uint8Array): Promise<WrappedKey> {
  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
  const pub = await crypto.subtle.importKey("jwk", recipientPublicJwk, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = await crypto.subtle.deriveKey({ name: "ECDH", public: pub }, eph.privateKey, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, shared, buf(dek));
  return { wrapped: b64(wrapped), iv: b64(iv), ephPub: await crypto.subtle.exportKey("jwk", eph.publicKey) };
}

// 5. unwrap a DEK with my private key
export async function unwrapKeyWith(myPrivateJwk: JsonWebKey, box: WrappedKey): Promise<Uint8Array> {
  const myPriv = await crypto.subtle.importKey("jwk", myPrivateJwk, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey"]);
  const ephPub = await crypto.subtle.importKey("jwk", box.ephPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = await crypto.subtle.deriveKey({ name: "ECDH", public: ephPub }, myPriv, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const dek = await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf(unb64(box.iv)) }, shared, buf(unb64(box.wrapped)));
  return new Uint8Array(dek);
}

export { te as _te, td as _td };
