// src/lib/classify-content.ts
// On-device content classification: runs OCR text through the SAME rules as classify.ts,
// then extracts structured fields (expiry, issuer). Runs in the pre-encryption window at upload.
// No network. The extracted metadata is what gets encrypted + stored on the Doc.

import { classify } from "./classify";
import type { Category, MedType } from "./types";

export interface ClassifyResult {
  category: Category;
  docType: string;
  medType?: MedType;
  confident: boolean;
  expiry?: string;   // ISO date, if found in the text
  issuer?: string;   // e.g. "UIDAI", "Income Tax Department"
  source: "filename" | "content";
}

// Same keyword table shape as classify.ts, but matched against OCR text (much richer than a filename).
const CONTENT_RULES: { kw: string[]; category: Category; docType: string; medType?: MedType }[] = [
  { kw: ["unique identification", "uidai", "aadhaar", "आधार"], category: "Identity", docType: "Aadhaar Card" },
  { kw: ["permanent account number", "income tax department"], category: "Identity", docType: "PAN Card" },
  { kw: ["republic of india", "passport"], category: "Identity", docType: "Passport" },
  { kw: ["driving licence", "driving license", "transport department"], category: "Identity", docType: "Driver's License" },
  { kw: ["acknowledgement", "itr-v", "assessment year"], category: "Finance", docType: "ITR Acknowledgement" },
  { kw: ["statement of account", "closing balance", "ifsc"], category: "Finance", docType: "Bank Statement" },
  { kw: ["sum assured", "policy holder", "nominee"], category: "Insurance", docType: "Insurance Policy" },
  { kw: ["sale deed", "sub-registrar", "khata"], category: "Property", docType: "Property Deed" },
  { kw: ["rx", "prescription", "dosage", "mg "], category: "Medical", docType: "Prescription", medType: "prescription" },
  { kw: ["reference range", "hba1c", "lipid profile", "haemoglobin"], category: "Medical", docType: "Lab Report", medType: "lab_report" },
];

const ISSUERS: { kw: string; issuer: string }[] = [
  { kw: "uidai", issuer: "UIDAI" },
  { kw: "income tax department", issuer: "Income Tax Department" },
  { kw: "passport", issuer: "Passport Seva" },
];

// Find an expiry/validity date in OCR text. Handles common Indian + ISO formats.
function extractExpiry(text: string): string | undefined {
  const t = text.toLowerCase();
  // look near words that signal an end date
  const near = /(valid\s*(?:up\s*to|till|until)|expiry|expires|date of expiry)\D{0,20}(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2})/i.exec(t);
  const raw = near?.[2];
  if (!raw) return undefined;
  const iso = toISO(raw);
  return iso;
}
function toISO(raw: string): string | undefined {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(raw);
  if (!m) return undefined;
  let [_, d, mo, y] = m;
  if (y.length === 2) y = (Number(y) > 50 ? "19" : "20") + y;
  const dd = d.padStart(2, "0"), mm = mo.padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

// Main entry: given the filename AND on-device OCR text, produce the best classification.
// Content wins when confident; otherwise fall back to the existing filename classifier.
export function classifyContent(filename: string, ocrText: string): ClassifyResult {
  const text = ocrText.toLowerCase();
  for (const r of CONTENT_RULES) {
    if (r.kw.some((k) => text.includes(k))) {
      return {
        category: r.category, docType: r.docType, medType: r.medType, confident: true,
        expiry: extractExpiry(ocrText),
        issuer: ISSUERS.find((i) => text.includes(i.kw))?.issuer,
        source: "content",
      };
    }
  }
  // no content match → reuse the filename classifier verbatim
  const f = classify(filename);
  return { ...f, expiry: extractExpiry(ocrText), source: "filename" };
}
