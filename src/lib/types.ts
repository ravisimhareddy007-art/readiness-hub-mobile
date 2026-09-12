import type { WrappedKey } from "./crypto";

export type Category = "Identity" | "Employment" | "Finance" | "Insurance" | "Property" | "Medical";
export type MedType = "prescription" | "lab_report" | "discharge" | "bill" | "scan" | "other";
export type Access = "Owner" | "Full member" | "Emergency access" | "View only";

export interface Member {
  id: string;
  name: string;
  relation: string;
  color: string;
  dob?: string;
  bloodGroup?: string;
  access?: Access;
  publicJwk?: JsonWebKey;
}
export interface Doc {
  id: string;
  name: string;
  category: Category;
  docType: string;
  medType?: MedType;
  source: "Upload" | "Email" | "Drive" | "DigiLocker";
  mime: string;
  sizeKB: number;
  addedAt: string;
  docDate?: string;
  expiry?: string;
  memberId?: string;
  fileKey: string;
  iv?: string;
  wrappedKeys?: Record<string, WrappedKey>;
  enc?: boolean;
  notes?: string;
  value?: number; // for Wealth (documented asset value)
  nominee?: boolean; // for Wealth (nominee designated?)
}
export interface LabLog {
  id: string;
  memberId: string;
  metric: string;
  value: number;
  value2?: number;
  unit: string;
  date: string;
}
export interface Medication {
  id: string;
  memberId: string;
  name: string;
  dose: string;
  freq: string;
  refillBy: string;
  remaining?: number;
  taken?: string[];
}
export type ReminderKind = "appointment" | "refill" | "vaccination" | "insurance" | "other";
export interface Reminder {
  id: string;
  memberId: string;
  title: string;
  kind: ReminderKind;
  due: string;
  done: boolean;
}

export interface Transaction {
  id: string;
  memberId?: string;
  purpose: string; // "Advance to contractor", "LIC premium paid"
  counterparty?: string; // person/institution on the other side
  direction: "paid" | "received";
  amount: number;
  date: string; // ISO date of the transaction
  docId?: string; // evidence (screenshot/receipt) stored as a Doc — single source of truth
  followUpOn?: string; // ISO date to follow up
  followUpNote?: string; // "check if cheque cleared"
  followUpDone?: boolean;
  addedAt: string;
}

export type HoldingKind = "asset" | "liability" | "cover";
export interface Holding {
  id: string;
  memberId?: string;
  name: string; // "Investment portfolio"
  kind: HoldingKind;
  type: string; // "Mutual funds", "Home loan", "Life insurance", "Property"
  institution?: string; // "Beacon Wealth"
  accountRef?: string; // masked, "\u20224821"
  value?: number; // documented value (asset), outstanding (liability), or cover (cover)
  nominee?: boolean; // beneficiary named
  nomineeName?: string;
  renewalDate?: string; // ISO, for policies
  maturityDate?: string; // ISO, for deposits/retirement instruments
  accessNote?: string; // how/where to access or claim — the thing families actually lack
  docId?: string; // linked document
  notes?: string;
}

export interface CustomPack {
  id: string;
  name: string;
  desc?: string; // the user's description that generated it
  reqs: string[];
  createdAt: string;
}

export type HandoffReason =
  | "Medical emergency"
  | "Travel emergency"
  | "Death of a family member"
  | "Temporary incapacity";
export interface Handoff {
  releasedAt: string; // ISO
  recipients: string[]; // member ids with access granted
  reason: HandoffReason;
}
