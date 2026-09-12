// src/lib/requirements/schema.ts
// Strict schema + validation for AI-fetched pack requirements. NEVER trust raw LLM JSON —
// everything is validated with zod before it touches the app.
import { z } from "zod";

// The standard requirement categories = the app's SATISFIES ontology keys.
// Mapping AI output to these makes readiness work against the user's on-device docs immediately.
export const ONTOLOGY_KEYS = [
  "Identity Proof", "Address Proof", "Date of Birth Proof", "Photo ID",
  "Income Proof", "Employment Proof", "Proof of Funds", "Accommodation Proof",
  "Travel Itinerary", "Property Ownership Proof", "Other",
] as const;

export const SourceTier = z.enum(["official", "embassy", "semiofficial", "general"]);
export type SourceTier = z.infer<typeof SourceTier>;

// Cap long free-text fields by truncating instead of rejecting the whole response —
// a slightly verbose jurisdiction or disclaimer is not a reason to fall back to offline data.
const capped = (max: number) => z.string().transform((s) => s.slice(0, max));

export const Source = z.object({
  url: z.string().url(),
  title: capped(200),
  tier: SourceTier.default("general"),
});
export type Source = z.infer<typeof Source>;

export const Requirement = z.object({
  item: capped(160),                                // concrete document, e.g. "Yellow Fever Vaccination Certificate"
  ontology: z.enum(ONTOLOGY_KEYS).default("Other"), // maps to a SATISFIES key when possible
  mandatory: z.boolean().default(true),
  condition: capped(240).optional(),                // when a conditional item applies
  note: capped(300).optional(),
});
export type Requirement = z.infer<typeof Requirement>;

export const PackRequirements = z.object({
  pack: capped(120),
  jurisdiction: capped(200).optional(),             // country/state the answer applies to
  requirements: z.array(Requirement).min(1).max(40),
  sources: z.array(Source).max(20).default([]),
  lastChecked: z.string(),                          // ISO date
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  disclaimer: capped(600).optional(),
});
export type PackRequirements = z.infer<typeof PackRequirements>;

// Parse + validate raw model text. The model may emit interstitial commentary around the
// JSON (especially with web search), so pull out the last balanced JSON object.
export function parseRequirements(raw: string): PackRequirements {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("Model returned no JSON object (response was cut off or contained only prose)");
  }
  const json = JSON.parse(cleaned.slice(start, end + 1));
  return PackRequirements.parse(json);
}
