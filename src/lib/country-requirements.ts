// Destination-pack checklists, written per country of residence.
//
// A visa pack's published checklist is the destination's, but some items are India-anchored:
// "ITR Acknowledgement" is what an Indian applicant proves income with. A resident of Dubai
// proves it with a salary certificate, a resident of Toronto with a notice of assessment.
// Without this, an expatriate opening a Schengen pack abroad was scored against Indian paperwork.
//
// Shown immediately so a pack opens with a real answer; superseded by the live lookup when it
// returns. India needs no seed — the built-in catalogue was written for it.

import { DESTINATION_PACKS } from "./pack-scope";

/** The published checklists, as written for the destination. Mirrors the catalogue's travel packs. */
const BASE: Record<string, { reqs: string[]; source: string }> = {
  schengen: {
    source: "EU Visa Code (Reg. 810/2009) via VFS consular checklists",
    reqs: [
      "Passport", "Visa Application Form", "Passport Photos", "Travel Insurance",
      "Flight Reservation", "Accommodation Proof", "Proof of Funds", "Employment Proof",
      "ITR Acknowledgement", "Payslip",
    ],
  },
  us: {
    source: "US Dept. of State visitor visa requirements",
    reqs: [
      "Passport", "DS-160 Confirmation", "Passport Photos", "Interview Appointment Letter",
      "Proof of Funds", "Employment Proof", "ITR Acknowledgement",
    ],
  },
  uk: {
    source: "UK Home Office standard visitor guidance",
    reqs: ["Passport", "Visa Application Form", "Bank Statement", "Employment Proof", "Payslip", "Accommodation Proof", "Travel Itinerary"],
  },
  canada: {
    source: "IRCC visitor visa document checklist",
    reqs: ["Passport", "Proof of Funds", "ITR Acknowledgement", "Employment Proof", "Invitation Letter", "Biometrics Confirmation"],
  },
  australia: {
    source: "Dept. of Home Affairs subclass 600 checklist",
    reqs: ["Passport", "Proof of Funds", "Payslip", "Employment Proof", "Travel Itinerary"],
  },
  japan: {
    source: "Embassy of Japan published checklist",
    reqs: ["Passport", "Visa Application Form", "Passport Photos", "Bank Statement", "Flight Reservation", "Travel Itinerary"],
  },
  singapore: {
    source: "ICA Singapore authorized-agent checklist",
    reqs: ["Passport", "Visa Application Form", "Passport Photos", "Proof of Funds"],
  },
  uae: {
    source: "UAE ICP / airline visa-desk checklists",
    reqs: ["Passport", "Passport Photos", "Flight Reservation", "Hotel Booking", "Bank Statement"],
  },
  "h1b-stamp": {
    source: "US Dept. of State petition-based visa checklist",
    reqs: [
      "Passport", "DS-160 Confirmation", "Approval Notice", "Employment Offer",
      "Payslip", "ITR Acknowledgement", "Degree Certificate",
    ],
  },
  "f1-visa": {
    source: "US Dept. of State student visa checklist",
    reqs: [
      "Passport", "DS-160 Confirmation", "I-20 Form", "Admission Letter",
      "Proof of Funds", "Language Test Scorecard", "Degree Certificate",
    ],
  },
};

/** When the seeds were last checked against the published sources (same curation pass as the
    home catalogue, which carries the same date). */
const CHECKED = "2026-07-25";

/** What replaces an India-anchored item, per country of residence. Drawn from the same
    country ontology the scoring uses, so a seed can always be satisfied by a held document. */
const SWAPS: Record<string, Record<string, string>> = {
  "ITR Acknowledgement": {
    AE: "Salary Certificate",
    SA: "Salary Certificate",
    QA: "Salary Certificate",
    KW: "Salary Certificate",
    OM: "Salary Certificate",
    BH: "Salary Certificate",
    US: "Tax Return",
    CA: "Notice of Assessment",
    GB: "P60",
    AU: "Payment Summary",
    SG: "IR8A",
    DE: "Steuerbescheid",
    NL: "Jaaropgaaf",
  },
};

/** Countries the catalogue is published for. Codes mirror the curated country list. */
const COVERED = new Set([
  "IN", "AE", "SA", "QA", "KW", "OM", "BH", "US", "CA", "GB", "IE", "AU", "NZ",
  "SG", "MY", "DE", "NL", "ZA", "MU", "NP", "LK",
]);

/**
 * The destination pack's checklist as written for a resident of `country`, or null when there
 * is no published variant. India returns null — its list is already in the catalogue.
 */
export function seededFor(packId: string, country?: string): { reqs: string[]; source: string; checked: string } | null {
  if (!country || country === "IN" || !COVERED.has(country)) return null;
  if (!DESTINATION_PACKS[packId]) return null;
  const base = BASE[packId];
  if (!base) return null;
  const swaps = SWAPS["ITR Acknowledgement"];
  const reqs = base.reqs.map((item) =>
    item === "ITR Acknowledgement" ? swaps?.[country] || "Income Proof" : item,
  );
  return { reqs, source: base.source, checked: CHECKED };
}
