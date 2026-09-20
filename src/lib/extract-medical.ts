// On-device extraction for health records. Runs in the same pre-encryption window as
// classify-content.ts, on OCR text only. Values and ranges, never narrative: no diagnosis,
// no clinical impression, no doctor's notes. Anything not printed is left out, never guessed.

import type { MedType } from "./types";

export interface ExtractedReading {
  metric: string;
  value: number;
  value2?: number; // diastolic, for blood pressure
  unit: string;
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
   Each test carries the aliases printed on Indian lab reports and the metric key the
   trends already use, so an extracted value lands on the same chart as a typed one. */
const TESTS: { metric: string; unit: string; aliases: string[]; min: number; max: number }[] = [
  { metric: "HbA1c", unit: "%", aliases: ["hba1c", "glycated haemoglobin", "glycosylated hemoglobin", "glycated hemoglobin"], min: 3, max: 20 },
  { metric: "LDL", unit: "mg/dL", aliases: ["ldl cholesterol", "ldl-c", "ldl"], min: 10, max: 400 },
  { metric: "Fasting Glucose", unit: "mg/dL", aliases: ["fasting blood sugar", "fasting glucose", "glucose fasting", "fbs"], min: 30, max: 600 },
  { metric: "TSH", unit: "mIU/L", aliases: ["tsh", "thyroid stimulating hormone"], min: 0.01, max: 100 },
  { metric: "Weight", unit: "kg", aliases: ["weight"], min: 1, max: 400 },
];

const NUM = "([0-9]+(?:\\.[0-9]+)?)";

/** "4.0 - 5.6" / "4.0 to 5.6" / "< 100" / "up to 5.6" as printed next to a result. */
function rangeAfter(segment: string): { low?: number; high?: number; text?: string } {
  let m = segment.match(new RegExp(`${NUM}\\s*(?:-|–|to)\\s*${NUM}`, "i"));
  if (m) return { low: Number(m[1]), high: Number(m[2]), text: `${m[1]} to ${m[2]}` };
  m = segment.match(new RegExp(`(?:<|less than|up ?to|upto)\\s*${NUM}`, "i"));
  if (m) return { high: Number(m[1]), text: `under ${m[1]}` };
  m = segment.match(new RegExp(`(?:>|greater than|above)\\s*${NUM}`, "i"));
  if (m) return { low: Number(m[1]), text: `over ${m[1]}` };
  return {};
}

export function extractReadings(text: string): ExtractedReading[] {
  // A lab report is a table: the result and its reference range share one printed line.
  // Work line by line so a row can never borrow the row below it.
  const lines = text.split(/[\r\n]+/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const out: ExtractedReading[] = [];
  const done = new Set<string>();

  for (const line of lines) {
    const low = line.toLowerCase();
    for (const test of TESTS) {
      if (done.has(test.metric)) continue;
      const alias = test.aliases.find((a) => low.includes(a));
      if (!alias) continue;
      const seg = line.slice(low.indexOf(alias) + alias.length);
      const v = seg.match(new RegExp(`^[^0-9]{0,24}${NUM}`));
      if (!v) continue;
      const value = Number(v[1]);
      if (!Number.isFinite(value) || value < test.min || value > test.max) continue;
      const r = rangeAfter(seg.slice(v[0].length));
      out.push({ metric: test.metric, value, unit: test.unit, refLow: r.low, refHigh: r.high, refText: r.text });
      done.add(test.metric);
      break;
    }
  }

  // blood pressure is printed as a pair
  const t = text.replace(/\s+/g, " ");
  const bp = t.match(new RegExp(`(?:blood pressure|\\bbp\\b)[^0-9]{0,16}${NUM}\\s*\\/\\s*${NUM}`, "i"));
  if (bp) {
    const sys = Number(bp[1]);
    const dia = Number(bp[2]);
    if (sys >= 60 && sys <= 260 && dia >= 30 && dia <= 180)
      out.push({ metric: "Blood Pressure", value: sys, value2: dia, unit: "mmHg" });
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
