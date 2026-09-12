// src/lib/secure-idb.ts
// Drop-in encryption wrapper around the existing idb.ts blob store.
// Existing call sites keep using putBlob/getBlob shapes; ciphertext is what actually lands in IndexedDB.

import { putBlob as rawPut, getBlob as rawGet, delBlob } from "./idb";
import { encryptFile, decryptFile, type DocCrypto } from "./vault";
import type { WrappedKey } from "./crypto";

// Copy into an ArrayBuffer-backed view so BlobPart typing is satisfied (strict + bundler).
function part(u: Uint8Array): Uint8Array<ArrayBuffer> {
  const ab = new ArrayBuffer(u.length);
  const out = new Uint8Array(ab);
  out.set(u);
  return out;
}

// Store an encrypted file. Returns the crypto metadata to attach to the Doc.
export async function putEncrypted(
  key: string,
  file: Blob,
  recipients: Record<string, JsonWebKey>,
): Promise<DocCrypto> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { ciphertext, crypto } = await encryptFile(bytes, recipients);
  await rawPut(key, new Blob([part(ciphertext)], { type: "application/octet-stream" }));
  return crypto;
}

// Read + decrypt. Returns a Blob (so URL.createObjectURL keeps working at call sites).
export async function getDecrypted(
  key: string,
  iv: string,
  wrappedKeys: Record<string, WrappedKey>,
  myMemberId: string,
  mime: string,
): Promise<Blob | null> {
  const enc = await rawGet(key);
  if (!enc) return null;
  const ct = new Uint8Array(await enc.arrayBuffer());
  const plain = await decryptFile(ct, iv, wrappedKeys, myMemberId);
  return new Blob([part(plain)], { type: mime || "application/octet-stream" });
}

export { delBlob };
