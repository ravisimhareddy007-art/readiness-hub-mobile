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
