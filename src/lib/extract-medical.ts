// On-device extraction for health records. Runs in the same pre-encryption window as
// classify-content.ts, on OCR text only. Values and ranges, never narrative: no diagnosis,
// no clinical impression, no doctor's notes. Anything not printed is left out, never guessed.

import type { MedType } from "./types";

export interface ExtractedReading {
  metric: string; // the test name as printed
  key: string; // normalised name + unit: the series this reading belongs to
  value: number;
  value2?: number; // diastolic, for blood pressure
  unit: string;
  qualifier?: string; // "<" or ">" for a sub- or above-threshold result, e.g. PSA <0.01
  refLow?: number; // reference range printed on this report
  refHigh?: number;
  refText?: string; // the range exactly as printed
}

export interface ExtractedMedicine {
  name: string;
  dose?: string;
  freq?: string;
  days?: number;
}

export interface MedicalIndex {
  doctor?: string;
  hospital?: string;
  specialisation?: string;
  lab?: string;
  docDate?: string;
  reviewOn?: string;
}

export interface MedicalExtraction extends MedicalIndex {
  readings: ExtractedReading[];
  medicines: ExtractedMedicine[];
}

/* ── shared date handling ── */
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DATE = "(\\d{1,2}[\\/\\-.]\\d{1,2}[\\/\\-.]\\d{2,4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\s+[A-Za-z]{3,9},?\\s+\\d{4})";

export function toISO(raw: string): string | undefined {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  let m = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? (Number(m[3]) > 50 ? "19" : "20") + m[3] : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = raw.match(/^(\d{1,2})\s+([A-Za-z]{3,9}),?\s+(\d{4})$/);
  if (m) {
    const mi = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    if (mi >= 0) return `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return undefined;
}

function dateNear(text: string, labels: string[]): string | undefined {
  const m = text.match(new RegExp(`(?:${labels.join("|")})[^0-9]{0,24}${DATE}`, "i"));
  return m ? toISO(m[1]) : undefined;
}

/* ── lab readings ──
   Any test the report prints, not a fixed list. A row is recognised as a result only when a
   recognised clinical unit follows the number, because test names are unbounded while units are
   a small, stable vocabulary. Nothing is inferred: no test is looked up, no range is supplied. */

/* Closed unit vocabulary. Anchors what counts as a result and keeps demographics, billing lines,
   and sample identifiers out of the data. */
const UNITS = [
  "%", "mg/dL", "mg/dl", "g/dL", "g/dl", "mg/L", "g/L", "ng/mL", "ng/dL", "pg/mL", "ug/L", "ug/dL",
  "mcg/L", "mcg/dL", "IU/L", "U/L", "mIU/L", "uIU/mL", "mIU/mL", "IU/mL", "mmol/L", "umol/L", "nmol/L",
  "pmol/L", "mEq/L", "mm/hr", "mmHg", "fL", "pg", "kg", "cm", "million/uL", "thousand/uL", "cells/uL",
  "/uL", "/cumm", "cells/cumm", "x10^3/uL", "x10^6/uL", "sec", "seconds", "ratio", "INR", "mL/min",
  "mL/min/1.73m2", "U/mL", "kU/L", "ug/mL", "ng/L",
];
/* Micro sign, Greek mu and "mcg" all mean the same thing; case varies by lab. */
const normUnit = (u: string) =>
  u.replace(/[\u00B5\u03BC]/g, "u").replace(/mcg/gi, "ug").replace(/\s+/g, "").toLowerCase();
const UNIT_SET = new Set(UNITS.map(normUnit));
const UNIT_RE = "([%/a-zA-Z\\u00B5\\u03BC][a-zA-Z\\u00B5\\u03BC0-9/^.]{0,14})";

/* Qualifiers that change what a test measures. Two results may only share a series if these match,
   so Free PSA never joins Total PSA and calculated LDL never joins direct LDL. */
const QUALIFIERS = ["free", "total", "direct", "indirect", "calculated", "estimated", "ratio", "fasting",
  "post prandial", "postprandial", "random", "corrected", "unbound", "bound"];

/* Analytical methods printed in brackets. These are not another name for the test. */
const METHODS = /^(hplc|clia|elisa|eclia|cmia|jaffe|enzymatic|colorimetric|photometr\w*|turbidimetr\w*|immunoturbidimetr\w*|nephelometr\w*|spectrophotometr\w*|calculated|direct|serum|plasma|flow cytometry|microscopy|automated|manual)$/i;

/** Conservative name normalisation: tidy formatting, never merge different measurements.
    Labs print "Full Name (ABBREV)"; the abbreviation is the stabler key, so it wins when present
    and is not a method note. Two labs that print only different forms stay separate, by design:
    guessing they are the same test would need a synonym table, which is clinical knowledge. */
export function normaliseTestName(raw: string): string {
  const paren = [...raw.matchAll(/\(([^)]{1,14})\)/g)]
    .map((x) => x[1].trim())
    .find((x) => /^[A-Za-z0-9][A-Za-z0-9 .\-]*$/.test(x) && !METHODS.test(x) && x.length <= 10);

  let n = (paren || raw)
    .replace(/\([^)]*\)/g, " ")
    .replace(/^\s*[spb]\.\s*/i, " ")                                   // "S." / "P." specimen prefix
    .replace(/\b(serum|plasma|blood|urine)\b/gi, " ")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const low = n.toLowerCase();
  const quals = QUALIFIERS.filter((q) => low.includes(q));
  const base = quals.reduce((acc, q) => acc.replace(new RegExp(q, "gi"), " "), n).replace(/\s+/g, " ").trim();
  return [...quals.map((q) => q.replace(/\s+/g, "-")), base].filter(Boolean).join(" ").toLowerCase();
}

const NUM = "([0-9]+(?:\\.[0-9]+)?)";

/** "4.0 - 5.6" / "4.0 to 5.6" / "< 100" / "up to 5.6", as printed beside a result. */
function rangeAfter(segment: string): { low?: number; high?: number; text?: string } {
  let m = segment.match(new RegExp(`${NUM}\\s*(?:-|\\u2013|to)\\s*${NUM}`, "i"));
  if (m) return { low: Number(m[1]), high: Number(m[2]), text: `${m[1]} to ${m[2]}` };
  m = segment.match(new RegExp(`(?:<|less than|up ?to|upto)\\s*${NUM}`, "i"));
  if (m) return { high: Number(m[1]), text: `under ${m[1]}` };
  m = segment.match(new RegExp(`(?:>|greater than|above)\\s*${NUM}`, "i"));
  if (m) return { low: Number(m[1]), text: `over ${m[1]}` };
  return {};
}

/* Lines that carry a number and a unit but are not results. */
const NOT_A_RESULT = /\b(age|years?|months?|amount|invoice|bill|receipt|gst|page|sample|barcode|uhid|mrn|reg(istration)?|phone|mobile|pin|room|bed|ref(erence)? no|panel|method|printed|collected|reported|received)\b/i;

export function extractReadings(text: string): ExtractedReading[] {
  const lines = text.split(/[\r\n]+/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const out: ExtractedReading[] = [];
  const seen = new Set<string>();

  const BP_LINE = new RegExp(`(?:blood pressure|\\bbp\\b)[^0-9]{0,16}${NUM}\\s*\\/\\s*${NUM}`, "i");
  /* Scan every number-and-unit pair on the line, not just the first: a test name can itself
     contain a digit (HbA1c, Vitamin B12, x10^3), and stopping at the first candidate loses the row. */
  const CANDIDATE = new RegExp(`([<>]?)\\s*${NUM}\\s*${UNIT_RE}`, "g");

  for (const line of lines) {
    if (NOT_A_RESULT.test(line) || BP_LINE.test(line)) continue;

    for (const c of line.matchAll(CANDIDATE)) {
      const [whole, qualifier, rawValue, rawUnit] = c;
      if (!UNIT_SET.has(normUnit(rawUnit))) continue;

      const rawName = line.slice(0, c.index).replace(/[\s:.]+$/, "");
      if (rawName.trim().length < 2) continue;
      const name = normaliseTestName(rawName);
      if (!name || /^[0-9 ]+$/.test(name)) continue;
      const value = Number(rawValue);
      if (!Number.isFinite(value)) continue;

      const key = name + "|" + normUnit(rawUnit);
      if (seen.has(key)) break;
      seen.add(key);

      const r = rangeAfter(line.slice((c.index || 0) + whole.length));
      out.push({
        metric: rawName.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim(),
        key,
        value,
        unit: rawUnit.trim(),
        qualifier: qualifier === "<" || qualifier === ">" ? qualifier : undefined,
        refLow: r.low,
        refHigh: r.high,
        refText: r.text,
      });
      break; // one result per printed row
    }
  }

  /* Blood pressure is the one paired value, printed as a fraction rather than a table row. */
  const t = text.replace(/\s+/g, " ");
  const bp = t.match(new RegExp(`(?:blood pressure|\\bbp\\b)[^0-9]{0,16}${NUM}\\s*\\/\\s*${NUM}`, "i"));
  if (bp) {
    const sys = Number(bp[1]);
    const dia = Number(bp[2]);
    if (sys >= 60 && sys <= 260 && dia >= 30 && dia <= 180)
      out.push({ metric: "Blood Pressure", key: "blood pressure|mmhg", value: sys, value2: dia, unit: "mmHg" });
  }
  return out;
}

/* ── prescriptions ── */
const FORMS = "(?:tab|tablet|cap|capsule|syp|syrup|inj|injection|drops?|oint|cream)";

export function extractMedicines(text: string): ExtractedMedicine[] {
  const t = text.replace(/\s+/g, " ");
  const out: ExtractedMedicine[] = [];
  const seen = new Set<string>();
  const re = new RegExp(`${FORMS}\\.?\\s+([A-Z][A-Za-z0-9\\-]{2,})(?:\\s+([0-9]+(?:\\.[0-9]+)?\\s*(?:mg|mcg|ml|g|iu)))?`, "gi");
  for (const m of t.matchAll(re)) {
    const name = m[1];
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const tail = t.slice((m.index || 0) + m[0].length, (m.index || 0) + m[0].length + 60);
    const freq = tail.match(/([01]\s*-\s*[01]\s*-\s*[01]|once daily|twice daily|thrice daily|\bOD\b|\bBD\b|\bTDS\b|\bHS\b)/i);
    const days = tail.match(/(?:for|x)\s*([0-9]{1,3})\s*(?:days?|d\b)/i);
    out.push({
      name,
      dose: m[2] ? m[2].replace(/\s+/g, "") : undefined,
      freq: freq ? freq[1] : undefined,
      days: days ? Number(days[1]) : undefined,
    });
  }
  return out;
}

/* ── the index Prepare my kit filters on ──
   Printed facts only. A specialisation is taken from a department line or a qualification
   printed on the letterhead; it is never inferred from a doctor's name. */
const SPECIALITIES = [
  "Cardiology", "Endocrinology", "Diabetology", "Nephrology", "Neurology", "Oncology", "Orthopaedics",
  "Orthopedics", "Paediatrics", "Pediatrics", "Dermatology", "Gastroenterology", "Pulmonology",
  "Psychiatry", "Ophthalmology", "ENT", "Gynaecology", "Gynecology", "Obstetrics", "Urology",
  "Rheumatology", "General Medicine", "Dentistry",
];

const NAME_STOP = /^(?:MBBS|MD|DM|MS|MCh|DNB|BDS|Sample|Collected|Reported|Date|Patient|Department|Dept|Consultant|Registration|Reg)$/i;

export function extractIndex(text: string, medType?: MedType): MedicalIndex {
  const t = text.replace(/\s+/g, " ");
  const out: MedicalIndex = {};

  // Take the name from its own printed line, then stop at a comma, a qualification, or a label.
  const line = text.split(/[\r\n]+/).find((l) => /\b(?:Dr\.?|Doctor)\s+[A-Z]/.test(l)) || t;
  const dr = line.match(/\b(?:Dr\.?|Doctor)\s+([A-Z][A-Za-z.]+(?:\s+[A-Z][A-Za-z.]+){0,3})/);
  if (dr) {
    const parts: string[] = [];
    for (const w of dr[1].split(/\s+/)) {
      if (NAME_STOP.test(w.replace(/\.$/, ""))) break;
      parts.push(w.replace(/\.$/, ""));
    }
    if (parts.length) out.doctor = "Dr " + parts.join(" ");
  }

  const hosp = t.match(/\b([A-Z][A-Za-z&.'-]+(?:\s+[A-Z][A-Za-z&.'-]+){0,4}\s+(?:Hospital|Hospitals|Clinic|Nursing Home|Medical Centre|Medical Center|Healthcare|Diagnostics|Laboratory|Labs?))\b/);
  if (hosp) {
    const name = hosp[1].trim();
    if (/Laborator|Diagnostic|Labs?$/i.test(name)) out.lab = name;
    else out.hospital = name;
  }

  const spec = SPECIALITIES.find((sp) =>
    new RegExp(`(?:dept\\.?|department) of ${sp}|\\b(?:MD|DM|MS|MCh|DNB|BDS)[^.]{0,20}${sp}|\\b${sp}\\b`, "i").test(t),
  );
  if (spec) out.specialisation = spec;

  out.docDate =
    dateNear(t, ["collected on", "collection date", "sample collected", "reported on", "report date", "date of visit", "visit date", "date"]) || undefined;

  if (medType === "prescription") {
    const review = dateNear(t, ["review on", "review after", "follow ?up on", "next visit", "revisit on"]);
    if (review) out.reviewOn = review;
  }
  return out;
}

/** One pass over a medical record: index plus whatever its type carries. */
export function extractMedical(text: string, medType?: MedType): MedicalExtraction {
  return {
    ...extractIndex(text, medType),
    readings: medType === "lab_report" || medType === "discharge" ? extractReadings(text) : [],
    medicines: medType === "prescription" || medType === "discharge" ? extractMedicines(text) : [],
  };
}

/* ── Preparing for a visit ──
   Which records travel, and what a visit can be prepared for. Pure functions over documents:
   no React, no storage, no side effects, so the rules stay testable. */

import type { Doc } from "./types";

const MED_PRIORITY: Record<string, number> = { prescription: 0, lab_report: 1, discharge: 2, scan: 3, other: 4 };

export interface VisitTarget {
  kind: "doctor" | "hospital" | "specialisation" | "general";
  value?: string;
}

/** Doctors, hospitals and specialisations this member's records actually name, most recent first. */
export function visitTargets(docs: Doc[], memberId: string): VisitTarget[] {
  const when = (d: Doc) => +new Date(d.docDate || d.addedAt);
  const mine = docs
    .filter((d) => d.category === "Medical" && d.memberId === memberId)
    .sort((a, b) => when(b) - when(a));
  const out: VisitTarget[] = [];
  const seen = new Set<string>();
  const add = (kind: VisitTarget["kind"], value?: string) => {
    if (!value) return;
    const k = kind + ":" + value.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ kind, value });
  };
  mine.forEach((d) => add("doctor", d.doctor));
  mine.forEach((d) => add("specialisation", d.specialisation));
  mine.forEach((d) => add("hospital", d.hospital));
  out.push({ kind: "general" });
  return out;
}

export function targetLabel(t: VisitTarget): string {
  if (t.kind === "general") return "General checkup";
  if (t.kind === "specialisation") return t.value + " visit";
  return t.value || "";
}

/* Matching is on what each record names: the doctor who wrote it, the hospital it came from,
   the specialisation printed on it. Recent prescriptions, lab reports and the health insurance
   policy always travel, because a consultation stalls without them. */
export function selectVisitDocs(docs: Doc[], memberId: string, target?: VisitTarget): Doc[] {
  const when = (d: Doc) => +new Date(d.docDate || d.addedAt);
  const monthsAgo = (n: number) => Date.now() - n * 30 * 86400000;
  const mine = docs.filter((d) => d.category === "Medical" && d.memberId === memberId);
  const insurance = docs.find(
    (d) => d.docType === "Health Insurance" && (d.memberId === memberId || d.memberId === "you"),
  );
  const eq = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

  let picked: Doc[];
  if (!target || target.kind === "general") {
    picked = mine.filter((d) => when(d) >= monthsAgo(12));
    const latestRx = mine.filter((d) => d.medType === "prescription").sort((a, b) => when(b) - when(a))[0];
    if (latestRx && !picked.includes(latestRx)) picked.push(latestRx);
  } else {
    const hit = (d: Doc) =>
      target.kind === "doctor"
        ? eq(d.doctor, target.value)
        : target.kind === "hospital"
          ? eq(d.hospital, target.value) || eq(d.lab, target.value)
          : eq(d.specialisation, target.value);
    picked = mine.filter(
      (d) => hit(d) || ((d.medType === "prescription" || d.medType === "lab_report") && when(d) >= monthsAgo(6)),
    );
  }
  if (insurance && !picked.includes(insurance)) picked.push(insurance);
  return [...new Set(picked)].sort((a, b) => {
    const pa = MED_PRIORITY[a.medType || "other"] ?? 4;
    const pb = MED_PRIORITY[b.medType || "other"] ?? 4;
    return pa !== pb ? pa - pb : when(b) - when(a);
  });
}
