// src/lib/requirements/cache.ts
// Requirements change slowly, so cache by normalised query for 30 days to avoid repeat API cost.
// Prototype uses localStorage; swap the two get/set lines for a server KV/DB in production.
import type { PackRequirements } from "./schema";

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const PREFIX = "lifepack.req.v1:";

const norm = (q: string) => q.trim().toLowerCase().replace(/\s+/g, " ");

type Entry = { at: number; data: PackRequirements };

export function getCached(query: string): PackRequirements | null {
  try {
    const raw = localStorage.getItem(PREFIX + norm(query));
    if (!raw) return null;
    const e: Entry = JSON.parse(raw);
    if (Date.now() - e.at > TTL_MS) return null;
    return e.data;
  } catch { return null; }
}

export function setCached(query: string, data: PackRequirements): void {
  try { localStorage.setItem(PREFIX + norm(query), JSON.stringify({ at: Date.now(), data })); } catch {}
}

/** A cached answer regardless of age, so a stale list can still be shown while it is re-checked. */
export function getCachedAny(query: string): { data: PackRequirements; at: number; stale: boolean } | null {
  try {
    const raw = localStorage.getItem(PREFIX + norm(query));
    if (!raw) return null;
    const e: Entry = JSON.parse(raw);
    return { data: e.data, at: e.at, stale: Date.now() - e.at > TTL_MS };
  } catch { return null; }
}

/** Has this pack ever been checked here? Used to decide whether a lookup costs anything. */
export function isCached(query: string): boolean {
  return getCachedAny(query) !== null;
}
