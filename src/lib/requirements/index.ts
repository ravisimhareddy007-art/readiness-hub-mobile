// src/lib/requirements/index.ts — client-facing entry.
// cache → server AI (Claude + web search) → rule-based fallback. Always returns something.
import { getCached, getCachedAny, isCached, setCached } from "./cache";
import { rankSources } from "./sources";
import { draftFallback } from "./fallback";
import { getRequirementsFn } from "./server";
import type { PackRequirements } from "./schema";

export type { PackRequirements, Requirement, Source } from "./schema";

/** The cache key for a pack in a country. Requirements differ by both. */
export const packKey = (query: string, jurisdiction?: string) => (jurisdiction ? `${query}::${jurisdiction}` : query);

/** What we already hold for a pack, without spending anything. */
export function cachedRequirements(query: string, jurisdiction?: string) {
  return getCachedAny(packKey(query, jurisdiction));
}
export function hasCheckedBefore(query: string, jurisdiction?: string) {
  return isCached(packKey(query, jurisdiction));
}

export async function getPackRequirements(
  query: string,
  jurisdiction?: string,
  force?: boolean,
): Promise<{ data: PackRequirements; source: "cache" | "ai" | "fallback"; error?: string }> {
  /* Requirements differ by country, so the cache is keyed by both: a Schengen visa asks different
     things of an Indian passport holder than of a British one. */
  const key = packKey(query, jurisdiction);
  const cached = force ? null : getCached(key);
  if (cached) return { data: cached, source: "cache" };

  try {
    const res = await getRequirementsFn({ data: { query, jurisdiction } });
    if (res.ok && res.data) {
      res.data.sources = rankSources(res.data.sources ?? []);
      setCached(key, res.data);
      return { data: res.data, source: "ai" };
    }
    return { data: draftFallback(query), source: "fallback", error: res.error };
  } catch (e: any) {
    return { data: draftFallback(query), source: "fallback", error: e?.message };
  }
}
