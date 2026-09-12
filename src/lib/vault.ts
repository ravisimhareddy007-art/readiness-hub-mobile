// src/lib/vault.ts
// Identity + session + per-document encryption, built on crypto.ts.
// The unlocked private key lives ONLY in this module's closure and is cleared on lock.

import {
  deriveKEK, aesEncrypt, aesDecrypt, aesEncryptRaw, aesDecryptRaw,
  genIdentity, wrapKeyTo, unwrapKeyWith, randomSalt, randomDEK,
  b64, unb64, type WrappedKey, type Enc,
} from "./crypto";

const te = new TextEncoder();
const td = new TextDecoder();

export interface VaultIdentity {
  publicJwk: JsonWebKey;
  wrappedPrivate: Enc;   // private key JWK, AES-GCM'd by the KEK
  salt: string;          // base64
}

const LS_ID = "lifepack.identity.v1";

// ---- session (in-memory only) ----
let _privateJwk: JsonWebKey | null = null;
let _publicJwk: JsonWebKey | null = null;
export const isUnlocked = () => _privateJwk !== null;
export const myPublicKey = () => _publicJwk;
export function lockVault() { _privateJwk = null; _publicJwk = null; }

// ---- identity persistence (safe: only wrapped data) ----
export function loadIdentity(): VaultIdentity | null {
  try { const r = localStorage.getItem(LS_ID); return r ? JSON.parse(r) : null; } catch { return null; }
}
function saveIdentity(id: VaultIdentity) { localStorage.setItem(LS_ID, JSON.stringify(id)); }
export const hasVault = () => !!loadIdentity();

// ---- CREATE ----
export async function createVault(password: string): Promise<VaultIdentity> {
  const { publicJwk, privateJwk } = await genIdentity();
  const salt = randomSalt();
  const kek = await deriveKEK(password, salt);
  const wrappedPrivate = await aesEncrypt(kek, te.encode(JSON.stringify(privateJwk)));
  const id: VaultIdentity = { publicJwk, wrappedPrivate, salt: b64(salt) };
  saveIdentity(id);
  _privateJwk = privateJwk; _publicJwk = publicJwk;
  return id;
}

// ---- UNLOCK ---- (returns false on wrong password; GCM tag failure IS the check)
export async function unlockVault(password: string, id: VaultIdentity = loadIdentity()!): Promise<boolean> {
  if (!id) return false;
  const kek = await deriveKEK(password, unb64(id.salt));
  try {
    const bytes = await aesDecrypt(kek, id.wrappedPrivate.iv, id.wrappedPrivate.ct);
    _privateJwk = JSON.parse(td.decode(bytes));
    _publicJwk = id.publicJwk;
    return true;
  } catch { return false; }
}

// ---- CHANGE PASSWORD (cheap: re-wrap the same private key) ----
export async function changePassword(oldPw: string, newPw: string): Promise<boolean> {
  const id = loadIdentity(); if (!id) return false;
  if (!(await unlockVault(oldPw, id))) return false;
  const salt = randomSalt();
  const kek = await deriveKEK(newPw, salt);
  const wrappedPrivate = await aesEncrypt(kek, te.encode(JSON.stringify(_privateJwk)));
  saveIdentity({ ...id, wrappedPrivate, salt: b64(salt) });
  return true;
}

// ---- ENCRYPT A FILE for a set of recipients (memberId -> publicJwk) ----
// Returns everything the Doc record needs to store.
export interface DocCrypto { iv: string; wrappedKeys: Record<string, WrappedKey>; }
export async function encryptFile(
  file: Uint8Array,
  recipients: Record<string, JsonWebKey>,
): Promise<{ ciphertext: Uint8Array; crypto: DocCrypto }> {
  const dek = randomDEK();
  const { iv, ct } = await aesEncryptRaw(dek, file);
  const wrappedKeys: Record<string, WrappedKey> = {};
  for (const [memberId, pub] of Object.entries(recipients)) {
    wrappedKeys[memberId] = await wrapKeyTo(pub, dek);
  }
  return { ciphertext: unb64(ct), crypto: { iv, wrappedKeys } };
}

// ---- DECRYPT A FILE as a given member ----
export async function decryptFile(
  ciphertext: Uint8Array, iv: string, wrappedKeys: Record<string, WrappedKey>, myMemberId: string,
): Promise<Uint8Array> {
  if (!_privateJwk) throw new Error("Vault is locked");
  const box = wrappedKeys[myMemberId];
  if (!box) throw new Error("No access to this document");
  const dek = await unwrapKeyWith(_privateJwk, box);
  return aesDecryptRaw(dek, iv, b64(ciphertext));
}

// ---- SHARE: add a recipient to an existing doc (re-wrap, no re-encrypt) ----
export async function addRecipient(
  wrappedKeys: Record<string, WrappedKey>, myMemberId: string, toMemberId: string, toPublicJwk: JsonWebKey,
): Promise<Record<string, WrappedKey>> {
  if (!_privateJwk) throw new Error("Vault is locked");
  const dek = await unwrapKeyWith(_privateJwk, wrappedKeys[myMemberId]);
  const box = await wrapKeyTo(toPublicJwk, dek);
  return { ...wrappedKeys, [toMemberId]: box };
}
