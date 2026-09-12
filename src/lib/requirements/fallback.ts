// src/lib/requirements/fallback.ts
// Instant, offline rule-based draft — used while the AI call runs, or if it fails.
// Mirrors the app's original PACK_TEMPLATES so there is always SOMETHING to show.
import type { PackRequirements } from "./schema";

const RULES: [RegExp, string[]][] = [
  [/school|admission|college|kindergarten/i, ["Birth Certificate", "Address Proof", "Identity Proof", "Passport Photos", "Immunization Record"]],
  [/job|employ|onboard|joining|offer/i, ["Identity Proof", "Degree Certificate", "Payslip", "Bank Statement", "Passport Photos"]],
  [/rent|lease|tenant/i, ["Identity Proof", "Income Proof", "Bank Statement", "Passport Photos"]],
  [/passport/i, ["Identity Proof", "Address Proof", "Date of Birth Proof", "Passport Photos"]],
  [/visa|travel|trip|abroad/i, ["Passport", "Proof of Funds", "Travel Itinerary", "Accommodation Proof", "Passport Photos"]],
  [/marriage|wedding/i, ["Birth Certificate", "Identity Proof", "Address Proof", "Passport Photos"]],
  [/driving|licen[cs]e|vehicle/i, ["Identity Proof", "Address Proof", "Passport Photos"]],
  [/loan|finance|credit/i, ["Identity Proof", "Income Proof", "Bank Statement", "Address Proof"]],
  [/death|heir|succession/i, ["Death Certificate", "Identity Proof", "Bank Statement"]],
  [/business|shop|startup|gst/i, ["Identity Proof", "Business Registration", "Bank Statement", "Address Proof"]],
];

export function draftFallback(query: string): PackRequirements {
  const hit = RULES.find(([re]) => re.test(query))?.[1] ?? ["Identity Proof", "Address Proof", "Proof of Funds"];
  return {
    pack: query.trim().slice(0, 120),
    requirements: hit.map((item) => ({ item, ontology: "Other" as const, mandatory: true })),
    sources: [],
    lastChecked: new Date().toISOString().slice(0, 10),
    confidence: "low",
    disclaimer: "Offline estimate. Connect to get the current official list.",
  };
}
