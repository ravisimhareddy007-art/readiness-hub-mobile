import { useEffect, useState, useCallback } from "react";
import type {
  Doc,
  Member,
  LabLog,
  Medication,
  Reminder,
  Category,
  Holding,
  Transaction,
  Handoff,
  HandoffReason,
  CustomPack,
} from "./types";
import { putBlob, delBlob } from "./idb";
import { classify } from "./classify";
import { safeOcr } from "./ocr";
import { classifyContent } from "./classify-content";
import { extractHoldingFields } from "./extract-holding";
import { extractMedical } from "./extract-medical";
import { defaultCurrency, rateBetween } from "./currency";
import { defaultCountry } from "./countries";
import { getDecrypted, putEncrypted } from "./secure-idb";
import { myPublicKey } from "./vault";
import { ensureVaultReady } from "./session";
import type { DocCrypto } from "./vault";

const LS = "lifepack.v7"; // bumped: Indian sample family (stored data from v3 is ignored)
const rel = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const iso = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
const id = () => Math.random().toString(36).slice(2, 9);

export interface CareProfile {
  conditions: string[];
  medications: string[];
  allergies: string;
  doctor?: string;
  hospital?: string;
  emergency?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  noConditions?: boolean;
  noKnownAllergies?: boolean;
}
interface State {
  onboarded: boolean;
  members: Member[];
  docs: Doc[];
  labs: LabLog[];
  care: Record<string, CareProfile>;
  meds: Medication[];
  reminders: Reminder[];
  holdings: Holding[];
  transactions: Transaction[];
  handoff: Handoff | null;
  customPacks: CustomPack[];
  theme: "dark" | "light";
  notifications: boolean;
  dataMode: "sample" | "empty"; // empty = 1Shelf-style day-0; sample = seeded family
  currency: string; // home currency for display and totals
  country: string; // where the user is preparing documents: scopes every pack and lookup
  nationality: string; // the passport held: for a visa, this decides the list, not where you live
  packSkips: Record<string, string[]>; // requirements the user marked as not applying to them
}

/* ── members (enterprise-neutral) ── */
const seedMembers: Member[] = [
  { id: "you", name: "Arjun Iyer", relation: "Self", color: "#5B8DEF", dob: "1985-06-14", bloodGroup: "O+", access: "Owner" },
  { id: "spouse", name: "Divya Iyer", relation: "Spouse", color: "#9B7BE8", dob: "1987-02-09", bloodGroup: "A+", access: "Full member" },
  { id: "father", name: "Ramesh Iyer", relation: "Father", color: "#2FB68A", dob: "1954-11-03", bloodGroup: "B+", access: "Emergency access" },
  { id: "mother", name: "Lakshmi Iyer", relation: "Mother", color: "#F472B6", dob: "1958-08-27", bloodGroup: "O-", access: "Emergency access" },
  { id: "son", name: "Aditya Iyer", relation: "Son", color: "#D9B86A", dob: "2016-04-12", bloodGroup: "O+", access: "View only" },
];


/* ── documents (single source for Documents, Packages, Wealth, Health records) ── */
const doc = (name: string, category: Category, docType: string, x: Partial<Doc> = {}): Doc => ({
  id: id(),
  name: name + ".pdf",
  category,
  docType,
  source: "Drive",
  mime: "application/pdf",
  sizeKB: 180,
  addedAt: iso(-30),
  fileKey: "seed",
  memberId: "you",
  ...x,
});
const seedDocs: Doc[] = [
  doc("Passport_Z4732911_ArjunIyer", "Identity", "Passport", { source: "DigiLocker", expiry: rel(264) }),
  doc("Aadhaar_XXXX-XXXX-4821_ArjunIyer", "Identity", "Aadhaar Card", { source: "DigiLocker" }),
  doc("PAN_AZKPM4821L_ArjunIyer", "Identity", "PAN Card", { source: "DigiLocker" }),
  doc("DrivingLicence_KA05-2019-0031847", "Identity", "Driving License", { source: "DigiLocker", expiry: rel(147) }),
  doc("OfferLetter_SeniorEngineer_Jan2024", "Employment", "Employment Offer", { source: "Email" }),
  doc("SalarySlip_Jun2026", "Employment", "Payslip", { source: "Email", docDate: iso(-20) }),
  doc("ITR-V_Acknowledgement_AY2025-26", "Finance", "ITR Acknowledgement", { source: "Drive" }),
  doc("HDFCBank_Statement_Jan-Jun2026", "Finance", "Bank Statement", { source: "Email", docDate: iso(-24) }),
  doc("HDFCSecurities_HoldingStatement_Jun2026", "Finance", "Investment Statement", {
    source: "Drive",
    value: 4200000,
    nominee: true,
  }),
  doc("StarHealth_FamilyFloater_Policy_88231", "Insurance", "Health Insurance", {
    source: "Email",
    expiry: rel(230),
    nominee: true,
  }),
  doc("LIC_TermPolicy_5567", "Insurance", "Life Insurance", { source: "Drive", value: 10000000, nominee: false }),
  doc("MotorPolicy_KA05MJ4412_2026", "Insurance", "Auto Insurance", { source: "Email", expiry: rel(40) }),
  doc("SaleDeed_Reg4417-2019_LakeviewApts", "Property", "Property Deed", {
    source: "Drive",
    value: 18500000,
    nominee: true,
  }),
  doc("PropertyTax_Receipt_FY2026-27", "Property", "Property Tax", { source: "Upload" }),
  doc("UPI_Screenshot_Rohan_5000", "Finance", "Transaction Evidence", { source: "Upload", docDate: iso(-4) }),
  /* Ramesh: three specialities, three hospitals, one lab. Enough for a visit picker to have
     real choices, and for a specialist visit to pull a different pack from a general checkup. */
  doc("Prescription_DrVenkateshPrasad_Endocrinology_Jun2026", "Medical", "Prescription", {
    source: "Upload", memberId: "father", medType: "prescription", docDate: iso(-8),
    doctor: "Dr Venkatesh Prasad", hospital: "Fortis Hospital", specialisation: "Endocrinology", readAt: iso(-8),
  }),
  doc("LabReport_HbA1c_LipidProfile_Jun2026", "Medical", "Lab Report", {
    source: "Upload", memberId: "father", medType: "lab_report", docDate: iso(-8),
    doctor: "Dr Venkatesh Prasad", lab: "Fortis Diagnostics", readAt: iso(-8),
  }),
  doc("LabReport_RenalPanel_Jun2026", "Medical", "Lab Report", {
    source: "Upload", memberId: "father", medType: "lab_report", docDate: iso(-8),
    doctor: "Dr Suresh Menon", lab: "Fortis Diagnostics", readAt: iso(-8),
  }),
  doc("Prescription_DrSureshMenon_Nephrology_May2026", "Medical", "Prescription", {
    source: "Upload", memberId: "father", medType: "prescription", docDate: iso(-42),
    doctor: "Dr Suresh Menon", hospital: "Manipal Hospital", specialisation: "Nephrology", readAt: iso(-42),
  }),
  doc("LabReport_PSA_Jun2026", "Medical", "Lab Report", {
    source: "Upload", memberId: "father", medType: "lab_report", docDate: iso(-8),
    doctor: "Dr Kiran Desai", lab: "Apollo Diagnostics", readAt: iso(-8),
  }),
  doc("DischargeSummary_Prostatectomy_Aug2025", "Medical", "Discharge Summary", {
    source: "Upload", memberId: "father", medType: "discharge", docDate: "2025-08-14",
    doctor: "Dr Kiran Desai", hospital: "HCG Cancer Centre", specialisation: "Oncology", readAt: "2025-08-14",
  }),
  doc("Prescription_DrKiranDesai_Oncology_Jun2026", "Medical", "Prescription", {
    source: "Upload", memberId: "father", medType: "prescription", docDate: iso(-8),
    doctor: "Dr Kiran Desai", hospital: "HCG Cancer Centre", specialisation: "Oncology", readAt: iso(-8),
  }),
  doc("Scan_CTAbdomen_Mar2026", "Medical", "Scan Report", {
    source: "Upload", memberId: "father", medType: "scan", docDate: "2026-03-12",
    doctor: "Dr Kiran Desai", hospital: "HCG Cancer Centre", specialisation: "Radiology", readAt: "2026-03-12",
  }),

  /* Arjun: an annual checkup, a physician he sees, a dermatology visit, and a dental record.
     Three specialities and two hospitals, so his own visit picker is not a single option. */
  doc("HealthCheck_Annual_May2026_ArjunIyer", "Medical", "Lab Report", {
    source: "Upload", memberId: "you", medType: "lab_report", docDate: "2026-05-02",
    doctor: "Dr Meera Krishnan", lab: "Manipal Diagnostics", readAt: "2026-05-02",
  }),
  doc("Prescription_DrMeeraKrishnan_May2026", "Medical", "Prescription", {
    source: "Upload", memberId: "you", medType: "prescription", docDate: "2026-05-02",
    doctor: "Dr Meera Krishnan", hospital: "Manipal Hospital", specialisation: "General Medicine", readAt: "2026-05-02",
  }),
  doc("LabReport_LipidProfile_Apr2025", "Medical", "Lab Report", {
    source: "Upload", memberId: "you", medType: "lab_report", docDate: "2025-04-28",
    doctor: "Dr Meera Krishnan", lab: "Manipal Diagnostics", readAt: "2025-04-28",
  }),
  doc("Prescription_DrNehaKulkarni_Dermatology_Jan2026", "Medical", "Prescription", {
    source: "Upload", memberId: "you", medType: "prescription", docDate: "2026-01-19",
    doctor: "Dr Neha Kulkarni", hospital: "Apollo Hospital", specialisation: "Dermatology", readAt: "2026-01-19",
  }),
  doc("Prescription_DrSanjayGupta_Dental_Nov2025", "Medical", "Prescription", {
    source: "Upload", memberId: "you", medType: "prescription", docDate: "2025-11-08",
    doctor: "Dr Sanjay Gupta", hospital: "Smile Dental Care", specialisation: "Dentistry", readAt: "2025-11-08",
  }),

  /* Lakshmi: two specialities. */
  doc("Prescription_DrAnitaShetty_Thyroid_May2026", "Medical", "Prescription", {
    source: "Upload", memberId: "mother", medType: "prescription", docDate: iso(-30),
    doctor: "Dr Anita Shetty", hospital: "Apollo Hospital", specialisation: "Endocrinology", readAt: iso(-30),
  }),
  doc("LabReport_ThyroidPanel_CBC_May2026", "Medical", "Lab Report", {
    source: "Upload", memberId: "mother", medType: "lab_report", docDate: iso(-30),
    doctor: "Dr Anita Shetty", lab: "Apollo Diagnostics", readAt: iso(-30),
  }),
  doc("Prescription_DrGeethaNair_Rheumatology_Feb2026", "Medical", "Prescription", {
    source: "Upload", memberId: "mother", medType: "prescription", docDate: "2026-02-20",
    doctor: "Dr Geetha Nair", hospital: "Apollo Hospital", specialisation: "Rheumatology", readAt: "2026-02-20",
  }),

  /* Divya: one report, so her picker shows a single doctor and a lab. */
  doc("LabReport_CBC_Ferritin_Apr2026", "Medical", "Lab Report", {
    source: "Upload", memberId: "spouse", medType: "lab_report", docDate: "2026-04-18",
    doctor: "Dr Shalini Rao", lab: "Cloudnine Diagnostics", readAt: "2026-04-18",
  }),

  /* Aditya: paediatrics, and a record with no index at all, so the "not read yet" state is visible. */
  doc("Prescription_DrRahulNair_Asthma_May2026", "Medical", "Prescription", {
    source: "Upload", memberId: "son", medType: "prescription", docDate: iso(-25),
    doctor: "Dr Rahul Nair", hospital: "Rainbow Children's Hospital", specialisation: "Paediatrics", readAt: iso(-25),
  }),
  doc("Vaccination_Card_Aditya", "Medical", "Vaccination Record", {
    source: "Upload", memberId: "son", medType: "other", docDate: "2026-01-10",
  }),

];

/* ── wealth holdings (assets, liabilities, protection) ── */
const dId = (t: string) => seedDocs.find((d) => d.docType === t)?.id;
const seedHoldings: Holding[] = [
  {
    id: id(),
    memberId: "you",
    name: "Savings account",
    kind: "asset",
    type: "Bank account",
    institution: "HDFC Bank",
    accountRef: "•4821",
    value: 240000,
    nominee: true,
    nomineeName: "Divya Iyer",
    accessNote:
      "Divya is joint holder. Netbanking ID saved under 'HDFC' in the password manager. Branch: MG Road (Mr. Srinivas, relationship manager).",
    docId: dId("Bank Statement"),
  },
  {
    id: id(),
    memberId: "you",
    name: "Fixed deposit",
    kind: "asset",
    type: "Fixed deposit",
    institution: "HDFC Bank",
    accountRef: "•6630",
    value: 500000,
    nominee: true,
    nomineeName: "Divya Iyer",
    maturityDate: rel(38),
    accessNote:
      "Auto-renew is OFF. On maturity, proceeds credit savings •4821. FD advice slip in the blue files folder at home.",
  },
  {
    id: id(),
    memberId: "you",
    name: "Mutual funds (SIP)",
    kind: "asset",
    type: "Mutual funds",
    institution: "HDFC Securities",
    accountRef: "•2093",
    value: 4200000,
    nominee: true,
    nomineeName: "Divya Iyer",
    docId: dId("Investment Statement"),
  },
  {
    id: id(),
    memberId: "you",
    name: "Gold in bank locker",
    kind: "asset",
    type: "Gold",
    institution: "HDFC Bank",
    accountRef: "Locker 114",
    value: 850000,
    nominee: true,
    nomineeName: "Divya Iyer",
    accessNote:
      "Locker 114, MG Road branch. Keys in the bedroom safe. Divya already has operating mandate; carry Aadhaar for access.",
  },
  {
    id: id(),
    memberId: "you",
    name: "NPS (retirement)",
    kind: "asset",
    type: "Retirement",
    institution: "Protean CRA",
    accountRef: "PRAN •7715",
    value: 1350000,
    nominee: true,
    nomineeName: "Divya Iyer",
    accessNote: "PRAN card in the files drawer. Linked bank: savings •4821. Login via Protean CRA portal with PRAN.",
  },
  {
    id: id(),
    memberId: "you",
    name: "Family home",
    kind: "asset",
    type: "Property",
    institution: "Lakeview Apartments",
    accountRef: "Flat 402",
    value: 18500000,
    nominee: true,
    nomineeName: "Divya Iyer",
    accessNote:
      "Original sale deed and khata in locker 114, HDFC MG Road. Society office: Mr. Rao, Lakeview Apts. Property tax paid online, receipts in this archive.",
    docId: dId("Property Deed"),
  },
  {
    id: id(),
    memberId: "you",
    name: "Home loan",
    kind: "liability",
    type: "Mortgage",
    institution: "HDFC Bank",
    accountRef: "•3390",
    value: 6200000,
    accessNote:
      "EMI autopay from savings •4821 on the 5th. Insurance-linked: loan cover clears the balance on death; certificate with the loan papers.",
  },
  {
    id: id(),
    memberId: "you",
    name: "Car loan",
    kind: "liability",
    type: "Auto loan",
    institution: "HDFC Bank",
    accountRef: "•8842",
    value: 410000,
  },
  {
    id: id(),
    memberId: "you",
    name: "Term life insurance",
    kind: "cover",
    type: "Life insurance",
    institution: "LIC",
    accountRef: "Policy 5567",
    value: 10000000,
    nominee: true,
    nomineeName: "Divya Iyer",
    renewalDate: rel(210),
    accessNote:
      "Agent: S. Ramanathan, 98400 22110. Claim online on the LIC portal with policy 5567 and death certificate. Premium autopays from savings •4821 each July.",
    docId: dId("Life Insurance"),
  },
  {
    id: id(),
    memberId: "you",
    name: "Health insurance (family floater)",
    kind: "cover",
    type: "Health insurance",
    institution: "Star Health",
    accountRef: "Policy 88231",
    value: 500000,
    nominee: true,
    nomineeName: "Family floater",
    renewalDate: rel(40),
    accessNote:
      "TPA: MediAssist. For cashless, quote policy 88231 with Aadhaar at the hospital insurance desk. E-cards saved in this archive under Insurance.",
    docId: dId("Health Insurance"),
  },
];

/* ── evidenced transactions (document-first money records, not a tracker) ── */
const seedTransactions: Transaction[] = [
  {
    id: id(),
    memberId: "you",
    purpose: "Loan for his car down payment",
    counterparty: "Rohan K (friend)",
    direction: "paid",
    amount: 150000,
    date: rel(-40),
    docId: dId("Transaction Evidence"),
    followUpOn: rel(50),
    followUpNote: "Agreed: repay by end of the quarter",
    followUpDone: false,
    addedAt: iso(-40),
  },
  {
    id: id(),
    memberId: "you",
    purpose: "Helped with hospital bill",
    counterparty: "Meera (sister)",
    direction: "received",
    amount: 60000,
    date: rel(-12),
    followUpOn: rel(78),
    followUpNote: "Return once the bonus comes in",
    followUpDone: false,
    addedAt: iso(-12),
  },
  {
    id: id(),
    memberId: "you",
    purpose: "Advance for the wedding photographer",
    counterparty: "Studio Verve",
    direction: "paid",
    amount: 25000,
    date: rel(-90),
    docId: dId("Transaction Evidence"),
    followUpDone: true,
    addedAt: iso(-90),
  },
];

/* ── health readings ── */
const L = (
  memberId: string,
  metric: string,
  value: number,
  unit: string,
  date: string,
  value2?: number,
  seriesKey?: string,
  refLow?: number,
  refHigh?: number,
  refText?: string,
  qualifier?: string,
): LabLog => ({
  id: id(),
  memberId,
  metric,
  value,
  value2,
  unit,
  date,
  seriesKey: seriesKey || metric.toLowerCase() + "|" + unit.toLowerCase(),
  refLow,
  refHigh,
  refText,
  qualifier,
});
const seedLabs: LabLog[] = [
  /* Every range below is the one printed on that report. The app supplies none. */

  /* Arjun: annual checkups over three years, plus a vitamin D course he is following and
     home blood-pressure readings. Enough series that the picker has something to sort. */
  L("you", "HbA1c", 5.2, "%", "2024-05-06", undefined, "hba1c|%", 4, 5.6, "4.0 to 5.6"),
  L("you", "HbA1c", 5.4, "%", "2025-04-28", undefined, "hba1c|%", 4, 5.6, "4.0 to 5.6"),
  L("you", "HbA1c", 5.5, "%", "2026-05-02", undefined, "hba1c|%", 4, 5.6, "4.0 to 5.6"),
  L("you", "LDL Cholesterol", 104, "mg/dL", "2024-05-06", undefined, "ldl cholesterol|mg/dl", undefined, 100, "under 100"),
  L("you", "LDL Cholesterol", 112, "mg/dL", "2025-04-28", undefined, "ldl cholesterol|mg/dl", undefined, 100, "under 100"),
  L("you", "LDL Cholesterol", 118, "mg/dL", "2026-05-02", undefined, "ldl cholesterol|mg/dl", undefined, 100, "under 100"),
  L("you", "HDL Cholesterol", 46, "mg/dL", "2025-04-28", undefined, "hdl cholesterol|mg/dl", 40, undefined, "over 40"),
  L("you", "HDL Cholesterol", 43, "mg/dL", "2026-05-02", undefined, "hdl cholesterol|mg/dl", 40, undefined, "over 40"),
  L("you", "Triglycerides", 168, "mg/dL", "2025-04-28", undefined, "triglycerides|mg/dl", undefined, 150, "under 150"),
  L("you", "Triglycerides", 194, "mg/dL", "2026-05-02", undefined, "triglycerides|mg/dl", undefined, 150, "under 150"),
  L("you", "Vitamin D", 11, "ng/mL", "2025-04-28", undefined, "vitamin d|ng/ml", 30, 100, "30 to 100"),
  L("you", "Vitamin D", 24, "ng/mL", "2025-10-12", undefined, "vitamin d|ng/ml", 30, 100, "30 to 100"),
  L("you", "Vitamin D", 38, "ng/mL", "2026-05-02", undefined, "vitamin d|ng/ml", 30, 100, "30 to 100"),
  L("you", "Vitamin B12", 268, "pg/mL", "2026-05-02", undefined, "vitamin b12|pg/ml", 200, 900, "200 to 900"),
  L("you", "TSH", 2.1, "mIU/L", "2026-05-02", undefined, "tsh|miu/l", 0.4, 4, "0.4 to 4.0"),
  L("you", "Haemoglobin", 14.6, "g/dL", "2026-05-02", undefined, "haemoglobin|g/dl", 13, 17, "13.0 to 17.0"),
  L("you", "SGPT", 52, "U/L", "2025-04-28", undefined, "sgpt|u/l", undefined, 45, "under 45"),
  L("you", "SGPT", 61, "U/L", "2026-05-02", undefined, "sgpt|u/l", undefined, 45, "under 45"),
  L("you", "Blood Pressure", 128, "mmHg", "2026-02-14", 84, "blood pressure|mmhg"),
  L("you", "Blood Pressure", 124, "mmHg", "2026-03-21", 82, "blood pressure|mmhg"),
  L("you", "Blood Pressure", 126, "mmHg", "2026-04-11", 83, "blood pressure|mmhg"),
  L("you", "Blood Pressure", 122, "mmHg", "2026-05-02", 80, "blood pressure|mmhg"),
  L("you", "Weight", 78.4, "kg", "2026-02-14", undefined, "weight|kg"),
  L("you", "Weight", 77.1, "kg", "2026-03-21", undefined, "weight|kg"),
  L("you", "Weight", 76.2, "kg", "2026-05-02", undefined, "weight|kg"),

  /* Divya: anaemia followed over a year, ferritin and haemoglobin moving together. */
  L("spouse", "Haemoglobin", 9.8, "g/dL", "2025-06-14", undefined, "haemoglobin|g/dl", 12, 15, "12.0 to 15.0"),
  L("spouse", "Haemoglobin", 10.6, "g/dL", "2025-11-08", undefined, "haemoglobin|g/dl", 12, 15, "12.0 to 15.0"),
  L("spouse", "Haemoglobin", 11.9, "g/dL", "2026-04-18", undefined, "haemoglobin|g/dl", 12, 15, "12.0 to 15.0"),
  L("spouse", "Ferritin", 8, "ng/mL", "2025-06-14", undefined, "ferritin|ng/ml", 15, 150, "15 to 150"),
  L("spouse", "Ferritin", 22, "ng/mL", "2025-11-08", undefined, "ferritin|ng/ml", 15, 150, "15 to 150"),
  L("spouse", "Ferritin", 41, "ng/mL", "2026-04-18", undefined, "ferritin|ng/ml", 15, 150, "15 to 150"),
  L("spouse", "Blood Pressure", 118, "mmHg", "2026-04-18", 76, "blood pressure|mmhg"),

  /* Ramesh: diabetes quarterly, kidney function declining, and PSA followed for two years
     after treatment, ending in two consecutive undetectable results. */
  L("father", "HbA1c", 8.1, "%", "2025-06-12", undefined, "hba1c|%", 4, 5.6, "4.0 to 5.6"),
  L("father", "HbA1c", 7.6, "%", "2025-09-18", undefined, "hba1c|%", 4, 5.6, "4.0 to 5.6"),
  L("father", "HbA1c", 6.6, "%", "2026-01-08", undefined, "hba1c|%", 4, 5.6, "4.0 to 5.6"),
  L("father", "HbA1c", 6.9, "%", "2026-03-12", undefined, "hba1c|%", 4, 5.6, "4.0 to 5.6"),
  L("father", "HbA1c", 7.2, "%", "2026-06-10", undefined, "hba1c|%", 4, 5.6, "4.0 to 5.6"),
  L("father", "Fasting Glucose", 156, "mg/dL", "2026-01-08", undefined, "fasting glucose|mg/dl", 70, 99, "70 to 99"),
  L("father", "Fasting Glucose", 148, "mg/dL", "2026-03-12", undefined, "fasting glucose|mg/dl", 70, 99, "70 to 99"),
  L("father", "Fasting Glucose", 162, "mg/dL", "2026-06-10", undefined, "fasting glucose|mg/dl", 70, 99, "70 to 99"),
  L("father", "LDL Cholesterol", 132, "mg/dL", "2026-01-08", undefined, "ldl cholesterol|mg/dl", undefined, 100, "under 100"),
  L("father", "LDL Cholesterol", 124, "mg/dL", "2026-03-12", undefined, "ldl cholesterol|mg/dl", undefined, 100, "under 100"),
  L("father", "LDL Cholesterol", 119, "mg/dL", "2026-06-10", undefined, "ldl cholesterol|mg/dl", undefined, 100, "under 100"),
  L("father", "Blood Pressure", 138, "mmHg", "2026-01-08", 86, "blood pressure|mmhg"),
  L("father", "Blood Pressure", 132, "mmHg", "2026-03-12", 84, "blood pressure|mmhg"),
  L("father", "Blood Pressure", 124, "mmHg", "2026-06-10", 82, "blood pressure|mmhg"),
  L("father", "Creatinine", 1.12, "mg/dL", "2025-09-18", undefined, "creatinine|mg/dl", 0.7, 1.3, "0.7 to 1.3"),
  L("father", "Creatinine", 1.21, "mg/dL", "2026-01-08", undefined, "creatinine|mg/dl", 0.7, 1.3, "0.7 to 1.3"),
  L("father", "Creatinine", 1.28, "mg/dL", "2026-03-12", undefined, "creatinine|mg/dl", 0.7, 1.3, "0.7 to 1.3"),
  L("father", "Creatinine", 1.41, "mg/dL", "2026-06-10", undefined, "creatinine|mg/dl", 0.7, 1.3, "0.7 to 1.3"),
  L("father", "eGFR", 78, "mL/min/1.73m2", "2025-09-18", undefined, "egfr|ml/min/1.73m2", 90, undefined, "over 90"),
  L("father", "eGFR", 74, "mL/min/1.73m2", "2026-01-08", undefined, "egfr|ml/min/1.73m2", 90, undefined, "over 90"),
  L("father", "eGFR", 63, "mL/min/1.73m2", "2026-03-12", undefined, "egfr|ml/min/1.73m2", 90, undefined, "over 90"),
  L("father", "eGFR", 55, "mL/min/1.73m2", "2026-06-10", undefined, "egfr|ml/min/1.73m2", 90, undefined, "over 90"),
  L("father", "Potassium", 5.1, "mEq/L", "2026-06-10", undefined, "potassium|meq/l", 3.5, 5, "3.5 to 5.0"),
  L("father", "PSA Total", 8.4, "ng/mL", "2025-06-12", undefined, "total psa|ng/ml", 0, 4, "0.0 to 4.0"),
  L("father", "PSA Total", 6.1, "ng/mL", "2025-08-05", undefined, "total psa|ng/ml", 0, 4, "0.0 to 4.0"),
  L("father", "PSA Total", 2.3, "ng/mL", "2025-11-20", undefined, "total psa|ng/ml", 0, 4, "0.0 to 4.0"),
  L("father", "PSA Total", 0.42, "ng/mL", "2026-01-08", undefined, "total psa|ng/ml", 0, 4, "0.0 to 4.0"),
  L("father", "PSA Total", 0.08, "ng/mL", "2026-03-12", undefined, "total psa|ng/ml", 0, 4, "0.0 to 4.0"),
  L("father", "PSA Total", 0.01, "ng/mL", "2026-06-10", undefined, "total psa|ng/ml", 0, 4, "0.0 to 4.0", "<"),
  L("father", "PSA Free", 0.91, "ng/mL", "2025-06-12", undefined, "free psa|ng/ml", 0.5, 2, "0.5 to 2.0"),
  L("father", "Haemoglobin", 12.4, "g/dL", "2026-06-10", undefined, "haemoglobin|g/dl", 13, 17, "13.0 to 17.0"),

  /* Lakshmi: thyroid panel plus a bone marker, all from her own reports. */
  L("mother", "TSH", 8.4, "mIU/L", "2025-09-10", undefined, "tsh|miu/l", 0.4, 4, "0.4 to 4.0"),
  L("mother", "TSH", 6.2, "mIU/L", "2026-01-15", undefined, "tsh|miu/l", 0.4, 4, "0.4 to 4.0"),
  L("mother", "TSH", 4.8, "mIU/L", "2026-03-20", undefined, "tsh|miu/l", 0.4, 4, "0.4 to 4.0"),
  L("mother", "TSH", 3.9, "mIU/L", "2026-05-20", undefined, "tsh|miu/l", 0.4, 4, "0.4 to 4.0"),
  L("mother", "Free T4", 0.74, "ng/dL", "2025-09-10", undefined, "free t4|ng/dl", 0.8, 1.8, "0.8 to 1.8"),
  L("mother", "Free T4", 0.82, "ng/dL", "2026-01-15", undefined, "free t4|ng/dl", 0.8, 1.8, "0.8 to 1.8"),
  L("mother", "Free T4", 1.05, "ng/dL", "2026-03-20", undefined, "free t4|ng/dl", 0.8, 1.8, "0.8 to 1.8"),
  L("mother", "Free T4", 1.21, "ng/dL", "2026-05-20", undefined, "free t4|ng/dl", 0.8, 1.8, "0.8 to 1.8"),
  L("mother", "Vitamin D", 14, "ng/mL", "2026-01-15", undefined, "vitamin d|ng/ml", 30, 100, "30 to 100"),
  L("mother", "Vitamin D", 26, "ng/mL", "2026-05-20", undefined, "vitamin d|ng/ml", 30, 100, "30 to 100"),
  L("mother", "Calcium", 9.1, "mg/dL", "2026-05-20", undefined, "calcium|mg/dl", 8.6, 10.2, "8.6 to 10.2"),
  L("mother", "Haemoglobin", 11.6, "g/dL", "2026-05-20", undefined, "haemoglobin|g/dl", 12, 15, "12.0 to 15.0"),
  L("mother", "Blood Pressure", 128, "mmHg", "2026-05-20", 78, "blood pressure|mmhg"),

  /* Aditya: growth tracked at home, the case where a chart needs density rather than a lab. */
  L("son", "Weight", 26.5, "kg", "2025-08-01", undefined, "weight|kg"),
  L("son", "Weight", 27.4, "kg", "2025-11-01", undefined, "weight|kg"),
  L("son", "Weight", 28, "kg", "2026-02-01", undefined, "weight|kg"),
  L("son", "Weight", 30, "kg", "2026-05-01", undefined, "weight|kg"),
];

const seedMeds: Medication[] = [
  { id: id(), memberId: "father", name: "Metformin", dose: "500 mg", freq: "1-0-1", refillBy: rel(4) },
  { id: id(), memberId: "father", name: "Telmisartan", dose: "40 mg", freq: "1-0-0", refillBy: rel(19) },
  { id: id(), memberId: "father", name: "Atorvastatin", dose: "10 mg", freq: "0-0-1", refillBy: rel(19) },
  { id: id(), memberId: "father", name: "Bicalutamide", dose: "50 mg", freq: "1-0-0", refillBy: rel(26) },
  { id: id(), memberId: "mother", name: "Levothyroxine", dose: "75 mcg", freq: "1-0-0", refillBy: rel(9) },
  { id: id(), memberId: "mother", name: "Cholecalciferol", dose: "60000 IU", freq: "Weekly", refillBy: rel(48) },
  { id: id(), memberId: "you", name: "Cholecalciferol", dose: "60000 IU", freq: "Weekly", refillBy: rel(33) },
  { id: id(), memberId: "you", name: "Methylcobalamin", dose: "1500 mcg", freq: "1-0-0", refillBy: rel(14) },
  { id: id(), memberId: "spouse", name: "Ferrous ascorbate", dose: "100 mg", freq: "1-0-0", refillBy: rel(11) },
  /* No refill date printed on the prescription: the row must simply omit the refill line. */
  { id: id(), memberId: "son", name: "Salbutamol inhaler", dose: "100 mcg", freq: "As needed", refillBy: "" },
];

const seedReminders: Reminder[] = [
  { id: id(), memberId: "father", title: "Metformin refill", kind: "refill", due: rel(4), done: false },
  { id: id(), memberId: "father", title: "Review with Dr Venkatesh Prasad", kind: "appointment", due: rel(12), done: false },
  { id: id(), memberId: "father", title: "Nephrology review with Dr Suresh Menon", kind: "appointment", due: rel(27), done: false },
  { id: id(), memberId: "father", title: "PSA recheck before oncology visit", kind: "appointment", due: rel(54), done: false },
  { id: id(), memberId: "father", title: "Health insurance renewal", kind: "insurance", due: rel(21), done: false },
  /* One overdue item, so the overdue state is visible without waiting. */
  { id: id(), memberId: "mother", title: "Levothyroxine refill", kind: "refill", due: rel(-3), done: false },
  { id: id(), memberId: "mother", title: "TSH recheck", kind: "appointment", due: rel(40), done: false },
  { id: id(), memberId: "spouse", title: "Haemoglobin recheck", kind: "appointment", due: rel(35), done: false },
  { id: id(), memberId: "you", title: "Annual health checkup", kind: "appointment", due: rel(70), done: false },
  { id: id(), memberId: "you", title: "Vitamin D recheck", kind: "appointment", due: rel(44), done: false },
  { id: id(), memberId: "you", title: "Methylcobalamin refill", kind: "refill", due: rel(14), done: false },
  { id: id(), memberId: "son", title: "MMR booster due", kind: "vaccination", due: rel(15), done: false },
  { id: id(), memberId: "son", title: "Paediatric dental checkup", kind: "appointment", due: rel(33), done: false },
];

const seedCare: Record<string, CareProfile> = {
  you: {
    conditions: [],
    medications: [],
    allergies: "Penicillin",
    doctor: "Dr Meera Krishnan, Family Medicine",
    hospital: "Manipal Hospital, Whitefield",
    emergency: "Divya Iyer (spouse) 98450 11223",
  },
  spouse: {
    conditions: ["Iron deficiency anaemia"],
    medications: [],
    allergies: "None recorded",
    doctor: "Dr Shalini Rao, Internal Medicine",
    hospital: "Cloudnine Hospital, Bellandur",
    emergency: "Arjun Iyer (spouse) 98450 11224",
  },
  father: {
    conditions: ["Type 2 Diabetes", "Hypertension", "Chronic Kidney Disease stage 3", "Prostate cancer, in remission"],
    medications: [],
    allergies: "Sulfonamides",
    doctor: "Dr Venkatesh Prasad, Endocrinology",
    hospital: "Fortis Hospital, Bannerghatta Road",
    emergency: "Arjun Iyer (son) 98450 11224",
  },
  mother: {
    conditions: ["Hypothyroidism", "Osteoporosis"],
    medications: [],
    allergies: "None recorded",
    doctor: "Dr Anita Shetty, Endocrinology",
    hospital: "Apollo Hospital, Jayanagar",
    emergency: "Arjun Iyer (son) 98450 11224",
  },
  son: {
    conditions: ["Asthma"],
    medications: [],
    allergies: "Peanuts, dust mites",
    doctor: "Dr Rahul Nair, Paediatrics",
    hospital: "Rainbow Children's Hospital, Marathahalli",
    emergency: "Arjun Iyer (father) 98450 11224",
  },
};


const emptyOwner: Member = { id: "you", name: "You", relation: "Self", color: "#5B8DEF", access: "Owner" };
const EMPTY: Omit<State, "theme" | "notifications" | "onboarded" | "dataMode" | "currency" | "country" | "packSkips" | "nationality"> = {
  members: [emptyOwner],
  docs: [],
  labs: [],
  care: { you: { conditions: [], medications: [], allergies: "" } },
  meds: [],
  reminders: [],
  holdings: [],
  transactions: [],
  handoff: null,
  customPacks: [],
};
const SAMPLE: Omit<State, "theme" | "notifications" | "onboarded" | "dataMode" | "currency" | "country" | "packSkips" | "nationality"> = {
  members: seedMembers,
  docs: seedDocs,
  labs: seedLabs,
  care: seedCare,
  meds: seedMeds,
  reminders: seedReminders,
  holdings: seedHoldings,
  transactions: seedTransactions,
  handoff: null,
  customPacks: [],
};
const DEFAULT: State = {
  onboarded: true,
  dataMode: "empty",
  members: seedMembers,
  docs: seedDocs,
  labs: seedLabs,
  care: seedCare,
  meds: seedMeds,
  reminders: seedReminders,
  holdings: seedHoldings,
  transactions: seedTransactions,
  handoff: null,
  customPacks: [],
  theme: "dark",
  notifications: false,
  currency: defaultCurrency(),
  country: defaultCountry(),
  nationality: defaultCountry(),
  packSkips: {},
};
// user-scoped bundles preserved across a mode switch (so switching back is instant and lossless)
type Bundle = Omit<State, "theme" | "notifications" | "onboarded" | "dataMode" | "currency" | "country" | "packSkips" | "nationality">;
const BUNDLE_KEYS: (keyof Bundle)[] = [
  "members",
  "docs",
  "labs",
  "care",
  "meds",
  "reminders",
  "holdings",
  "transactions",
  "handoff",
  "customPacks",
];
const LS_SAVED = "lifepack.v7.saved"; // { sample?: Bundle, empty?: Bundle }
type Saved = { sample?: Bundle; empty?: Bundle };
function loadSaved(): Saved {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LS_SAVED) || "{}");
  } catch {
    return {};
  }
}
function saveSaved(v: Saved) {
  if (typeof window !== "undefined") localStorage.setItem(LS_SAVED, JSON.stringify(v));
}
function bundleOf(st: State): Bundle {
  const b: any = {};
  BUNDLE_KEYS.forEach((k) => (b[k] = (st as any)[k]));
  return b;
}

/* ── visit-pack selector: the data-layer ("backend") filter for Prepare-for-visit.
   Given the chosen doctor/appointment, returns the member's relevant real documents,
   filtered by specialty keywords and recency, sorted by clinical priority then date. ── */
/* Visit selection lives in ./visit so it can be tested without pulling in React or storage. */
export { visitTargets, targetLabel, selectVisitDocs, type VisitTarget } from "./extract-medical";


function load(): State {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(LS);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        ...DEFAULT,
        ...p,
        care: p.care ?? DEFAULT.care,
        labs: p.labs ?? DEFAULT.labs,
        meds: p.meds ?? DEFAULT.meds,
        reminders: p.reminders ?? DEFAULT.reminders,
        docs: p.docs ?? DEFAULT.docs,
        holdings: p.holdings ?? DEFAULT.holdings,
        transactions: p.transactions ?? DEFAULT.transactions,
        handoff: p.handoff ?? null,
        customPacks: p.customPacks ?? [],
        theme: p.theme ?? "dark",
        notifications: p.notifications ?? false,
        dataMode: p.dataMode ?? "empty",
        currency: p.currency ?? defaultCurrency(),
      };
    }
  } catch {}
  return DEFAULT;
}

let state: State = load();
const subs = new Set<() => void>();
function persist() {
  try {
    if (typeof window !== "undefined") localStorage.setItem(LS, JSON.stringify(state));
  } catch {}
  subs.forEach((f) => f());
}

function recipientsFor(category: Category, members: Member[]): Record<string, JsonWebKey> {
  const mine = myPublicKey();
  if (!mine) return {};
  if (category === "Medical") {
    const r: Record<string, JsonWebKey> = { you: mine };
    for (const m of members) if (m.publicJwk) r[m.id] = m.publicJwk;
    return r;
  }
  return { you: mine };
}

/* ── transient cross-screen intent: "open Wealth with this document" (never persisted) ── */
let wealthIntent: { docId: string } | null = null;

export function getCurrency(): string {
  return state.currency || "INR";
}

export function useStore() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  }, []);

  const addFiles = useCallback(async (files: FileList | File[], memberId?: string, override?: Partial<Doc>) => {
    await ensureVaultReady();
    const created: Doc[] = [];
    const newLabs: LabLog[] = [];
    const newMeds: Medication[] = [];
    const newReminders: Reminder[] = [];
    for (const file of Array.from(files)) {
      const key = "f_" + Math.random().toString(36).slice(2) + Date.now();
      const sizeKB = Math.max(1, Math.round(file.size / 1024));
      const text = await safeOcr(file, file.type || "", sizeKB);          // on-device OCR
      const c = classifyContent(file.name, text);                        // content, else filename
      const recipients = recipientsFor(c.category, state.members);       // Health=family, else owner
      let meta: DocCrypto | undefined;
      try { meta = await putEncrypted(key, file, recipients); } catch {} // encrypt on write
      const base: Doc = {
        id: key,
        name: file.name,
        category: c.category,
        docType: c.docType,
        medType: c.medType,
        source: "Upload",
        mime: file.type || "application/octet-stream",
        sizeKB,
        addedAt: new Date().toISOString(),
        expiry: c.expiry,
        memberId: memberId || (c.category === "Medical" ? undefined : "you"),
        fileKey: key,
        iv: meta?.iv,
        wrappedKeys: meta?.wrappedKeys,
        enc: !!meta,
      };
const doc: Doc = { ...base, ...override, id: key, fileKey: key };
      created.push(doc);
      state = { ...state, docs: [doc, ...state.docs] };
    }
    if (newLabs.length || newMeds.length || newReminders.length)
      state = {
        ...state,
        labs: [...newLabs, ...state.labs],
        meds: [...state.meds, ...newMeds],
        reminders: [...state.reminders, ...newReminders],
      };
    persist();
    return created;
  }, []);
  const updateDoc = useCallback((docId: string, patch: Partial<Doc>) => {
    state = { ...state, docs: state.docs.map((d) => (d.id === docId ? { ...d, ...patch } : d)) };
    persist();
  }, []);
  const removeDoc = useCallback(async (docId: string) => {
    const d = state.docs.find((x) => x.id === docId);
    if (d && d.fileKey !== "seed") {
      try {
        await delBlob(d.fileKey);
      } catch {}
    }
    state = {
      ...state,
      docs: state.docs.filter((x) => x.id !== docId),
      /* A reading only exists because a report stated it. Remove the report, remove the reading,
         so a chart can never plot a value with no source behind it. */
      labs: state.labs.filter((x) => x.sourceDocId !== docId),
    };
    persist();
  }, []);
  const addMember = useCallback((mem: Member) => {
    state = { ...state, members: [...state.members, mem] };
    persist();
  }, []);
  /* Removing a person takes their health data with them. Their documents stay in the vault,
     unassigned, so nothing the family may still need is destroyed by a tidy-up. */
  const removeMember = useCallback((mid: string) => {
    if (mid === "you") return;
    const care = { ...state.care };
    delete care[mid];
    state = {
      ...state,
      members: state.members.filter((x) => x.id !== mid),
      care,
      labs: state.labs.filter((x) => x.memberId !== mid),
      meds: state.meds.filter((x) => x.memberId !== mid),
      reminders: state.reminders.filter((x) => x.memberId !== mid),
      holdings: state.holdings.map((h) => (h.memberId === mid ? { ...h, memberId: "you" } : h)),
      docs: state.docs.map((d) => (d.memberId === mid ? { ...d, memberId: undefined } : d)),
    };
    persist();
  }, []);
  const updateMember = useCallback((mid: string, patch: Partial<Member>) => {
    state = { ...state, members: state.members.map((mm) => (mm.id === mid ? { ...mm, ...patch } : mm)) };
    persist();
  }, []);
  const removeLab = useCallback((lid: string) => {
    state = { ...state, labs: state.labs.filter((x) => x.id !== lid) };
    persist();
  }, []);
  const addLab = useCallback((l: LabLog) => {
    state = { ...state, labs: [l, ...state.labs] };
    persist();
  }, []);
  const updateCare = useCallback((mid: string, patch: Partial<CareProfile>) => {
    const cur = state.care[mid] || { conditions: [], medications: [], allergies: "None recorded" };
    state = { ...state, care: { ...state.care, [mid]: { ...cur, ...patch } } };
    persist();
  }, []);
  const addMed = useCallback((mm: Medication) => {
    state = { ...state, meds: [...state.meds, mm] };
    persist();
  }, []);
  const removeMed = useCallback((mid: string) => {
    state = { ...state, meds: state.meds.filter((x) => x.id !== mid) };
    persist();
  }, []);
  const confirmMed = useCallback((mid: string) => {
    const today = new Date().toISOString().slice(0, 10);
    state = { ...state, meds: state.meds.map((x) => (x.id === mid ? { ...x, confirmedOn: today } : x)) };
    persist();
  }, []);
  const stopMed = useCallback((mid: string, note?: string) => {
    const today = new Date().toISOString().slice(0, 10);
    state = { ...state, meds: state.meds.map((x) => (x.id === mid ? { ...x, status: "stopped" as const, stoppedOn: today, stoppedNote: note } : x)) };
    persist();
  }, []);
  const addReminder = useCallback((r: Reminder) => {
    state = { ...state, reminders: [...state.reminders, r] };
    persist();
  }, []);
  const completeReminder = useCallback((rid: string) => {
    state = { ...state, reminders: state.reminders.map((x) => (x.id === rid ? { ...x, done: true } : x)) };
    persist();
  }, []);
  const removeReminder = useCallback((rid: string) => {
    state = { ...state, reminders: state.reminders.filter((x) => x.id !== rid) };
    persist();
  }, []);
  const updateHolding = useCallback((hid: string, patch: Partial<Holding>) => {
    state = { ...state, holdings: state.holdings.map((h) => (h.id === hid ? { ...h, ...patch } : h)) };
    persist();
  }, []);
  const addHolding = useCallback((h: Holding) => {
    state = { ...state, holdings: [h, ...state.holdings] };
    persist();
  }, []);
  const removeHolding = useCallback((hid: string) => {
    state = { ...state, holdings: state.holdings.filter((h) => h.id !== hid) };
    persist();
  }, []);
  const attachDocToHolding = useCallback(async (hid: string, files: FileList | File[], override?: Partial<Doc>) => {
    const file = Array.from(files)[0];
    if (!file) return;
    await ensureVaultReady();
    const c = classify(file.name);
    const key = "f_" + Math.random().toString(36).slice(2) + Date.now();
    const recipients = recipientsFor(c.category, state.members);
    let meta: DocCrypto | undefined;
    try { meta = await putEncrypted(key, file, recipients); } catch {}
    const d: Doc = {
      id: key,
      name: file.name,
      category: c.category,
      docType: c.docType,
      medType: c.medType,
      source: "Upload",
      mime: file.type || "application/octet-stream",
      sizeKB: Math.max(1, Math.round(file.size / 1024)),
      addedAt: new Date().toISOString(),
      memberId: "you",
      ...override,
      fileKey: key,
      iv: meta?.iv,
      wrappedKeys: meta?.wrappedKeys,
      enc: !!meta,
    } as Doc;
    state = {
      ...state,
      docs: [d, ...state.docs],
      holdings: state.holdings.map((h) => (h.id === hid ? { ...h, docId: key } : h)),
    };
    persist();
  }, []);
  const addTransaction = useCallback(async (t: Omit<Transaction, "id" | "addedAt" | "docId">, evidence?: File) => {
    await ensureVaultReady();
    let docId: string | undefined;
    if (evidence) {
      const key = "f_" + Math.random().toString(36).slice(2) + Date.now();
      const recipients = recipientsFor("Finance", state.members);
      let meta: DocCrypto | undefined;
      try { meta = await putEncrypted(key, evidence, recipients); } catch {}
      const d: Doc = {
        id: key,
        name: evidence.name,
        category: "Finance",
        docType: "Transaction Evidence",
        source: "Upload",
        mime: evidence.type || "application/octet-stream",
        sizeKB: Math.max(1, Math.round(evidence.size / 1024)),
        addedAt: new Date().toISOString(),
        docDate: t.date,
        memberId: t.memberId || "you",
        fileKey: key,
        notes: t.purpose,
        iv: meta?.iv,
        wrappedKeys: meta?.wrappedKeys,
        enc: !!meta,
      };
      state = { ...state, docs: [d, ...state.docs] };
      docId = key;
    }
    const tx: Transaction = { ...t, id: id(), addedAt: new Date().toISOString(), docId };
    state = { ...state, transactions: [tx, ...state.transactions] };
    persist();
  }, []);
  const attachEvidenceToTransaction = useCallback(async (txId: string, files: FileList | File[]) => {
    const file = Array.from(files)[0];
    const t = state.transactions.find((x) => x.id === txId);
    if (!file || !t) return;
    await ensureVaultReady();
    const key = "f_" + Math.random().toString(36).slice(2) + Date.now();
    const recipients = recipientsFor("Finance", state.members);
    let meta: DocCrypto | undefined;
    try { meta = await putEncrypted(key, file, recipients); } catch {}
    const d: Doc = {
      id: key,
      name: file.name,
      category: "Finance",
      docType: "Transaction Evidence",
      source: "Upload",
      mime: file.type || "application/octet-stream",
      sizeKB: Math.max(1, Math.round(file.size / 1024)),
      addedAt: new Date().toISOString(),
      docDate: t.date,
      memberId: t.memberId || "you",
      fileKey: key,
      notes: t.purpose,
      iv: meta?.iv,
      wrappedKeys: meta?.wrappedKeys,
      enc: !!meta,
    };
    state = {
      ...state,
      docs: [d, ...state.docs],
      transactions: state.transactions.map((x) => (x.id === txId ? { ...x, docId: key } : x)),
    };
    persist();
  }, []);
  const updateTransaction = useCallback((tid: string, patch: Partial<Transaction>) => {
    state = { ...state, transactions: state.transactions.map((t) => (t.id === tid ? { ...t, ...patch } : t)) };
    persist();
  }, []);
  const removeTransaction = useCallback(async (tid: string) => {
    const t = state.transactions.find((x) => x.id === tid);
    if (t?.docId) {
      const d = state.docs.find((x) => x.id === t.docId);
      if (d && d.fileKey !== "seed") {
        try {
          await delBlob(d.fileKey);
        } catch {}
      }
      state = { ...state, docs: state.docs.filter((x) => x.id !== t.docId) };
    }
    state = { ...state, transactions: state.transactions.filter((x) => x.id !== tid) };
    persist();
  }, []);
  const completeFollowUp = useCallback((tid: string) => {
    state = {
      ...state,
      transactions: state.transactions.map((t) => (t.id === tid ? { ...t, followUpDone: true } : t)),
    };
    persist();
  }, []);
  const setDataMode = useCallback((mode: "sample" | "empty") => {
    if (state.dataMode === mode) return;
    const saved = loadSaved();
    saved[state.dataMode] = bundleOf(state); // preserve what the user did in the current mode
    saveSaved(saved);
    const restore: Bundle = saved[mode] || (mode === "empty" ? (EMPTY as Bundle) : (SAMPLE as Bundle));
    state = { ...state, ...restore, dataMode: mode, onboarded: mode === "empty" ? false : true };
    persist();
  }, []);
  const setTheme = useCallback((t: "dark" | "light") => {
    state = { ...state, theme: t };
    persist();
  }, []);
  /* Re-express every amount in the new home currency. Entries made in another currency use their own
     recorded amount; entries made in the old home currency are converted at the bundled rate. */
  /* A requirement the user says does not apply to them. Reversible, and it never deletes anything
     from the published list: it only stops this pack demanding it. */
  const setPackSkip = useCallback((packId: string, req: string, skip: boolean) => {
    const cur = state.packSkips?.[packId] || [];
    const next = skip ? [...new Set([...cur, req])] : cur.filter((x) => x !== req);
    state = { ...state, packSkips: { ...(state.packSkips || {}), [packId]: next } };
    persist();
  }, []);
  /* A visa list is set by the passport, not the address. Kept separate from country so someone
     on an Indian passport living in Dubai gets the requirements they will actually face. */
  const setNationality = useCallback((c: string) => {
    state = { ...state, nationality: c };
    persist();
  }, []);
  const setCountry = useCallback((c: string) => {
    state = { ...state, country: c };
    persist();
  }, []);
  const setCurrency = useCallback((to: string) => {
    const from = state.currency || "INR";
    if (to === from) return;
    /* Keep the original on every entry so the subline always shows what was actually recorded. */
    const re = (v: number | undefined, orig?: number, origCur?: string) => {
      const oAmt = origCur && orig !== undefined ? orig : v || 0;
      const oCur = origCur || from;
      return { value: oAmt * rateBetween(oCur, to), origAmount: oAmt, origCurrency: oCur, fxRate: rateBetween(oCur, to) };
    };
    state = {
      ...state,
      currency: to,
      holdings: state.holdings.map((h) => {
        const x = re(h.value, h.origAmount, h.origCurrency);
        return { ...h, value: x.value, origAmount: x.origAmount, origCurrency: x.origCurrency, fxRate: x.fxRate };
      }),
      transactions: state.transactions.map((t) => {
        const x = re(t.amount, t.origAmount, t.origCurrency);
        return { ...t, amount: x.value, origAmount: x.origAmount, origCurrency: x.origCurrency, fxRate: x.fxRate };
      }),
    };
    persist();
  }, []);
  const setNotifications = useCallback((v: boolean) => {
    state = { ...state, notifications: v };
    persist();
  }, []);
  const addCustomPack = useCallback((cp: Omit<CustomPack, "id" | "createdAt">) => {
    state = { ...state, customPacks: [...state.customPacks, { ...cp, id: id(), createdAt: new Date().toISOString() }] };
    persist();
  }, []);
  const updateCustomPack = useCallback((cid: string, patch: Partial<CustomPack>) => {
    state = { ...state, customPacks: state.customPacks.map((c) => (c.id === cid ? { ...c, ...patch } : c)) };
    persist();
  }, []);
  const removeCustomPack = useCallback((cid: string) => {
    state = { ...state, customPacks: state.customPacks.filter((c) => c.id !== cid) };
    persist();
  }, []);
  const releaseHandoff = useCallback((recipients: string[], reason: HandoffReason) => {
    state = { ...state, handoff: { releasedAt: new Date().toISOString(), recipients, reason } };
    persist();
  }, []);
  const cancelHandoff = useCallback(() => {
    state = { ...state, handoff: null };
    persist();
  }, []);
  const setOnboarded = useCallback((v: boolean) => {
    state = { ...state, onboarded: v };
    persist();
  }, []);
  /* Attested class: one extraction, only when the user asks, nothing saved until they confirm. */
  const fillFromDocument = useCallback(async (docId: string): Promise<Partial<Holding>> => {
    const d = state.docs.find((x) => x.id === docId);
    if (!d || d.fileKey === "seed" || !d.iv || !d.wrappedKeys) return {};
    const blob = await getDecrypted(d.fileKey, d.iv, d.wrappedKeys, "you", d.mime);
    if (!blob) return {};
    const text = await safeOcr(blob, d.mime, d.sizeKB);
    return extractHoldingFields(text);
  }, []);
  const setWealthIntent = useCallback((i: { docId: string } | null) => {
    wealthIntent = i;
  }, []);
  const takeWealthIntent = useCallback(() => {
    const i = wealthIntent;
    wealthIntent = null;
    return i;
  }, []);
  const reset = useCallback(() => {
    state = { ...DEFAULT };
    persist();
  }, []);

  return {
    ...state,
    addFiles,
    updateDoc,
    removeDoc,
    addMember,
    updateMember,
    removeMember,
    addLab,
    removeLab,
    updateCare,
    addMed,
    removeMed,
    confirmMed,
    stopMed,
    addReminder,
    completeReminder,
    removeReminder,
    updateHolding,
    addHolding,
    removeHolding,
    attachDocToHolding,
    addTransaction,
    attachEvidenceToTransaction,
    updateTransaction,
    removeTransaction,
    completeFollowUp,
    setDataMode,
    setTheme,
    setCurrency,
    setCountry,
    setNationality,
    setPackSkip,
    setNotifications,
    addCustomPack,
    updateCustomPack,
    removeCustomPack,
    releaseHandoff,
    cancelHandoff,
    setOnboarded,
    fillFromDocument,
    setWealthIntent,
    takeWealthIntent,
    reset,
  };
}
