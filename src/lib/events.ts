import type { Doc } from "./types";

export interface Req { label: string; match: string[] } // match against docType (any)
export interface LifeEvent { id: string; name: string; blurb: string; icon: string; reqs: Req[]; }

export const EVENTS: LifeEvent[] = [
  { id: "schengen", name: "Schengen Visa", blurb: "Tourist visa, Europe", icon: "Plane", reqs: [
    { label: "Passport", match: ["Passport"] },
    { label: "Employment / Offer Letter", match: ["Offer Letter","Experience Letter"] },
    { label: "Payslips (3 months)", match: ["Payslip"] },
    { label: "Bank Statements (6 months)", match: ["Bank Statement"] },
    { label: "Income Tax Returns", match: ["ITR","Form 16"] },
    { label: "Travel Insurance", match: ["Travel Insurance"] },
    { label: "Flight Reservation", match: ["Flight Reservation"] },
    { label: "Hotel Booking", match: ["Hotel Booking"] },
  ]},
  { id: "homeloan", name: "Home Loan", blurb: "Application pack", icon: "Landmark", reqs: [
    { label: "PAN", match: ["PAN"] }, { label: "Aadhaar", match: ["Aadhaar"] },
    { label: "Payslips (6 months)", match: ["Payslip"] },
    { label: "Bank Statements", match: ["Bank Statement"] },
    { label: "Form 16", match: ["Form 16"] },
    { label: "Property Documents", match: ["Sale Deed","Property Tax Receipt"] },
    { label: "Property Valuation", match: ["Property Valuation"] },
  ]},
  { id: "bgv", name: "Background Verification", blurb: "New job onboarding", icon: "ShieldCheck", reqs: [
    { label: "PAN", match: ["PAN"] }, { label: "Offer Letter", match: ["Offer Letter"] },
    { label: "Relieving Letter", match: ["Relieving Letter"] },
    { label: "Experience Letter", match: ["Experience Letter"] },
    { label: "Payslips", match: ["Payslip"] }, { label: "Form 16", match: ["Form 16"] },
    { label: "Education Marksheets", match: ["Marksheet"] },
    { label: "Address Proof", match: ["Aadhaar","Rental Agreement"] },
  ]},
  { id: "hospital", name: "Hospital Admission", blurb: "Care visit pack", icon: "HeartPulse", reqs: [
    { label: "Health Insurance Card", match: ["Health Insurance"] },
    { label: "ID Proof", match: ["Aadhaar","PAN"] },
    { label: "Past Prescriptions", match: ["Prescription"] },
    { label: "Lab Reports", match: ["Lab Report"] },
    { label: "Discharge Summaries", match: ["Discharge Summary"] },
    { label: "Pre-Authorization Form", match: ["Pre-Authorization"] },
  ]},
  { id: "tax", name: "Tax Filing", blurb: "FY 2025-26", icon: "FileText", reqs: [
    { label: "PAN", match: ["PAN"] }, { label: "Aadhaar", match: ["Aadhaar"] },
    { label: "Form 16", match: ["Form 16"] }, { label: "Bank Statements", match: ["Bank Statement"] },
    { label: "Investment Proofs", match: ["Investment Statement"] },
    { label: "Capital Gains Statement", match: ["Capital Gains"] },
  ]},
  { id: "property", name: "Property Sale", blurb: "Resale pack", icon: "Home", reqs: [
    { label: "Sale Deed", match: ["Sale Deed"] },
    { label: "Property Tax Receipt", match: ["Property Tax Receipt"] },
    { label: "PAN", match: ["PAN"] }, { label: "Aadhaar", match: ["Aadhaar"] },
    { label: "Encumbrance Certificate", match: ["Encumbrance"] },
  ]},
];

export function evalEvent(ev: LifeEvent, docs: Doc[]) {
  const rows = ev.reqs.map((r) => {
    const hit = docs.find((d) => r.match.includes(d.docType));
    return { label: r.label, have: !!hit, doc: hit };
  });
  const score = Math.round((rows.filter((r) => r.have).length / rows.length) * 100);
  return { rows, score, haveDocs: rows.filter((r) => r.have && r.doc).map((r) => r.doc!) };
}
