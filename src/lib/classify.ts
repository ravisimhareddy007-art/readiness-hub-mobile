import type { Category, MedType } from "./types";
// Deterministic, rule-based classification from filename. International doc types.
const RULES: { kw: string[]; category: Category; docType: string; medType?: MedType }[] = [
  { kw: ["passport"], category: "Identity", docType: "Passport" },
  { kw: ["aadhaar", "aadhar", "uidai", "national id", "identity card"], category: "Identity", docType: "Aadhaar Card" },
  { kw: ["pan", "tax id", "taxid", "tin"], category: "Identity", docType: "PAN Card" },
  { kw: ["licence", "license", "driving", "driver"], category: "Identity", docType: "Driver's License" },
  { kw: ["offer"], category: "Employment", docType: "Employment Offer" },
  { kw: ["relieving", "relieve"], category: "Employment", docType: "Relieving Letter" },
  { kw: ["experience", "exp letter"], category: "Employment", docType: "Experience Letter" },
  { kw: ["payslip", "salary", "pay stub", "paystub"], category: "Employment", docType: "Payslip" },
  { kw: ["itr", "tax return", "acknowledgement", "form 16"], category: "Finance", docType: "ITR Acknowledgement" },
  { kw: ["bank", "statement", "account"], category: "Finance", docType: "Bank Statement" },
  { kw: ["invest", "mutual", "brokerage", "portfolio", "demat"], category: "Finance", docType: "Investment Statement" },
  { kw: ["retirement", "401k", "pension"], category: "Finance", docType: "Retirement Account" },
  { kw: ["health insurance", "mediclaim"], category: "Insurance", docType: "Health Insurance" },
  { kw: ["auto insurance", "car insurance", "motor"], category: "Insurance", docType: "Auto Insurance" },
  { kw: ["life insurance", "term plan"], category: "Insurance", docType: "Life Insurance" },
  { kw: ["insurance", "policy"], category: "Insurance", docType: "Insurance Policy" },
  { kw: ["deed", "title"], category: "Property", docType: "Property Deed" },
  { kw: ["property tax"], category: "Property", docType: "Property Tax" },
  { kw: ["lease", "rent", "rental"], category: "Property", docType: "Lease Agreement" },
  { kw: ["prescription", "rx"], category: "Medical", docType: "Prescription", medType: "prescription" },
  {
    kw: ["lab", "report", "blood", "hba1c", "lipid", "cbc", "test"],
    category: "Medical",
    docType: "Lab Report",
    medType: "lab_report",
  },
  { kw: ["discharge", "summary"], category: "Medical", docType: "Discharge Summary", medType: "discharge" },
  {
    kw: ["scan", "xray", "x-ray", "mri", "ct ", "ultrasound"],
    category: "Medical",
    docType: "Scan / Imaging",
    medType: "scan",
  },
];
export function classify(filename: string): {
  category: Category;
  docType: string;
  medType?: MedType;
  confident: boolean;
} {
  const f = filename.toLowerCase();
  for (const r of RULES)
    if (r.kw.some((k) => f.includes(k)))
      return { category: r.category, docType: r.docType, medType: r.medType, confident: true };
  return { category: "Identity", docType: "Unsorted", confident: false };
}
export const CATEGORIES: Category[] = ["Identity", "Employment", "Finance", "Insurance", "Property", "Medical"];
