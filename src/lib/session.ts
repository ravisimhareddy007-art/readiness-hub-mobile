// src/lib/session.ts
// Guarantees the vault is unlocked before any document is read or written.
// Call ensureVaultReady() on app boot and after signup/login.

import { hasVault, createVault, unlockVault, isUnlocked } from "./vault";

const DEVICE_KEY = "lifepack.deviceKey.v1";

// Anonymous/demo entry has no password. We bootstrap a device-local key so uploads
// still encrypt at rest. NOTE: this key lives on the device, so anon mode is
// encrypt-at-rest, not zero-knowledge. Real security requires signing up (a real password).
function deviceSecret(): string {
  let s = localStorage.getItem(DEVICE_KEY);
  if (!s) {
    const b = crypto.getRandomValues(new Uint8Array(32));
    s = btoa(String.fromCharCode(...b));
    localStorage.setItem(DEVICE_KEY, s);
  }
  return s;
}

// password present  -> real vault (signup creates, login unlocks)
// password absent    -> device-bootstrapped vault (demo/anon)
export async function ensureVaultReady(password?: string): Promise<boolean> {
  if (isUnlocked()) return true;
  const pw = password ?? deviceSecret();
  if (hasVault()) return unlockVault(pw);
  await createVault(pw);
  return true;
}
