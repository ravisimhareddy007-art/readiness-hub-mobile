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
import { getDecrypted, putEncrypted } from "./secure-idb";
import { myPublicKey } from "./vault";
import { ensureVaultReady } from "./session";
import type { DocCrypto } from "./vault";

const LS = "lifepack.v3"; // bumped: enriched seeds (fresh state on upgrade)
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
}

/* ── members (enterprise-neutral) ── */
const seedMembers: Member[] = [
  {
    id: "you",
    name: "Alex Morgan",
    relation: "Self",
    color: "#5B8DEF",
    dob: "1985-06-14",
    bloodGroup: "O+",
    access: "Owner",
  },
  {
    id: "spouse",
    name: "Jordan Morgan",
    relation: "Spouse",
    color: "#9B7BE8",
    dob: "1987-02-09",
    bloodGroup: "A+",
    access: "Full member",
  },
  {
    id: "father",
    name: "Richard Morgan",
    relation: "Father",
    color: "#4FCB95",
    dob: "1954-05-12",
    bloodGroup: "B+",
    access: "Emergency access",
  },
  {
    id: "mother",
    name: "Diane Morgan",
    relation: "Mother",
    color: "#E86A9B",
    dob: "1957-09-02",
    bloodGroup: "O+",
    access: "Emergency access",
  },
  {
    id: "son",
    name: "Ethan Morgan",
    relation: "Son",
    color: "#D9B86A",
    dob: "2015-11-05",
    bloodGroup: "O+",
    access: "View only",
  },
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
  doc("Passport_Z4732911_AlexMorgan", "Identity", "Passport", { source: "DigiLocker", expiry: rel(264) }),
  doc("Aadhaar_XXXX-XXXX-4821_AlexMorgan", "Identity", "Aadhaar Card", { source: "DigiLocker" }),
  doc("PAN_AZKPM4821L_AlexMorgan", "Identity", "PAN Card", { source: "DigiLocker" }),
  doc("DrivingLicence_KA05-2019-0031847", "Identity", "Driving License", { source: "DigiLocker", expiry: rel(147) }),
  doc("OfferLetter_SeniorEngineer_Jan2024", "Employment", "Employment Offer", { source: "Email" }),
  doc("SalarySlip_Jun2026", "Employment", "Payslip", { source: "Email", docDate: iso(-20) }),
  doc("ITR-V_Acknowledgement_AY2025-26", "Finance", "ITR Acknowledgement", { source: "Drive" }),
  doc("MeridianBank_Statement_Jan-Jun2026", "Finance", "Bank Statement", { source: "Email", docDate: iso(-24) }),
  doc("BeaconWealth_HoldingStatement_Jun2026", "Finance", "Investment Statement", {
    source: "Drive",
    value: 4200000,
    nominee: true,
  }),
  doc("AegisHealth_FamilyFloater_Policy_88231", "Insurance", "Health Insurance", {
    source: "Email",
    expiry: rel(230),
    nominee: true,
  }),
  doc("AegisLife_TermPolicy_5567", "Insurance", "Life Insurance", { source: "Drive", value: 10000000, nominee: false }),
  doc("MotorPolicy_KA05MJ4412_2026", "Insurance", "Auto Insurance", { source: "Email", expiry: rel(40) }),
  doc("SaleDeed_Reg4417-2019_LakeviewApts", "Property", "Property Deed", {
    source: "Drive",
    value: 18500000,
    nominee: true,
  }),
  doc("PropertyTax_Receipt_FY2026-27", "Property", "Property Tax", { source: "Upload" }),
  doc("UPI_Screenshot_Rohan_5000", "Finance", "Transaction Evidence", { source: "Upload", docDate: iso(-4) }),
  doc("Prescription_DrBennett_Metformin_Jul2026", "Medical", "Prescription", {
    source: "Upload",
    memberId: "father",
    medType: "prescription",
    docDate: iso(-8),
  }),
  doc("LabReport_HbA1c_FastingGlucose_Jul2026", "Medical", "Lab Report", {
    source: "Upload",
    memberId: "father",
    medType: "lab_report",
    docDate: iso(-8),
  }),
  doc("Prescription_Levothyroxine_Jun2026", "Medical", "Prescription", {
    source: "Upload",
    memberId: "mother",
    medType: "prescription",
    docDate: iso(-30),
  }),
  doc("LabReport_ThyroidPanel_Jun2026", "Medical", "Lab Report", {
    source: "Upload",
    memberId: "mother",
    medType: "lab_report",
    docDate: iso(-30),
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
    institution: "Meridian Bank",
    accountRef: "•4821",
    value: 240000,
    nominee: true,
    nomineeName: "Jordan Morgan",
    accessNote:
      "Jordan is joint holder. Netbanking ID saved under 'Meridian' in the password manager. Branch: MG Road (Mr. Srinivas, relationship manager).",
    docId: dId("Bank Statement"),
  },
  {
    id: id(),
    memberId: "you",
    name: "Fixed deposit",
    kind: "asset",
    type: "Fixed deposit",
    institution: "Meridian Bank",
    accountRef: "•6630",
    value: 500000,
    nominee: true,
    nomineeName: "Jordan Morgan",
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
    institution: "Beacon Wealth",
    accountRef: "•2093",
    value: 4200000,
    nominee: true,
    nomineeName: "Jordan Morgan",
    docId: dId("Investment Statement"),
  },
  {
    id: id(),
    memberId: "you",
    name: "Gold in bank locker",
    kind: "asset",
    type: "Gold",
    institution: "Meridian Bank",
    accountRef: "Locker 114",
    value: 850000,
    nominee: true,
    nomineeName: "Jordan Morgan",
    accessNote:
      "Locker 114, MG Road branch. Keys in the bedroom safe. Jordan already has operating mandate; carry Aadhaar for access.",
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
    nomineeName: "Jordan Morgan",
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
    nomineeName: "Jordan Morgan",
    accessNote:
      "Original sale deed and khata in locker 114, Meridian MG Road. Society office: Mr. Rao, Lakeview Apts. Property tax paid online, receipts in this archive.",
    docId: dId("Property Deed"),
  },
  {
    id: id(),
    memberId: "you",
    name: "Home loan",
    kind: "liability",
    type: "Mortgage",
    institution: "Meridian Bank",
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
    institution: "Meridian Bank",
    accountRef: "•8842",
    value: 410000,
  },
  {
    id: id(),
    memberId: "you",
    name: "Term life insurance",
    kind: "cover",
    type: "Life insurance",
    institution: "Aegis Life",
    accountRef: "Policy 5567",
    value: 10000000,
    nominee: true,
    nomineeName: "Jordan Morgan",
    renewalDate: rel(210),
    accessNote:
      "Agent: R. Iyer, 98400-22110. Claim online on the Aegis portal with policy 5567 and death certificate. Premium autopays from savings •4821 each July.",
    docId: dId("Life Insurance"),
  },
  {
    id: id(),
    memberId: "you",
    name: "Health insurance (family floater)",
    kind: "cover",
    type: "Health insurance",
    institution: "Aegis Health",
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
const L = (memberId: string, metric: string, value: number, unit: string, date: string, value2?: number): LabLog => ({
  id: id(),
  memberId,
  metric,
  value,
  value2,
  unit,
  date,
});
const seedLabs: LabLog[] = [
  L("you", "LDL", 118, "mg/dL", "2026-05-02"),
  L("you", "Blood Pressure", 122, "mmHg", "2026-05-02", 80),
  L("you", "HbA1c", 5.5, "%", "2026-05-02"),
  L("spouse", "Blood Pressure", 118, "mmHg", "2026-04-18", 76),
  L("father", "HbA1c", 6.6, "%", "2026-01-08"),
  L("father", "HbA1c", 6.9, "%", "2026-03-12"),
  L("father", "HbA1c", 7.2, "%", "2026-06-10"),
  L("father", "LDL", 132, "mg/dL", "2026-01-08"),
  L("father", "LDL", 124, "mg/dL", "2026-05-02"),
  L("father", "LDL", 119, "mg/dL", "2026-06-10"),
  L("father", "Blood Pressure", 138, "mmHg", "2026-01-08", 86),
  L("father", "Blood Pressure", 132, "mmHg", "2026-03-12", 84),
  L("father", "Blood Pressure", 124, "mmHg", "2026-06-10", 82),
  L("mother", "TSH", 6.2, "mIU/L", "2026-01-15"),
  L("mother", "TSH", 4.8, "mIU/L", "2026-03-20"),
  L("mother", "TSH", 3.9, "mIU/L", "2026-05-20"),
  L("son", "Weight", 28, "kg", "2026-02-01"),
  L("son", "Weight", 30, "kg", "2026-05-01"),
];
const seedMeds: Medication[] = [
  {
    id: id(),
    memberId: "father",
    name: "Metformin",
    dose: "500 mg",
    freq: "Twice daily",
    refillBy: rel(4),
    remaining: 9,
    taken: [rel(-2), rel(-1)],
  },
  {
    id: id(),
    memberId: "father",
    name: "Telmisartan",
    dose: "40 mg",
    freq: "Once daily",
    refillBy: rel(19),
    remaining: 24,
    taken: [rel(-2), rel(0)],
  },
  {
    id: id(),
    memberId: "father",
    name: "Atorvastatin",
    dose: "10 mg",
    freq: "Once at night",
    refillBy: rel(19),
    remaining: 24,
    taken: [rel(-1)],
  },
  {
    id: id(),
    memberId: "mother",
    name: "Levothyroxine",
    dose: "50 mcg",
    freq: "Once, empty stomach",
    refillBy: rel(9),
    remaining: 12,
    taken: [rel(-1), rel(0)],
  },
];
const seedReminders: Reminder[] = [
  { id: id(), memberId: "father", title: "Metformin refill", kind: "refill", due: rel(4), done: false },
  { id: id(), memberId: "father", title: "Endocrinology follow-up", kind: "appointment", due: rel(12), done: false },
  { id: id(), memberId: "father", title: "Health insurance renewal", kind: "insurance", due: rel(21), done: false },
  { id: id(), memberId: "mother", title: "TSH recheck", kind: "appointment", due: rel(40), done: false },
  { id: id(), memberId: "mother", title: "Levothyroxine refill", kind: "refill", due: rel(9), done: false },
  { id: id(), memberId: "you", title: "Annual health checkup", kind: "appointment", due: rel(70), done: false },
  { id: id(), memberId: "son", title: "MMR booster due", kind: "vaccination", due: rel(15), done: false },
  { id: id(), memberId: "son", title: "Pediatric dental checkup", kind: "appointment", due: rel(33), done: false },
];
const seedCare: Record<string, CareProfile> = {
  you: {
    conditions: [],
    medications: [],
    allergies: "Penicillin",
    doctor: "Dr. Reyes, Family Medicine",
    emergency: "Jordan Morgan (spouse)",
  },
  spouse: {
    conditions: [],
    medications: [],
    allergies: "None recorded",
    doctor: "Dr. Osei, Internal Medicine",
    emergency: "Alex Morgan (spouse)",
  },
  father: {
    conditions: ["Type 2 Diabetes", "Hypertension"],
    medications: [],
    allergies: "Sulfonamides",
    doctor: "Dr. Bennett, Endocrinology",
    emergency: "Alex Morgan (son)",
  },
  mother: {
    conditions: ["Hypothyroidism"],
    medications: [],
    allergies: "None recorded",
    doctor: "Dr. Carter, Internal Medicine",
    emergency: "Alex Morgan (son)",
  },
  son: {
    conditions: [],
    medications: [],
    allergies: "Peanuts",
    doctor: "Dr. Lin, Pediatrics",
    emergency: "Alex Morgan (father)",
  },
};

const emptyOwner: Member = { id: "you", name: "You", relation: "Self", color: "#5B8DEF", access: "Owner" };
const EMPTY: Omit<State, "theme" | "notifications" | "onboarded" | "dataMode" | "currency"> = {
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
const SAMPLE: Omit<State, "theme" | "notifications" | "onboarded" | "dataMode" | "currency"> = {
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
};
// user-scoped bundles preserved across a mode switch (so switching back is instant and lossless)
type Bundle = Omit<State, "theme" | "notifications" | "onboarded" | "dataMode" | "currency">;
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
const LS_SAVED = "lifepack.v3.saved"; // { sample?: Bundle, empty?: Bundle }
function loadSaved(): { sample?: Bundle; empty?: Bundle } {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LS_SAVED) || "{}");
  } catch {
    return {};
  }
}
function saveSaved(v: { sample?: Bundle; empty?: Bundle }) {
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
const MED_PRIORITY: Record<string, number> = { prescription: 0, lab_report: 1, discharge: 2, scan: 3, other: 4 };
/* What a visit is being prepared for: a doctor, a hospital, a specialisation, or everything recent.
   Built from what the records themselves name, so the list is the family's own history, not a guess. */
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

/* Which records travel to a visit. Matching is on what each record names: the doctor who wrote it,
   the hospital it came from, the specialisation printed on it. Recent prescriptions, lab reports and
   the health insurance policy always travel, because a consultation stalls without them. */
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
    state = { ...state, docs: state.docs.filter((x) => x.id !== docId) };
    persist();
  }, []);
  const addMember = useCallback((mem: Member) => {
    state = { ...state, members: [...state.members, mem] };
    persist();
  }, []);
  const updateMember = useCallback((mid: string, patch: Partial<Member>) => {
    state = { ...state, members: state.members.map((mm) => (mm.id === mid ? { ...mm, ...patch } : mm)) };
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
  const refillMed = useCallback((mid: string, days = 30, count = 30) => {
    state = {
      ...state,
      meds: state.meds.map((x) => (x.id === mid ? { ...x, refillBy: rel(days), remaining: count } : x)),
    };
    persist();
  }, []);
  const markTaken = useCallback((mid: string, date = rel(0)) => {
    state = {
      ...state,
      meds: state.meds.map((x) => {
        if (x.id !== mid) return x;
        const taken = x.taken || [];
        if (taken.includes(date)) return x;
        return {
          ...x,
          taken: [...taken, date],
          remaining: typeof x.remaining === "number" ? Math.max(0, x.remaining - 1) : x.remaining,
        };
      }),
    };
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
    addLab,
    updateCare,
    addMed,
    removeMed,
    refillMed,
    markTaken,
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
