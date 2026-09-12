// src/lib/requirements/index.ts — client-facing entry.
// cache → server AI (Claude + web search) → rule-based fallback. Always returns something.
import { getCached, setCached } from "./cache";
import { rankSources } from "./sources";
import { draftFallback } from "./fallback";
import { getRequirementsFn } from "./server";
import type { PackRequirements } from "./schema";

export type { PackRequirements, Requirement, Source } from "./schema";

export async function getPackRequirements(query: string, jurisdiction?: string): Promise<{
  data: PackRequirements; source: "cache" | "ai" | "fallback"; error?: string;
}> {
  const cached = getCached(query);
  if (cached) return { data: cached, source: "cache" };

  try {
    const res = await getRequirementsFn({ data: { query, jurisdiction } });
    if (res.ok && res.data) {
      res.data.sources = rankSources(res.data.sources ?? []);
      setCached(query, res.data);
      return { data: res.data, source: "ai" };
    }
    return { data: draftFallback(query), source: "fallback", error: res.error };
  } catch (e: any) {
    return { data: draftFallback(query), source: "fallback", error: e?.message };
  }
}
