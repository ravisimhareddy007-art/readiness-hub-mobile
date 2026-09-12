// src/lib/requirements/sources.ts
// Classify a source URL into an authority tier so the UI can show users WHERE a
// requirement came from and prioritise official/embassy sources. Heuristic but production-reasonable.

import type { SourceTier } from "./schema";

// Government / official issuing-authority TLDs and patterns, across jurisdictions.
const OFFICIAL_TLD = [
  ".gov", ".gov.in", ".nic.in", ".gov.uk", ".gouv.fr", ".gc.ca", ".gov.au",
  ".gov.sg", ".govt.nz", ".go.ug", ".go.ke", ".gov.za", ".gob.mx", ".gov.br",
  ".europa.eu", ".admin.ch", ".bund.de", ".gov.ae",
];
const OFFICIAL_HINTS = [
  "uidai", "incometax", "passportindia", "parivahan", "eci.gov", "epfindia",
  "irdai", "rbi.org.in", "mea.gov", "uscis.gov", "state.gov", "uscis",
  "ind.nl", "schengenvisainfo.gov", "immigration",
];
const EMBASSY_HINTS = ["embassy", "consulate", "mofa", "-emb", "mission", "highcommission"];
// Well-known semi-official processing partners & authoritative travel-doc sources.
const SEMIOFFICIAL_HINTS = ["vfsglobal", "blsinternational", "iata", "timatic", "who.int"];

function host(url: string): string {
  try { return new URL(url).hostname.toLowerCase(); } catch { return url.toLowerCase(); }
}

export function classifySource(url: string): SourceTier {
  const h = host(url);
  if (OFFICIAL_TLD.some((t) => h.endsWith(t)) || OFFICIAL_HINTS.some((k) => h.includes(k))) return "official";
  if (EMBASSY_HINTS.some((k) => h.includes(k))) return "embassy";
  if (SEMIOFFICIAL_HINTS.some((k) => h.includes(k))) return "semiofficial";
  return "general";
}

// Re-tier a list of sources and sort official/embassy first.
const RANK: Record<SourceTier, number> = { official: 0, embassy: 1, semiofficial: 2, general: 3 };
export function rankSources<T extends { url: string; tier?: SourceTier }>(sources: T[]): (T & { tier: SourceTier })[] {
  return sources
    .map((s) => ({ ...s, tier: classifySource(s.url) }))
    .sort((a, b) => RANK[a.tier] - RANK[b.tier]);
}

// Domains to bias Claude's web search toward (passed as allowed_domains is too strict across
// jurisdictions; instead we prompt for official sources and tier afterwards). Exposed for callers
// that DO want to hard-restrict to official gov domains for a specific high-stakes pack.
export const OFFICIAL_DOMAIN_HINTS = OFFICIAL_TLD;
