import { useState, useMemo, useRef, useEffect } from "react";
import type { ReactNode, CSSProperties } from "react";
import {
  LayoutGrid,
  Plane,
  FolderOpen,
  HeartPulse,
  Users,
  Wallet,
  KeyRound,
  ShieldCheck,
  Landmark,
  Car,
  FileText,
  Home as HomeIcon,
  Fingerprint,
  Briefcase,
  Shield,
  Search,
  Download,
  Plus,
  ArrowRight,
  Check,
  X,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  UploadCloud,
  Lock,
  Bell,
  RotateCcw,
  Camera,
  Image as ImageIcon,
  Stethoscope,
  Printer,
  Pencil,
  Coins,
  Trash2,
  Receipt,
  Paperclip,
  Siren,
  ChevronsLeft,
  ChevronsRight,
  GraduationCap,
  IdCard,
  Settings as SettingsIcon,
  LogOut,
  SlidersHorizontal,
  Bell as BellIcon,
  Sun,
  Moon,
  MessageSquare,
  HelpCircle,
  Info,
  Sparkles,
  HardDrive,
  RefreshCw,
  Baby,
  Gem,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Category, Doc, Member, Access, Holding, Transaction, Reminder } from "@/lib/types";
import Healthcare from "@/components/Healthcare";
import { buildZip } from "@/lib/zip";
import { getSession, signup, login, logout, deleteAccount, updateAccountName, type Account } from "@/lib/auth";
import { ensureVaultReady } from "@/lib/session";
import DocViewer from "@/components/DocViewer";
import { getPackRequirements } from "@/lib/requirements";
import { BrandMark, BrandWordmark } from "./components/BrandLogo";
import { useIsMobile } from "@/hooks/use-mobile";

/* ── theme ── */
const T = {
  navy: "#0B1220",
  panel: "#131C2E",
  raised: "#1B2740",
  border: "#27324A",
  gold: "#D9B86A",
  goldBright: "#ECCB82",
  mint: "#4FCB95",
  coral: "#E8736A",
  text: "#E6EBF5",
  muted: "#8A97AE",
  faint: "#5C6B80",
  white: "#FFFFFF",
};
const A = { blue: "#5B8DEF", purple: "#9B7BE8", teal: "#3FB9C7", pink: "#E86A9B", green: "#4FCB95", gold: "#D9B86A" };

const APPCSS = `
.lp-main{flex:1;min-width:0;padding:24px 34px 40px;max-width:1160px;margin:0 auto;width:100%}
.lp-cols2{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px;align-items:start}
.lp-hero2{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(250px,1fr);gap:14px}
@media(max-width:1020px){.lp-cols2{grid-template-columns:minmax(0,1fr)}}
@media(max-width:880px){.lp-hero2{grid-template-columns:minmax(0,1fr)}}
@media(max-width:760px){.lp-main{padding:16px 14px 30px}}
.lp-tabbar{position:fixed;left:0;right:0;bottom:0;z-index:60;display:none;grid-template-columns:repeat(5,1fr);gap:0;background:rgba(11,18,32,.96);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-top:1px solid #27324A;padding:6px 8px calc(6px + env(safe-area-inset-bottom))}
.lp-tab{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:48px;background:none;border:none;border-radius:12px;font-size:10px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent}
.lp-scrim{position:fixed;inset:0;z-index:65;background:rgba(4,8,16,.55)}
.lp-sheet{position:fixed;left:0;right:0;bottom:0;z-index:70;background:#131C2E;border-top:1px solid #27324A;border-radius:18px 18px 0 0;padding:8px 14px calc(16px + env(safe-area-inset-bottom));animation:lp-sheet-up .22s ease}
.lp-sheet-grab{width:36px;height:4px;border-radius:2px;background:#27324A;margin:4px auto 10px}
.lp-sheet-item{display:flex;align-items:center;gap:13px;width:100%;min-height:50px;padding:0 10px;background:none;border:none;border-radius:12px;color:#E6EBF5;font-size:15px;font-weight:600;cursor:pointer;text-align:left;-webkit-tap-highlight-color:transparent}
.lp-sheet-item:active{background:#1B2740}
@keyframes lp-sheet-up{from{transform:translateY(24px);opacity:.4}to{transform:translateY(0);opacity:1}}
.lp-dc-meta{display:contents}
.lp-mh-rail{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;justify-items:center;padding:6px 0 12px}
.lp-mh-mod{display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:none;cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent}
.lp-mh-modlbl{font-size:10.5px;font-weight:600;color:#8A97AE}
.lp-mh-insrail{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 8px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.lp-mh-insrail::-webkit-scrollbar{display:none}
.lp-fab{position:fixed;right:16px;bottom:calc(94px + env(safe-area-inset-bottom));z-index:55;width:56px;height:56px;border-radius:18px;border:none;display:grid;place-items:center;background:linear-gradient(135deg,#D9B86A,#ECCB82);box-shadow:0 12px 32px rgba(217,184,106,.35);cursor:pointer}
@media(max-width:767px){
.lp-tabbar{display:grid}
.lp-main{padding:14px 14px calc(86px + env(safe-area-inset-bottom));max-width:100%;overflow-x:clip}
input,select,textarea{font-size:16px !important}
.lp-main h1{font-size:20px !important}
.lp-sh-sub{display:none !important}
.lp-cardpad{padding:14px !important}
.lp-chiprail{display:flex;gap:8px;overflow-x:auto;flex-wrap:nowrap !important;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding-bottom:4px}
.lp-chiprail::-webkit-scrollbar{display:none}
.lp-act{flex-wrap:wrap;row-gap:2px}
.lp-act-label{flex:1 1 100% !important;order:9;white-space:normal !important;overflow:visible !important;text-overflow:clip !important;padding-left:19px;line-height:1.45}
.lp-act-when{margin-left:auto}
.lp-doc-min{min-width:0 !important}
.lp-doc-head{display:none !important}
.lp-doc-row{grid-template-columns:26px minmax(0,1fr) 18px !important;row-gap:8px !important}
.lp-dc-meta{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;grid-column:2/4;min-width:0}
.lp-pm-name{display:none !important}
.lp-wrow{flex-wrap:wrap;row-gap:8px}
.lp-wname{min-width:56% !important}
.lp-wamt{order:2;margin-left:48px}
.lp-wrow > select{order:2;margin-left:48px}
.lp-upmenu{left:0 !important;right:auto !important}
.lp-searchdrop{left:0 !important;right:auto !important;width:calc(100vw - 28px) !important}
.lp-wchips{order:3;flex-wrap:wrap;justify-content:flex-end;margin-left:auto;min-width:0}
.lp-wrow > button{order:3}
}
`;
/* ── helpers ── */
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};
// SSR-safe: server and client can be in different hours, so resolve after hydration.
const useGreeting = () => {
  const [g, setG] = useState("Welcome");
  useEffect(() => { setG(greeting()); }, []);
  return g;
};
const fmtDays = (expiry?: string) => {
  if (!expiry) return "-";
  const d = Math.ceil((+new Date(expiry) - Date.now()) / 86400000);
  return d < 0 ? "expired" : `${d} days`;
};
const daysTo = (s: string) => Math.ceil((+new Date(s) - Date.now()) / 86400000);
const money = (v: number) =>
  v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v}`;
const toneFor = (n: number) => (n >= 90 ? T.mint : n >= 70 ? T.gold : T.coral);

const CAT_META: Record<Category, { icon: any; color: string }> = {
  Identity: { icon: Fingerprint, color: A.blue },
  Employment: { icon: Briefcase, color: A.purple },
  Finance: { icon: Landmark, color: A.gold },
  Insurance: { icon: Shield, color: A.teal },
  Property: { icon: HomeIcon, color: A.pink },
  Medical: { icon: HeartPulse, color: A.green },
};

/* ── life-event packages ── */
/* ── document ontology: capability requirements and the real documents that satisfy them.
   This is the single matching truth — evalEvent, the drawer, exports, and dashboard insights all use it,
   so a requirement can never read "available" in one pack and "missing" in another. ── */
const SATISFIES: Record<string, string[]> = {
  "Identity Proof": ["Aadhaar Card", "PAN Card", "Passport", "Voter ID", "Driving License"],
  "Address Proof": [
    "Aadhaar Card",
    "Passport",
    "Utility Bill",
    "Rental Agreement",
    "Voter ID",
    "Driving License",
    "Bank Statement",
  ],
  "Date of Birth Proof": ["Birth Certificate", "Aadhaar Card", "Passport", "PAN Card"],
  "Photo ID": ["Aadhaar Card", "Passport", "PAN Card", "Driving License", "Voter ID"],
  "Income Proof": ["Payslip", "Form 16", "ITR Acknowledgement", "Salary Certificate"],
  "Employment Proof": ["Employment Offer", "Salary Certificate", "Payslip"],
  "Proof of Funds": ["Bank Statement", "Investment Statement"],
  "Accommodation Proof": ["Hotel Booking", "Rental Agreement", "Invitation Letter"],
  "Travel Itinerary": ["Flight Reservation"],
  "Property Ownership Proof": ["Property Deed", "Sale Agreement"],
};
const satisfies = (req: string, have: Set<string>): string | null => {
  if (have.has(req)) return req;
  for (const t of SATISFIES[req] || []) if (have.has(t)) return t;
  return null;
};
const satisfyingDoc = (req: string, docs: Doc[]): Doc | undefined => {
  const direct = docs.find((d) => d.docType === req);
  if (direct) return direct;
  for (const t of SATISFIES[req] || []) {
    const d = docs.find((x) => x.docType === t);
    if (d) return d;
  }
  return undefined;
};
/* ── curated catalog: the documented life of an educated adult, 100 high-frequency situations ── */
const PACK_CAT_META: Record<string, { color: string; icon: any; source: string }> = {
  "Travel & Immigration": { color: A.blue, icon: Plane, source: "Official published requirements" },
  "Identity & Civic": { color: A.teal, icon: IdCard, source: "Official published requirements" },
  "Money & Tax": { color: A.green, icon: Landmark, source: "Published lender and tax checklists" },
  "Jobs & Employment": { color: A.purple, icon: Briefcase, source: "Published employer checklists" },
  Education: { color: A.gold, icon: GraduationCap, source: "Published institution checklists" },
  Health: { color: A.pink, icon: HeartPulse, source: "Published insurer and hospital checklists" },
  "Home & Property": { color: A.blue, icon: HomeIcon, source: "Published registrar and lender checklists" },
  "Family & Life": { color: A.purple, icon: Users, source: "Official published requirements" },
};
const P = (
  id: string,
  cat: string,
  name: string,
  blurb: string,
  reqs: string[],
  conditional?: string[],
  icon?: any,
  source?: string,
) => ({
  id,
  name,
  blurb,
  cat,
  reqs,
  conditional,
  accent: PACK_CAT_META[cat].color,
  icon: icon || PACK_CAT_META[cat].icon,
  source: source || PACK_CAT_META[cat].source,
  lastChecked: "Jul 25, 2026",
});
const EVENTS = [
  /* Travel & Immigration (12) — flagship visas verified against published consular checklists */
  P(
    "schengen",
    "Travel & Immigration",
    "Schengen visa",
    "Short-stay tourist, Europe",
    [
      "Passport",
      "Visa Application Form",
      "Passport Photos",
      "Travel Insurance",
      "Flight Reservation",
      "Accommodation Proof",
      "Proof of Funds",
      "Employment Proof",
      "ITR Acknowledgement",
      "Payslip",
    ],
    ["ITR Acknowledgement"],
    undefined,
    "EU Visa Code (Reg. 810/2009) via VFS consular checklists",
  ),
  P(
    "us",
    "Travel & Immigration",
    "US B1/B2 visa",
    "Business or tourist",
    [
      "Passport",
      "DS-160 Confirmation",
      "Passport Photos",
      "Interview Appointment Letter",
      "Proof of Funds",
      "Employment Proof",
      "ITR Acknowledgement",
    ],
    ["ITR Acknowledgement"],
    undefined,
    "US Dept. of State visitor visa requirements",
  ),
  P(
    "uk",
    "Travel & Immigration",
    "UK visa",
    "Standard visitor",
    [
      "Passport",
      "Visa Application Form",
      "Bank Statement",
      "Employment Proof",
      "Payslip",
      "Accommodation Proof",
      "Travel Itinerary",
    ],
    ["Accommodation Proof"],
    undefined,
    "UK Home Office standard visitor guidance",
  ),
  P(
    "canada",
    "Travel & Immigration",
    "Canada visa",
    "Visitor visa",
    [
      "Passport",
      "Proof of Funds",
      "ITR Acknowledgement",
      "Employment Proof",
      "Invitation Letter",
      "Biometrics Confirmation",
    ],
    ["Invitation Letter"],
    undefined,
    "IRCC visitor visa document checklist",
  ),
  P(
    "australia",
    "Travel & Immigration",
    "Australia visitor visa",
    "Subclass 600",
    ["Passport", "Proof of Funds", "Payslip", "Employment Proof", "Travel Itinerary"],
    ["Invitation Letter"],
    undefined,
    "Dept. of Home Affairs subclass 600 checklist",
  ),
  P(
    "japan",
    "Travel & Immigration",
    "Japan tourist visa",
    "Short stay",
    [
      "Passport",
      "Visa Application Form",
      "Passport Photos",
      "Bank Statement",
      "Flight Reservation",
      "Travel Itinerary",
    ],
    undefined,
    undefined,
    "Embassy of Japan published checklist",
  ),
  P(
    "singapore",
    "Travel & Immigration",
    "Singapore visa",
    "Tourist entry",
    ["Passport", "Visa Application Form", "Passport Photos", "Proof of Funds"],
    ["Invitation Letter"],
    undefined,
    "ICA Singapore authorized-agent checklist",
  ),
  P(
    "uae",
    "Travel & Immigration",
    "UAE visit visa",
    "Tourist or family visit",
    ["Passport", "Passport Photos", "Flight Reservation", "Hotel Booking", "Bank Statement"],
    undefined,
    undefined,
    "UAE ICP / airline visa-desk checklists",
  ),
  P(
    "h1b-stamp",
    "Travel & Immigration",
    "US H-1B stamping",
    "Work visa interview",
    [
      "Passport",
      "DS-160 Confirmation",
      "Approval Notice",
      "Employment Offer",
      "Payslip",
      "ITR Acknowledgement",
      "Degree Certificate",
    ],
    undefined,
    undefined,
    "US Dept. of State petition-based visa checklist",
  ),
  P(
    "f1-visa",
    "Travel & Immigration",
    "US F-1 student visa",
    "Study in the US",
    [
      "Passport",
      "DS-160 Confirmation",
      "I-20 Form",
      "Admission Letter",
      "Proof of Funds",
      "Language Test Scorecard",
      "Degree Certificate",
    ],
    undefined,
    undefined,
    "US Dept. of State student visa checklist",
  ),
  P(
    "travel-ins",
    "Travel & Immigration",
    "Travel insurance purchase",
    "Visa-compliant cover",
    ["Passport", "Identity Proof"],
    ["Flight Reservation"],
    undefined,
    "Insurer proposal requirements",
  ),
  P(
    "intl-dl",
    "Travel & Immigration",
    "International driving permit",
    "Drive abroad",
    ["Driving License", "Passport", "Passport Photos", "Address Proof"],
    undefined,
    Car,
    "RTO international driving permit checklist",
  ),
  /* Identity & Civic (14) — phrased exactly as government checklists phrase them */
  P(
    "lost-passport",
    "Identity & Civic",
    "Lost passport reissue",
    "Report and reissue",
    ["Police Complaint", "Identity Proof", "Address Proof", "Passport Photos", "Affidavit"],
    ["Passport"],
    undefined,
    "Passport Seva lost/damaged reissue (Annexure F)",
  ),
  P(
    "lost-pan",
    "Identity & Civic",
    "Lost PAN card reissue",
    "Reprint request",
    ["Identity Proof", "Address Proof", "Date of Birth Proof", "Passport Photos"],
    ["Police Complaint"],
    undefined,
    "Income Tax Dept. reprint request",
  ),
  P(
    "lost-aadhaar",
    "Identity & Civic",
    "Lost Aadhaar retrieval",
    "Retrieve and reprint",
    ["Identity Proof"],
    ["Enrolment Slip"],
    undefined,
    "UIDAI retrieval and reprint process",
  ),
  P(
    "lost-dl",
    "Identity & Civic",
    "Lost driving licence duplicate",
    "Duplicate DL (LLD)",
    ["Police Complaint", "Identity Proof", "Address Proof", "Passport Photos"],
    ["Driving License"],
    Car,
    "Parivahan duplicate licence (LLD) requirements",
  ),
  P(
    "ration-card",
    "Identity & Civic",
    "Ration card application",
    "State food supplies",
    ["Identity Proof", "Address Proof", "Income Certificate", "Passport Photos"],
    undefined,
    undefined,
    "State food & civil supplies requirements",
  ),
  P(
    "sim-kyc",
    "Identity & Civic",
    "Mobile SIM KYC",
    "New or replacement SIM",
    ["Identity Proof", "Address Proof", "Passport Photos"],
    undefined,
    undefined,
    "DoT customer acquisition (CAF) KYC rules",
  ),
  P(
    "disaster-relief",
    "Identity & Civic",
    "Disaster relief assistance",
    "When documents are lost too",
    ["Identity Proof", "Address Proof", "Bank Statement", "Passport Photos"],
    ["Property Ownership Proof", "Death Certificate"],
    undefined,
    "State revenue department relief (SDRF) norms",
  ),
  P(
    "passport-new",
    "Identity & Civic",
    "New passport",
    "First-time application",
    ["Identity Proof", "Address Proof", "Date of Birth Proof", "Passport Photos"],
    undefined,
    undefined,
    "Passport Seva (MEA) document advisor",
  ),
  P(
    "passport-renew",
    "Identity & Civic",
    "Passport renewal",
    "Reissue of passport",
    ["Passport", "Address Proof", "Passport Photos"],
    ["Date of Birth Proof"],
    undefined,
    "Passport Seva (MEA) reissue advisor",
  ),
  P(
    "minor-passport",
    "Identity & Civic",
    "Passport for a minor",
    "Child's first passport",
    ["Birth Certificate", "Identity Proof", "Address Proof", "Passport Photos", "Annexure D Declaration"],
    undefined,
    undefined,
    "Passport Seva (MEA) minor checklist",
  ),
  P(
    "tax-id",
    "Identity & Civic",
    "PAN card application",
    "Form 49A",
    ["Identity Proof", "Address Proof", "Date of Birth Proof", "Passport Photos"],
    undefined,
    undefined,
    "Income Tax Dept. Form 49A requirements",
  ),
  P(
    "id-update",
    "Identity & Civic",
    "Aadhaar update",
    "Name or address change",
    ["Aadhaar Card", "Address Proof"],
    ["Marriage Certificate"],
    undefined,
    "UIDAI update document list",
  ),
  P(
    "voter-id",
    "Identity & Civic",
    "Voter ID application",
    "Form 6 registration",
    ["Identity Proof", "Address Proof", "Date of Birth Proof", "Passport Photos"],
    undefined,
    undefined,
    "Election Commission Form 6 requirements",
  ),
  P(
    "dl-new",
    "Identity & Civic",
    "Driving license",
    "New license (Sarathi)",
    ["Identity Proof", "Address Proof", "Date of Birth Proof", "Passport Photos", "Medical Fitness Certificate"],
    ["Medical Fitness Certificate"],
    Car,
    "Parivahan Sarathi document list",
  ),
  P(
    "dl-renew",
    "Identity & Civic",
    "Driving license renewal",
    "Expiring license",
    ["Driving License", "Address Proof", "Passport Photos"],
    ["Medical Fitness Certificate"],
    Car,
    "Parivahan Sarathi renewal list",
  ),
  P(
    "vehicle-reg",
    "Identity & Civic",
    "Vehicle registration",
    "New vehicle (Form 20)",
    ["Sale Invoice", "Vehicle Insurance", "Identity Proof", "Address Proof"],
    ["PUC Certificate"],
    Car,
    "RTO Form 20 registration checklist",
  ),
  P(
    "vehicle-transfer",
    "Identity & Civic",
    "Vehicle ownership transfer",
    "Form 29/30",
    ["Vehicle RC", "Vehicle Insurance", "Identity Proof", "Address Proof"],
    ["NOC"],
    Car,
    "RTO Form 29/30 transfer checklist",
  ),
  P(
    "pcc",
    "Identity & Civic",
    "Police clearance certificate",
    "For jobs or visas",
    ["Passport", "Identity Proof", "Address Proof", "Passport Photos"],
    undefined,
    undefined,
    "Passport Seva PCC checklist",
  ),
  P(
    "name-change",
    "Identity & Civic",
    "Legal name change",
    "Gazette route",
    ["Affidavit", "Identity Proof", "Passport Photos", "Newspaper Publication"],
    undefined,
    undefined,
    "Dept. of Publication gazette procedure",
  ),
  P(
    "income-cert",
    "Identity & Civic",
    "Income certificate",
    "For schemes and fees",
    ["Identity Proof", "Address Proof", "Salary Certificate"],
    ["ITR Acknowledgement"],
    undefined,
    "State revenue department checklists",
  ),
  P(
    "domicile-cert",
    "Identity & Civic",
    "Domicile certificate",
    "State residency proof",
    ["Identity Proof", "Address Proof", "Date of Birth Proof"],
    ["Degree Certificate"],
    undefined,
    "State revenue department checklists",
  ),
  /* Money & Tax (14) — loans verified against SBI/HDFC published salaried checklists */
  P(
    "tax",
    "Money & Tax",
    "Income tax filing",
    "Annual return",
    ["PAN Card", "Form 16", "Bank Statement", "Investment Statement", "Payslip"],
    ["Investment Statement"],
    FileText,
    "Income Tax Dept. e-filing requirements",
  ),
  P(
    "carloan",
    "Money & Tax",
    "Car loan",
    "Vehicle finance",
    ["PAN Card", "Identity Proof", "Income Proof", "Bank Statement", "Auto Quotation"],
    undefined,
    Car,
    "Published lender checklists (salaried)",
  ),
  P(
    "personal-loan",
    "Money & Tax",
    "Personal loan",
    "Unsecured credit",
    ["PAN Card", "Identity Proof", "Address Proof", "Payslip", "Bank Statement"],
    undefined,
    undefined,
    "Published lender checklists (salaried)",
  ),
  P(
    "education-loan",
    "Money & Tax",
    "Education loan",
    "Study finance",
    ["Admission Letter", "PAN Card", "Identity Proof", "Proof of Funds", "Income Proof", "Marksheet"],
    ["Collateral Deed"],
    undefined,
    "Published lender education-loan checklists",
  ),
  P(
    "credit-card",
    "Money & Tax",
    "Credit card application",
    "New card",
    ["PAN Card", "Identity Proof", "Address Proof", "Income Proof"],
    undefined,
    undefined,
    "Published issuer checklists",
  ),
  P(
    "bank-account",
    "Money & Tax",
    "Bank account opening",
    "Savings or salary",
    ["Identity Proof", "Address Proof", "PAN Card", "Passport Photos"],
    undefined,
    undefined,
    "RBI KYC master direction",
  ),
  P(
    "demat",
    "Money & Tax",
    "Demat and trading account",
    "Invest in markets",
    ["PAN Card", "Identity Proof", "Bank Statement", "Cancelled Cheque", "Passport Photos"],
    undefined,
    undefined,
    "SEBI KYC requirements",
  ),
  P(
    "ppf",
    "Money & Tax",
    "PPF account opening",
    "Long-term savings",
    ["Identity Proof", "Address Proof", "Passport Photos", "Nominee Form"],
    undefined,
    undefined,
    "Post office / bank PPF checklists",
  ),
  P(
    "nps",
    "Money & Tax",
    "NPS account opening",
    "Retirement savings",
    ["PAN Card", "Identity Proof", "Address Proof", "Cancelled Cheque", "Nominee Form"],
    undefined,
    undefined,
    "PFRDA subscriber registration",
  ),
  P(
    "pf-transfer",
    "Money & Tax",
    "PF transfer on job change",
    "Form 13 online",
    ["Aadhaar Card", "PAN Card", "Bank Statement"],
    ["Relieving Letter"],
    undefined,
    "EPFO Form 13 transfer requirements",
  ),
  P(
    "mf-kyc",
    "Money & Tax",
    "Mutual fund KYC",
    "CKYC for investing",
    ["PAN Card", "Identity Proof", "Address Proof", "Passport Photos", "Cancelled Cheque"],
    undefined,
    undefined,
    "SEBI / KRA CKYC requirements",
  ),
  P(
    "epf-withdraw",
    "Money & Tax",
    "EPF withdrawal",
    "Form 19 / 10C claim",
    ["PAN Card", "Bank Statement", "Cancelled Cheque"],
    ["Relieving Letter"],
    undefined,
    "EPFO Form 19/10C requirements",
  ),
  P(
    "loan-closure",
    "Money & Tax",
    "Loan closure and lien release",
    "The NOC pack",
    ["Loan Statement", "Identity Proof", "NOC"],
    ["Property Deed"],
    undefined,
    "Published lender closure checklists",
  ),
  /* Jobs & Employment (12) */
  P(
    "bgv",
    "Jobs & Employment",
    "Background verification",
    "New job onboarding",
    ["Identity Proof", "Employment Offer", "Relieving Letter", "Payslip", "Degree Certificate"],
    ["ITR Acknowledgement"],
    ShieldCheck,
    "Published employer BGV checklists",
  ),
  P(
    "onboarding",
    "Jobs & Employment",
    "New job onboarding",
    "Day-one paperwork",
    ["Identity Proof", "PAN Card", "Degree Certificate", "Relieving Letter", "Cancelled Cheque", "Passport Photos"],
    undefined,
    undefined,
    "Published employer onboarding checklists",
  ),
  P(
    "govt-job",
    "Jobs & Employment",
    "Government job application",
    "Recruitment paperwork",
    ["Identity Proof", "Degree Certificate", "Marksheet", "Passport Photos"],
    ["Domicile Certificate", "Income Certificate"],
    undefined,
    "Recruitment notification requirements",
  ),
  P(
    "freelance-kyc",
    "Jobs & Employment",
    "Freelance client KYC",
    "Contractor onboarding",
    ["Identity Proof", "PAN Card", "Bank Statement"],
    ["GST Certificate"],
    undefined,
    "Standard client KYC requirements",
  ),
  P(
    "trademark",
    "Jobs & Employment",
    "Trademark registration",
    "Protect your brand",
    ["PAN Card", "Identity Proof", "Business Registration", "Trademark Artwork"],
    ["Udyam Certificate"],
    undefined,
    "IP India TM-A filing requirements",
  ),
  P(
    "incorporation",
    "Jobs & Employment",
    "Company incorporation",
    "SPICe+ filing",
    ["Identity Proof", "PAN Card", "Address Proof", "Passport Photos", "Utility Bill"],
    undefined,
    undefined,
    "MCA SPICe+ document requirements",
  ),
  P(
    "gst-reg",
    "Jobs & Employment",
    "GST registration",
    "Business tax ID",
    ["PAN Card", "Identity Proof", "Business Registration", "Bank Statement", "Utility Bill"],
    ["Rental Agreement"],
    undefined,
    "GSTN registration requirements",
  ),
  P(
    "udyam",
    "Jobs & Employment",
    "MSME registration",
    "Udyam portal",
    ["Aadhaar Card", "PAN Card", "Business Registration", "Bank Statement"],
    undefined,
    undefined,
    "Udyam registration requirements",
  ),
  P(
    "resignation",
    "Jobs & Employment",
    "Resignation and relieving",
    "Clean exit pack",
    ["Resignation Letter", "Employment Offer", "Payslip", "Experience Letter"],
    undefined,
    undefined,
    "Standard HR exit checklists",
  ),
  P(
    "prof-reg",
    "Jobs & Employment",
    "Professional council registration",
    "Doctors, CAs, lawyers",
    ["Degree Certificate", "Marksheet", "Identity Proof", "Passport Photos"],
    ["Internship Certificate"],
    undefined,
    "Professional council requirements",
  ),
  /* Education (12) */
  P(
    "school-adm",
    "Education",
    "School admission",
    "New school",
    ["Birth Certificate", "Passport Photos", "Address Proof", "Identity Proof", "Immunization Record"],
    ["Transfer Certificate"],
    undefined,
    "Published school admission checklists",
  ),
  P(
    "college-adm",
    "Education",
    "College admission",
    "Undergraduate",
    ["Marksheet", "Transfer Certificate", "Identity Proof", "Passport Photos"],
    ["Migration Certificate"],
    undefined,
    "University admission requirements",
  ),
  P(
    "pg-adm",
    "Education",
    "Postgraduate admission",
    "Masters programs",
    ["Degree Certificate", "Marksheet", "Identity Proof", "Passport Photos", "Scorecard"],
    undefined,
    undefined,
    "University admission requirements",
  ),
  P(
    "study-abroad",
    "Education",
    "Study abroad application",
    "University applications",
    [
      "Passport",
      "Degree Certificate",
      "Marksheet",
      "Language Test Scorecard",
      "Statement of Purpose",
      "Recommendation Letters",
      "Proof of Funds",
    ],
    undefined,
    undefined,
    "University international-office checklists",
  ),
  P(
    "comp-exam",
    "Education",
    "Competitive exam application",
    "UPSC, SSC, banking",
    ["Identity Proof", "Passport Photos", "Degree Certificate", "Marksheet"],
    ["Domicile Certificate"],
    undefined,
    "Exam notification requirements",
  ),
  P(
    "board-reg",
    "Education",
    "Board exam registration",
    "Class 10 and 12",
    ["Birth Certificate", "Passport Photos", "Identity Proof", "Marksheet"],
    undefined,
    undefined,
    "Board registration requirements",
  ),
  P(
    "scholarship",
    "Education",
    "Scholarship application",
    "Merit and means",
    ["Marksheet", "Income Certificate", "Identity Proof", "Bank Statement", "Admission Letter"],
    undefined,
    undefined,
    "NSP scholarship portal requirements",
  ),
  P(
    "school-transfer",
    "Education",
    "School transfer",
    "Moving cities",
    ["Transfer Certificate", "Marksheet", "Address Proof", "Birth Certificate"],
    undefined,
    undefined,
    "Published school admission checklists",
  ),
  P(
    "attestation",
    "Education",
    "Degree attestation",
    "ECA, WES, apostille",
    ["Degree Certificate", "Marksheet", "Passport", "Transcripts"],
    undefined,
    undefined,
    "WES/ECA and MEA apostille requirements",
  ),
  P(
    "dup-marksheet",
    "Education",
    "Duplicate marksheet reissue",
    "Lost certificates",
    ["Identity Proof", "Affidavit", "Passport Photos"],
    ["Police Complaint"],
    undefined,
    "Board/university reissue procedure",
  ),
  /* Health (11) — claims verified against the IRDAI Master Circular document set */
  P(
    "hospital",
    "Health",
    "Hospital admission",
    "Cashless pack",
    ["Health Insurance", "Photo ID", "Prescription", "Lab Report"],
    ["Discharge Summary"],
    undefined,
    "Insurer cashless admission checklists",
  ),
  P(
    "claim-reimb",
    "Health",
    "Health insurance reimbursement",
    "Claim after paying",
    [
      "Claim Form",
      "Health Insurance",
      "Discharge Summary",
      "Medical Bills",
      "Prescription",
      "Lab Report",
      "Photo ID",
      "Cancelled Cheque",
    ],
    undefined,
    undefined,
    "IRDAI Master Circular, 29 May 2024",
  ),
  P(
    "cashless-preauth",
    "Health",
    "Cashless pre-authorization",
    "Planned procedure",
    ["Health Insurance", "Photo ID", "Prescription", "Lab Report"],
    undefined,
    undefined,
    "Insurer pre-authorization checklists",
  ),
  P(
    "new-health-ins",
    "Health",
    "New health insurance",
    "Buying a policy",
    ["Identity Proof", "Address Proof", "Passport Photos"],
    ["Lab Report"],
    undefined,
    "Insurer proposal requirements",
  ),
  P(
    "maternity",
    "Health",
    "Maternity hospital pack",
    "Delivery admission",
    ["Health Insurance", "Photo ID", "Prescription", "Lab Report"],
    undefined,
    undefined,
    "Insurer maternity checklists",
  ),
  P(
    "vaccination",
    "Health",
    "Vaccination record pack",
    "School and travel",
    ["Immunization Record", "Birth Certificate", "Identity Proof"],
    undefined,
    undefined,
    "School and travel health requirements",
  ),
  P(
    "emp-med-reimb",
    "Health",
    "Employer medical reimbursement",
    "Company claims",
    ["Medical Bills", "Prescription", "Payslip"],
    undefined,
    undefined,
    "Employer reimbursement policies",
  ),
  P(
    "disability-cert",
    "Health",
    "Disability certificate",
    "UDID assessment",
    ["Identity Proof", "Lab Report", "Discharge Summary", "Passport Photos", "Address Proof"],
    undefined,
    undefined,
    "UDID portal requirements",
  ),
  P(
    "govt-health-card",
    "Health",
    "Government health card",
    "Public health schemes",
    ["Identity Proof", "Address Proof", "Income Certificate", "Passport Photos"],
    undefined,
    undefined,
    "Scheme enrollment requirements",
  ),
  /* Home & Property (13) — home loan verified against SBI/HDFC salaried checklists */
  P(
    "homeloan",
    "Home & Property",
    "Home loan",
    "Salaried application pack",
    [
      "PAN Card",
      "Identity Proof",
      "Address Proof",
      "Passport Photos",
      "Payslip",
      "Form 16",
      "Bank Statement",
      "Sale Agreement",
      "Property Ownership Proof",
    ],
    ["Approved Building Plan", "Property Valuation"],
    Landmark,
    "SBI / HDFC published salaried checklists",
  ),
  P(
    "property",
    "Home & Property",
    "Property sale",
    "Seller's pack",
    ["Property Deed", "Property Tax", "Identity Proof", "PAN Card", "Encumbrance Certificate"],
    ["Encumbrance Certificate"],
    undefined,
    "Sub-registrar published requirements",
  ),
  P(
    "property-buy",
    "Home & Property",
    "Property purchase",
    "Buyer's diligence",
    ["Sale Agreement", "Encumbrance Certificate", "Property Tax", "Identity Proof", "PAN Card", "Proof of Funds"],
    undefined,
    undefined,
    "Sub-registrar published requirements",
  ),
  P(
    "rent-tenant",
    "Home & Property",
    "Renting a home",
    "Tenant pack",
    ["Identity Proof", "Passport Photos", "Employment Proof", "Payslip", "Rental Agreement"],
    undefined,
    undefined,
    "Standard landlord requirements",
  ),
  P(
    "rent-landlord",
    "Home & Property",
    "Renting out property",
    "Landlord pack",
    ["Property Ownership Proof", "Property Tax", "Identity Proof", "Rental Agreement", "Utility Bill"],
    undefined,
    undefined,
    "Registration office requirements",
  ),
  P(
    "tenant-verify",
    "Home & Property",
    "Tenant police verification",
    "Mandatory in many cities",
    ["Rental Agreement", "Identity Proof", "Passport Photos"],
    undefined,
    undefined,
    "City police verification portals",
  ),
  P(
    "khata",
    "Home & Property",
    "Khata or mutation transfer",
    "Municipal records",
    ["Property Deed", "Property Tax", "Sale Agreement", "Identity Proof", "Encumbrance Certificate"],
    undefined,
    undefined,
    "Municipal revenue office checklists",
  ),
  P(
    "lpg",
    "Home & Property",
    "New LPG connection",
    "Cooking gas KYC",
    ["Identity Proof", "Address Proof", "Passport Photos"],
    ["Rental Agreement"],
    undefined,
    "Oil company (Indane/HP/Bharat) KYC requirements",
  ),
  P(
    "electricity",
    "Home & Property",
    "New electricity connection",
    "Meter in your name",
    ["Identity Proof", "Address Proof", "Passport Photos"],
    ["Property Ownership Proof", "Rental Agreement"],
    undefined,
    "Distribution company requirements",
  ),
  P(
    "home-ins",
    "Home & Property",
    "Home insurance purchase",
    "Structure and contents",
    ["Property Ownership Proof", "Identity Proof"],
    ["Property Valuation"],
    undefined,
    "Insurer proposal requirements",
  ),
  P(
    "society-noc",
    "Home & Property",
    "Society share transfer",
    "Apartment societies",
    ["Property Deed", "Sale Agreement", "Identity Proof", "NOC"],
    undefined,
    undefined,
    "Cooperative society bye-law requirements",
  ),
  /* Family & Life (12) */
  P(
    "marriage-reg",
    "Family & Life",
    "Marriage registration",
    "Certificate application",
    ["Identity Proof", "Address Proof", "Passport Photos", "Date of Birth Proof"],
    ["Marriage Invitation"],
    undefined,
    "Marriage registrar requirements",
  ),
  P(
    "death-cert",
    "Family & Life",
    "Death certificate application",
    "Municipal registration",
    ["Identity Proof", "Address Proof", "Hospital Death Report"],
    ["Affidavit"],
    undefined,
    "Municipal births & deaths registration",
  ),
  P(
    "adoption",
    "Family & Life",
    "Adoption process",
    "CARA registration",
    [
      "Identity Proof",
      "Address Proof",
      "Marriage Certificate",
      "Income Proof",
      "Medical Fitness Certificate",
      "Passport Photos",
    ],
    ["Birth Certificate"],
    undefined,
    "CARA prospective-parent requirements",
  ),
  P(
    "newborn",
    "Family & Life",
    "Newborn documentation",
    "First documents",
    ["Birth Certificate", "Identity Proof", "Marriage Certificate", "Address Proof"],
    undefined,
    undefined,
    "Municipal birth registration requirements",
  ),
  P(
    "add-family-ins",
    "Family & Life",
    "Add family member to insurance",
    "Spouse or child",
    ["Marriage Certificate", "Birth Certificate", "Identity Proof", "Health Insurance"],
    undefined,
    undefined,
    "Insurer endorsement requirements",
  ),
  P(
    "will-prep",
    "Family & Life",
    "Will preparation",
    "Document your wishes",
    ["Identity Proof", "Property Ownership Proof", "Investment Statement", "Bank Statement", "Nominee Form"],
    undefined,
    undefined,
    "Standard estate documentation practice",
  ),
  P(
    "nominee-update",
    "Family & Life",
    "Nominee updates",
    "After life changes",
    ["Nominee Form", "Identity Proof"],
    ["Marriage Certificate", "Birth Certificate"],
    undefined,
    "Institution nomination forms",
  ),
  P(
    "life-claim",
    "Family & Life",
    "Life insurance claim",
    "Beneficiary claim",
    ["Life Insurance", "Death Certificate", "Identity Proof", "Bank Statement", "Cancelled Cheque"],
    undefined,
    undefined,
    "Insurer claim requirements (IRDAI)",
  ),
  P(
    "death-settle",
    "Family & Life",
    "Settlements after a death",
    "Accounts and assets",
    ["Death Certificate", "Legal Heir Certificate", "Identity Proof", "Bank Statement", "Nominee Form"],
    undefined,
    undefined,
    "Bank deceased-claim procedures",
  ),
  P(
    "legal-heir",
    "Family & Life",
    "Legal heir certificate",
    "Establish heirship",
    ["Death Certificate", "Identity Proof", "Address Proof", "Affidavit"],
    undefined,
    undefined,
    "Tahsildar office requirements",
  ),
  P(
    "succession",
    "Family & Life",
    "Succession certificate",
    "Court process pack",
    ["Death Certificate", "Legal Heir Certificate"],
    ["Property Deed", "Investment Statement"],
    undefined,
    "Civil court filing requirements",
  ),
  P(
    "pension",
    "Family & Life",
    "Pension application",
    "Retirement begins",
    ["Identity Proof", "Bank Statement", "Passport Photos", "Relieving Letter", "Pension Order"],
    undefined,
    undefined,
    "Pension disbursing authority checklists",
  ),
  P(
    "family-pension",
    "Family & Life",
    "Family pension claim",
    "Survivor benefits",
    ["Death Certificate", "Pension Order", "Identity Proof", "Bank Statement", "Marriage Certificate"],
    undefined,
    undefined,
    "Pension disbursing authority checklists",
  ),
  P(
    "senior-card",
    "Family & Life",
    "Senior citizen card",
    "Age-based benefits",
    ["Identity Proof", "Date of Birth Proof", "Address Proof", "Passport Photos"],
    undefined,
    undefined,
    "State social welfare requirements",
  ),
];
const DOC_VOCAB = [...new Set(EVENTS.flatMap((e) => e.reqs))].sort();
const evalEvent = (ev: { reqs: string[] }, have: Set<string>) => {
  const rows = ev.reqs.map((r) => {
    const via = satisfies(r, have);
    return { label: r, have: !!via, via };
  });
  const got = rows.filter((r) => r.have).length;
  return { rows, got, total: rows.length, score: Math.round((got / rows.length) * 100) };
};

/* ── primitives ── */
function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const hasPad = style && "padding" in style;
  return (
    <div
      className={hasPad ? "lp-card" : "lp-card lp-cardpad"}
      style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, ...style }}
    >
      {children}
    </div>
  );
}
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "ui-monospace, monospace",
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: T.gold,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}
function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: T.white, margin: 0, letterSpacing: -0.5 }}>{title}</h1>
      <p className="lp-sh-sub" style={{ color: T.muted, fontSize: 14.5, marginTop: 6 }}>{sub}</p>
    </div>
  );
}
function Ring({ score, size = 56, color }: { score: number; size?: number; color?: string }) {
  const sw = size >= 56 ? 5 : 4,
    r = (size - sw) / 2,
    c = 2 * Math.PI * r,
    off = c - (score / 100) * c,
    col = color || toneFor(score);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={T.raised} strokeWidth={sw} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={col}
          strokeWidth={sw}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          fontFamily: "ui-monospace, monospace",
          fontWeight: 700,
          fontSize: size >= 56 ? 15 : 12,
          color: T.white,
        }}
      >
        {score}
      </div>
    </div>
  );
}
function Stamp() {
  return (
    <div
      style={{
        transform: "rotate(-9deg)",
        border: `2px solid ${T.mint}`,
        color: T.mint,
        borderRadius: 7,
        padding: "3px 10px",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 2,
        fontFamily: "ui-monospace, monospace",
      }}
    >
      READY
    </div>
  );
}
function MSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <>
      <div className="lp-scrim" style={{ zIndex: 72 }} onClick={onClose} />
      <div className="lp-sheet" style={{ zIndex: 73, maxHeight: "82vh", overflowY: "auto" }} role="dialog" aria-label={title}>
        <div className="lp-sheet-grab" />
        <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
          <b style={{ color: T.white, fontSize: 15.5, flex: 1 }}>{title}</b>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: T.gold, fontWeight: 700, fontSize: 13.5, cursor: "pointer", padding: "8px 4px" }}
          >
            Done
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
function ModRing({ score, size = 58, color, children }: { score: number | null; size?: number; color: string; children: ReactNode }) {
  const sw = 3.5, r = (size - sw) / 2, c = 2 * Math.PI * r;
  const off = score == null ? 0 : c - (Math.max(0, Math.min(100, score)) / 100) * c;
  return (
    <span style={{ position: "relative", width: size, height: size, display: "inline-block", flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute", inset: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={T.raised} strokeWidth={sw} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <span style={{ position: "absolute", inset: 6, borderRadius: 99, background: T.panel, display: "grid", placeItems: "center" }}>{children}</span>
    </span>
  );
}
const btnGold: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: T.gold,
  color: "#10182A",
  border: "none",
  borderRadius: 10,
  padding: "10px 15px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
const btnGhost: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: T.raised,
  color: T.text,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  padding: "10px 15px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
const pill = (color: string): CSSProperties => ({
  fontFamily: "ui-monospace, monospace",
  fontSize: 11,
  fontWeight: 700,
  color,
  background: color + "22",
  border: `1px solid ${color}44`,
  padding: "3px 9px",
  borderRadius: 20,
});

/* ═══════════════ HOME (dashboard, not the package grid) ═══════════════ */
function Home({ store, go, toast }: any) {
  const have: Set<string> = useMemo(() => new Set(store.docs.map((d: Doc) => d.docType)), [store.docs]);
  const scored = EVENTS.map((e) => ({ e, ...evalEvent(e, have) }));
  const started = scored.filter((x) => x.score > 0);
  const overall = started.length ? Math.round(started.reduce((s, x) => s + x.score, 0) / started.length) : 0;
  const best = [...scored].sort((a, b) => b.score - a.score)[0];
  const worst = [...started].sort((a, b) => a.score - b.score)[0] || best;
  const expiring = store.docs.filter((d: Doc) => d.expiry && daysTo(d.expiry) < 60);

  type Act = {
    id: string;
    label: string;
    who?: string;
    whoColor?: string;
    when: string;
    tone: string;
    rid?: string;
    txId?: string;
  };
  const docActs: Act[] = expiring
    .sort((a: Doc, b: Doc) => +new Date(a.expiry!) - +new Date(b.expiry!))
    .map((d: Doc) => {
      const n = daysTo(d.expiry!);
      return {
        id: d.id,
        label: `${d.docType} · ${store.members.find((m: Member) => m.id === d.memberId)?.name.split(" ")[0] || ""}`,
        when: n < 0 ? "expired" : `${n}d left`,
        tone: n < 0 ? T.coral : T.gold,
      };
    });
  const healthActs: Act[] = useMemo(() => {
    const acts: (Act & { urgency: number })[] = [];
    store.members.forEach((mm: Member) => {
      const first = mm.name.split(" ")[0];
      store.reminders
        .filter((r: Reminder) => r.memberId === mm.id && !r.done && daysTo(r.due) <= 45)
        .forEach((r: Reminder) => {
          const dd = daysTo(r.due);
          acts.push({
            id: r.id,
            rid: r.id,
            label: r.title,
            who: first,
            whoColor: mm.color,
            when: dd < 0 ? `${-dd}d overdue` : dd === 0 ? "today" : `in ${dd}d`,
            tone: dd < 0 ? T.coral : dd <= 7 ? T.gold : T.muted,
            urgency: dd < 0 ? -1000 + dd : dd,
          });
        });
    });
    return acts.sort((a, b) => a.urgency - b.urgency);
  }, [store.members, store.reminders, store.labs]);
  const txFollowUps = (store.transactions || []).filter(
    (t: Transaction) => !t.followUpDone && t.followUpOn && daysTo(t.followUpOn) <= 45,
  );
  const holdingGaps: Act[] = [];
  store.holdings.forEach((h: Holding) => {
    const guarded = h.kind === "asset" || h.kind === "cover";
    if (guarded && !h.docId)
      holdingGaps.push({ id: h.id + "d", label: `${h.name} · no document on file`, when: "attach", tone: T.gold });
    if (guarded && !h.accessNote)
      holdingGaps.push({ id: h.id + "a", label: `${h.name} · no access instructions`, when: "add", tone: T.gold });
    if (guarded && !h.nominee)
      holdingGaps.push({ id: h.id + "n", label: `${h.name} · no nominee named`, when: "fix", tone: T.coral });
    if (h.maturityDate && daysTo(h.maturityDate) >= 0 && daysTo(h.maturityDate) < 60)
      holdingGaps.push({
        id: h.id + "m",
        label: `${h.name} matures`,
        when: `${daysTo(h.maturityDate)}d`,
        tone: T.gold,
      });
    if (h.kind === "cover" && h.renewalDate && daysTo(h.renewalDate) < 60)
      holdingGaps.push({ id: h.id + "r", label: `${h.name} renews`, when: `${daysTo(h.renewalDate)}d`, tone: T.gold });
  });
  const wealthActs: Act[] = [
    ...txFollowUps.map((t: Transaction) => ({
      id: t.id,
      txId: t.id,
      label: `Follow up: ${t.purpose}${t.followUpNote ? ` · ${t.followUpNote}` : ""}`,
      when: daysTo(t.followUpOn!) <= 0 ? "due" : `in ${daysTo(t.followUpOn!)}d`,
      tone: daysTo(t.followUpOn!) <= 0 ? T.coral : A.blue,
    })),
    ...holdingGaps,
  ];
  type Insight = { icons: any[]; text: string; to: string; tone: string };
  const insights: Insight[] = [];
  {
    // Health × Packages × Wealth: an upcoming visit meets claim readiness
    const appt = store.reminders
      .filter((r: Reminder) => !r.done && r.kind === "appointment" && daysTo(r.due) >= 0 && daysTo(r.due) <= 30)
      .sort((a: Reminder, b: Reminder) => a.due.localeCompare(b.due))[0];
    if (appt) {
      const who = store.members.find((m: Member) => m.id === appt.memberId)?.name.split(" ")[0];
      const hosp = EVENTS.find((e) => e.id === "hospital");
      if (hosp) {
        const hv = evalEvent(hosp, have);
        const missing = hv.rows.filter((r) => !r.have).map((r) => r.label);
        insights.push({
          icons: [HeartPulse, Plane],
          text: `${who}'s ${appt.title.toLowerCase()} is in ${daysTo(appt.due)}d. The Hospital admission pack is ${hv.score}% ready${missing.length ? `; only ${missing[0]} is missing` : ""}.`,
          to: "packages",
          tone: hv.score >= 80 ? T.mint : T.gold,
        });
      }
    }
    // Wealth × Health: the premium receipt captured in Wealth backs the policy your claims depend on
    const premTx = (store.transactions || []).find((t: Transaction) => /premium|insurance/i.test(t.purpose));
    const lifeCover = store.holdings.find((h: Holding) => h.kind === "cover" && /life/i.test(h.type));
    if (premTx && lifeCover) {
      insights.push({
        icons: [Wallet, ShieldCheck],
        text: `${lifeCover.name} premium receipt is filed as evidence (${new Date(premTx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}). ${lifeCover.renewalDate ? `Renewal in ${daysTo(lifeCover.renewalDate)}d; ` : ""}a claim would find both policy and proof in one place.`,
        to: "wealth",
        tone: T.mint,
      });
    }
    // Documents × Packages: one expiring document, counted across every pack it powers
    const expDoc =
      [...expiring].sort((a: Doc, b: Doc) => +new Date(a.expiry!) - +new Date(b.expiry!))[0] ||
      store.docs.filter((d: Doc) => d.expiry).sort((a: Doc, b: Doc) => +new Date(a.expiry!) - +new Date(b.expiry!))[0];
    if (expDoc) {
      const powered = EVENTS.filter((e) =>
        e.reqs.some((r) => r === expDoc.docType || (SATISFIES[r] || []).includes(expDoc.docType)),
      );
      if (powered.length > 1) {
        insights.push({
          icons: [FolderOpen, Plane],
          text: `${expDoc.docType} expires in ${daysTo(expDoc.expiry!)}d and satisfies requirements in ${powered.length} packs, including ${powered[0].name}. One renewal protects them all.`,
          to: "documents",
          tone: daysTo(expDoc.expiry!) < 60 ? T.gold : T.muted,
        });
      }
    }
    // Trust × Health × Wealth: the same people receive the emergency card and the SOS pack
    const emerg = store.members.filter((m: Member) => m.access === "Emergency access" || m.access === "Full member");
    if (emerg.length) {
      insights.push({
        icons: [Users, Siren],
        text: `${emerg.map((m: Member) => m.name.split(" ")[0]).join(" and ")} hold emergency access: in a crisis they receive both the medical emergency card and the SOS wealth handoff.`,
        to: "trust",
        tone: A.blue,
      });
    }
  }
  const groups: { key: string; label: string; icon: any; color: string; to: string; acts: Act[] }[] = [
    { key: "health", label: "Health", icon: HeartPulse, color: A.green, to: "health", acts: healthActs },
    { key: "documents", label: "Documents", icon: FolderOpen, color: A.blue, to: "documents", acts: docActs },
    { key: "wealth", label: "Wealth", icon: Wallet, color: T.gold, to: "wealth", acts: wealthActs },
  ].filter((g) => g.acts.length > 0);
  const totalActs = groups.reduce((n, g) => n + g.acts.length, 0);
  const hello = useGreeting();
  const stats = [
    { label: "Documents", value: store.docs.length, icon: FolderOpen, c: A.blue, to: "documents" },
    { label: "Overall readiness", value: `${overall}%`, icon: ShieldCheck, c: A.green, to: "packages" },
    { label: "Expiring < 60d", value: expiring.length, icon: Clock, c: A.gold, to: "documents" },
    { label: "Needs attention", value: totalActs, icon: Bell, c: A.pink, to: "health" },
  ];
  const isMobile = useIsMobile();
  const firstName = (store.members[0]?.name || "there").split(" ")[0];
  const expiredCount = store.docs.filter((d: Doc) => d.expiry && daysTo(d.expiry) < 0).length;
  const docsScore = store.docs.length ? Math.round(100 * (1 - expiredCount / store.docs.length)) : null;
  const remAll = store.reminders || [];
  const healthScore = remAll.length ? Math.round((100 * remAll.filter((r: Reminder) => r.done).length) / remAll.length) : null;
  const guarded = store.holdings.filter((h: Holding) => h.kind === "asset" || h.kind === "cover");
  const wealthMiss = guarded.reduce((n: number, h: Holding) => n + (h.docId ? 0 : 1) + (h.accessNote ? 0 : 1) + (h.nominee ? 0 : 1), 0);
  const wealthScore = guarded.length ? Math.round(100 * (1 - wealthMiss / (guarded.length * 3))) : null;
  const topActs = groups.flatMap((g) => g.acts.map((a) => ({ ...a, to: g.to, gcolor: g.color }))).slice(0, 3);
  const welcomeCard =
    store.dataMode === "empty" && store.docs.length === 0 ? (
      <Card
        style={{
          padding: 20,
          marginBottom: 16,
          border: `1px solid ${T.gold}44`,
          background: `linear-gradient(160deg, ${T.gold}12, ${T.panel})`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
          <Sparkles size={17} color={T.gold} />
          <b style={{ color: T.white, fontSize: 16 }}>Welcome to ReadiNes</b>
        </div>
        <p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.6, margin: "0 0 14px", maxWidth: 560 }}>
          Add one document and watch the whole app come to life: readiness scores fill in, packs start matching, and
          the next big moment starts becoming the easy one.
        </p>
        <label style={{ ...btnGold, cursor: "pointer" }}>
          <UploadCloud size={15} /> Add your first document
          <input
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) {
                store.addFiles(e.target.files);
                toast(`${e.target.files.length} document(s) added`);
              }
              e.currentTarget.value = "";
            }}
          />
        </label>
      </Card>
    ) : null;

  if (isMobile) {
    const mods: { key: string; label: string; icon: any; score: number | null; color: string; badge?: number }[] = [
      { key: "documents", label: "Documents", icon: FolderOpen, score: docsScore, color: A.blue, badge: expiring.length },
      { key: "packages", label: "Packages", icon: Plane, score: started.length ? overall : null, color: A.green },
      { key: "health", label: "Health", icon: HeartPulse, score: healthScore, color: A.pink, badge: healthActs.length },
      { key: "wealth", label: "Wealth", icon: Wallet, score: wealthScore, color: A.gold, badge: wealthActs.length },
      { key: "trust", label: "Family", icon: Users, score: null, color: A.teal },
    ];
    return (
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.white, margin: "2px 0 14px" }}>
          {hello}, {firstName}
        </div>
        {welcomeCard}
        <div className="lp-mh-rail">
          {mods.map((m) => (
            <button key={m.key} className="lp-mh-mod" onClick={() => go(m.key)}>
              <span style={{ position: "relative" }}>
                <ModRing score={m.score} color={m.color} size={50}>
                  <m.icon size={18} color={m.color} />
                </ModRing>
                {!!m.badge && (
                  <span
                    style={{
                      position: "absolute",
                      top: -2,
                      right: -2,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 99,
                      background: T.gold,
                      color: "#10182A",
                      fontSize: 10.5,
                      fontWeight: 800,
                      display: "grid",
                      placeItems: "center",
                      padding: "0 4px",
                    }}
                  >
                    {m.badge}
                  </span>
                )}
              </span>
              <span className="lp-mh-modlbl">{m.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => go("packages")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: T.panel,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: 16,
            cursor: "pointer",
            textAlign: "left",
            marginBottom: 16,
          }}
        >
          <Ring score={overall} size={54} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: T.white }}>
              {overall >= 90 ? "You're ready for what's next" : "Your readiness is building"}
            </span>
            <span style={{ display: "block", fontSize: 12.5, color: T.muted, marginTop: 2 }}>
              {started.length
                ? `${scored.filter((x) => x.score === 100).length} of ${started.length} started packs complete`
                : "Pick a life moment to start preparing"}
            </span>
          </span>
          <ChevronRight size={16} color={T.faint} />
        </button>
        {topActs.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, letterSpacing: 0.4, margin: "0 0 8px 2px" }}>
              For you today
            </div>
            <Card style={{ padding: 0, marginBottom: 16 }}>
              {topActs.map((a: any, i: number) => (
                <div
                  key={a.id}
                  onClick={() => go(a.to)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "13px 14px",
                    borderTop: i ? `1px solid ${T.border}` : "none",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 9, background: a.tone, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: T.text, lineHeight: 1.4 }}>
                    {a.who ? `${a.who} · ` : ""}
                    {a.label}
                  </span>
                  <span style={{ fontSize: 11.5, color: a.tone, fontFamily: "ui-monospace, monospace", whiteSpace: "nowrap" }}>
                    {a.when}
                  </span>
                  {(a.rid || a.txId) && (
                    <button
                      title="Mark done"
                      onClick={(e) => {
                        e.stopPropagation();
                        a.rid ? store.completeReminder(a.rid) : store.completeFollowUp(a.txId);
                        toast("Marked done");
                      }}
                      style={{ ...btnGhost, padding: 8 }}
                    >
                      <CheckCircle2 size={15} color={T.mint} />
                    </button>
                  )}
                </div>
              ))}
            </Card>
          </>
        )}
        {topActs.length === 0 && store.docs.length > 0 && (
          <Card style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle2 size={17} color={T.mint} />
            <span style={{ fontSize: 13.5, color: T.muted }}>Nothing needs you today. Everything is in place.</span>
          </Card>
        )}
        {insights.length > 0 && (
          <div className="lp-mh-insrail">
            {insights.slice(0, 3).map((ins, i) => (
              <button
                key={i}
                onClick={() => go(ins.to)}
                style={{
                  flex: "0 0 82%",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  background: T.panel,
                  border: `1px solid ${T.border}`,
                  borderRadius: 14,
                  padding: 13,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ display: "inline-flex", gap: 3, marginTop: 2, flexShrink: 0 }}>
                  {ins.icons.map((Ic: any, j: number) => (
                    <span key={j} style={{ display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: 7, background: ins.tone + "1f" }}>
                      <Ic size={12} color={ins.tone} />
                    </span>
                  ))}
                </span>
                <span style={{ flex: 1, fontSize: 12.5, color: T.text, lineHeight: 1.5 }}>{ins.text}</span>
              </button>
            ))}
          </div>
        )}
        <label className="lp-fab" title="Add a document">
          <Plus size={24} color="#10182A" />
          <input
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) {
                store.addFiles(e.target.files);
                toast(`${e.target.files.length} document(s) added`);
              }
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>
    );
  }

  return (
    <div>
      <Eyebrow>Ready when you need them · private by design</Eyebrow>
      <SectionHead
        title={`${hello}, ${(store.members[0]?.name || "there").split(" ")[0]}`}
        sub="Your archive at a glance, and what needs attention today."
      />
      {store.dataMode === "empty" && store.docs.length === 0 && (
        <Card
          style={{
            padding: 24,
            marginBottom: 20,
            border: `1px solid ${T.gold}44`,
            background: `linear-gradient(160deg, ${T.gold}12, ${T.panel})`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
            <Sparkles size={17} color={T.gold} />
            <b style={{ color: T.white, fontSize: 16 }}>Welcome to ReadiNes</b>
          </div>
          <p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.6, margin: "0 0 14px", maxWidth: 560 }}>
            This vault gets smarter with every single page you give it. Add one document and watch the whole app come
            to life: readiness scores fill in, packs start matching, and the next big moment starts becoming the easy
            one.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={{ ...btnGold, cursor: "pointer" }}>
              <UploadCloud size={15} /> Add your first document
              <input
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files?.length) {
                    store.addFiles(e.target.files);
                    toast(`${e.target.files.length} document(s) added`);
                  }
                  e.currentTarget.value = "";
                }}
              />
            </label>
            <button onClick={() => go("packages")} style={btnGhost}>
              <Plane size={15} /> Browse the 100 packs
            </button>
          </div>
        </Card>
      )}
      {store.docs.length === 0 && (() => {
        let picked: string[] = [];
        try { picked = JSON.parse(localStorage.getItem("rn-moments") || "[]"); } catch {}
        const STARTERS: Record<string, [string, string[]]> = {
          schengen: ["A visa or trip abroad", ["Passport", "Bank statements (6 months)", "Passport photos"]],
          "home-buy": ["Buying a home", ["PAN card", "Salary slips (3 months)", "Bank statements"]],
          "home-loan": ["A home loan", ["Form 16", "Salary slips (3 months)", "Property papers"]],
          baby: ["A new baby", ["Health insurance policy", "Aadhaar (both parents)", "Hospital records"]],
          wedding: ["A wedding", ["Birth certificate", "Aadhaar", "Passport photos"]],
          tax: ["Tax season", ["Form 16", "Investment proofs", "Rent receipts"]],
          "school-adm": ["Kids' school or exams", ["Birth certificate", "Previous marksheets", "Address proof"]],
          onboarding: ["A job change", ["PAN card", "Educational certificates", "Relieving letter"]],
        };
        const cards = picked.filter((id) => STARTERS[id]);
        if (!cards.length) return null;
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))", gap: 12, marginBottom: 20 }}>
            {cards.map((id) => {
              const [title, docs3] = STARTERS[id];
              return (
                <Card key={id} style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 30, height: 30, borderRadius: 99, border: `2.5px solid ${T.gold}`, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800, color: T.gold }}>0%</span>
                    <b style={{ color: T.white, fontSize: 14 }}>{title}</b>
                  </div>
                  <p style={{ color: T.muted, fontSize: 12.5, margin: "0 0 8px" }}>Start with these three:</p>
                  <div style={{ display: "grid", gap: 5, marginBottom: 12 }}>
                    {docs3.map((d) => (
                      <div key={d} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: T.text }}>
                        <FileText size={12} color={T.gold} /> {d}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <label style={{ ...btnGold, cursor: "pointer", fontSize: 12.5, padding: "7px 12px" }}>
                      <UploadCloud size={13} /> Add these
                      <input
                        type="file"
                        multiple
                        hidden
                        onChange={(e) => {
                          if (e.target.files?.length) {
                            store.addFiles(e.target.files);
                            toast(`${e.target.files.length} document(s) added`);
                          }
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                    <button onClick={() => go("packages")} style={{ background: "none", border: "none", color: T.muted, fontSize: 12, cursor: "pointer" }}>
                      Full pack →
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        );
      })()}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => go(s.to)}
            style={{
              textAlign: "left",
              cursor: "pointer",
              background: T.panel,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: 16,
            }}
          >
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 34,
                height: 34,
                borderRadius: 9,
                background: s.c + "22",
              }}
            >
              <s.icon size={17} color={s.c} />
            </span>
            <div
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 24,
                fontWeight: 800,
                color: T.white,
                marginTop: 12,
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 13, color: T.muted }}>{s.label}</div>
          </button>
        ))}
      </div>
      <div className="lp-cols2">
        <Card style={{ padding: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px" }}>
            <AlertTriangle size={16} color={totalActs ? T.gold : T.mint} />
            <b style={{ color: T.white, fontSize: 15 }}>Action center</b>
            <span style={{ marginLeft: "auto", ...pill(totalActs ? T.gold : T.mint) }}>{totalActs || "all clear"}</span>
          </div>
          {totalActs === 0 ? (
            <p style={{ color: T.muted, fontSize: 13, padding: "0 16px 16px", margin: 0 }}>
              Nothing pressing across documents, health, or wealth. Nicely handled.
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.key}>
                <button
                  onClick={() => go(g.to)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "10px 16px",
                    borderTop: `1px solid ${T.border}`,
                    background: T.raised + "66",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <g.icon size={14} color={g.color} />
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      color: T.muted,
                      fontFamily: "ui-monospace, monospace",
                    }}
                  >
                    {g.label}
                  </span>
                  <span style={{ fontSize: 11.5, color: g.color, fontFamily: "ui-monospace, monospace" }}>
                    {g.acts.length}
                  </span>
                  <ChevronRight size={13} color={T.faint} style={{ marginLeft: "auto" }} />
                </button>
                {g.acts.slice(0, 4).map((a) => (
                  <div
                    key={a.id}
                    className="lp-act"
                    onClick={() => go(g.to)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      padding: "9px 16px",
                      borderTop: `1px solid ${T.border}`,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 9, background: a.tone, flexShrink: 0 }} />
                    {a.who && (
                      <span
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 66, flexShrink: 0 }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: 9, background: a.whoColor }} />
                        <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>{a.who}</span>
                      </span>
                    )}
                    <span
                      className="lp-act-label"
                      style={{
                        flex: 1,
                        fontSize: 13.5,
                        color: T.text,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.label}
                    </span>
                    <span
                      className="lp-act-when"
                      style={{
                        fontSize: 11.5,
                        color: a.tone,
                        fontFamily: "ui-monospace, monospace",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.when}
                    </span>
                    {(a.rid || a.txId) && (
                      <button
                        title="Mark done"
                        onClick={(e) => {
                          e.stopPropagation();
                          a.rid ? store.completeReminder(a.rid) : store.completeFollowUp(a.txId);
                          toast("Marked done");
                        }}
                        style={{ ...btnGhost, padding: 6 }}
                      >
                        <CheckCircle2 size={14} color={T.mint} />
                      </button>
                    )}
                  </div>
                ))}
                {g.acts.length > 4 && (
                  <button
                    onClick={() => go(g.to)}
                    style={{
                      width: "100%",
                      background: "none",
                      border: "none",
                      borderTop: `1px solid ${T.border}`,
                      padding: "8px 16px",
                      cursor: "pointer",
                      fontSize: 12,
                      color: T.muted,
                      textAlign: "center",
                    }}
                  >
                    +{g.acts.length - 4} more in {g.label}
                  </button>
                )}
              </div>
            ))
          )}
        </Card>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <ShieldCheck size={16} color={T.gold} />
            <b style={{ color: T.white, fontSize: 15 }}>Connected across ReadiNes</b>
          </div>
          <p style={{ fontSize: 12, color: T.muted, margin: "0 0 10px" }}>
            What your modules mean together, not what they already show apart.
          </p>
          {insights.slice(0, 4).map((ins, i) => (
            <button
              key={i}
              onClick={() => go(ins.to)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "flex-start",
                gap: 11,
                padding: "11px 0",
                borderTop: i ? `1px solid ${T.border}` : "none",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ display: "inline-flex", gap: 3, marginTop: 2, flexShrink: 0 }}>
                {ins.icons.map((Ic: any, j: number) => (
                  <span
                    key={j}
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 22,
                      height: 22,
                      borderRadius: 7,
                      background: ins.tone + "1f",
                    }}
                  >
                    <Ic size={12} color={ins.tone} />
                  </span>
                ))}
              </span>
              <span style={{ flex: 1, fontSize: 13, color: T.text, lineHeight: 1.55 }}>{ins.text}</span>
              <ChevronRight size={14} color={T.faint} style={{ marginTop: 4 }} />
            </button>
          ))}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderTop: `1px solid ${T.border}`,
              paddingTop: 12,
              marginTop: 2,
            }}
          >
            <Ring score={best.score} size={40} />
            <span style={{ flex: 1, fontSize: 12.5, color: T.muted }}>
              Most ready: <b style={{ color: T.text }}>{best.e.name}</b>
            </span>
          </div>
          <button
            onClick={() => go("packages")}
            style={{ ...btnGhost, width: "100%", justifyContent: "center", marginTop: 12 }}
          >
            See all packages <ArrowRight size={14} />
          </button>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════ PACKAGES ═══════════════ */
type AnyPack = {
  id: string;
  name: string;
  blurb: string;
  accent: string;
  icon: any;
  reqs: string[];
  cat: string;
  source?: string;
  lastChecked?: string;
  conditional?: string[];
  custom?: boolean;
  desc?: string;
};
const PACK_CATS = [
  "Travel & Immigration",
  "Identity & Civic",
  "Money & Tax",
  "Jobs & Employment",
  "Education",
  "Health",
  "Home & Property",
  "Family & Life",
];
function Packages({ store, toast }: any) {
  const have: Set<string> = useMemo(() => new Set(store.docs.map((d: Doc) => d.docType)), [store.docs]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState<AnyPack | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AnyPack | null>(null);
  const customAsPacks: AnyPack[] = (store.customPacks || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    blurb: "Custom pack",
    accent: T.gold,
    icon: FileText,
    reqs: c.reqs,
    cat: "My packs",
    custom: true,
    desc: c.desc,
  }));
  const all: AnyPack[] = [...(EVENTS as AnyPack[]), ...customAsPacks];
  const cats = ["All", ...PACK_CATS.filter((c) => all.some((p) => p.cat === c)), `My packs (${customAsPacks.length})`];
  const needle = q.trim().toLowerCase();
  const list = all.filter(
    (e) =>
      (cat === "All" || e.cat === cat) &&
      (!needle || `${e.name} ${e.blurb} ${e.cat} ${e.reqs.join(" ")}`.toLowerCase().includes(needle)),
  );
  const isMobile = useIsMobile();
  if (isMobile)
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0 12px" }}>
          <b style={{ fontSize: 18, fontWeight: 800, color: T.white }}>Packages</b>
          <span style={pill(T.muted)}>{all.length}</span>
          <span style={{ flex: 1 }} />
          <button
            onClick={() => setCreating(true)}
            title="Create a custom pack"
            style={{ ...btnGhost, padding: 10, borderRadius: 12 }}
          >
            <Plus size={17} />
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            background: T.panel,
            border: `1px solid ${q ? T.gold + "66" : T.border}`,
            borderRadius: 11,
            padding: "7px 12px",
            marginBottom: 10,
          }}
        >
          <Search size={15} color={T.muted} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Visa, loan, admission…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: T.text }}
          />
          {q && (
            <button onClick={() => setQ("")} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, display: "flex" }}>
              <X size={14} />
            </button>
          )}
        </div>
        <div className="lp-chiprail" style={{ marginBottom: 12 }}>
          {cats.map((raw) => {
            const c = raw.startsWith("My packs") ? "My packs" : raw;
            const on = cat === c;
            return (
              <button
                key={raw}
                onClick={() => setCat(c)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  border: `1px solid ${on ? T.gold + "77" : T.border}`,
                  background: on ? T.raised : "transparent",
                  color: on ? T.white : T.muted,
                }}
              >
                {raw}
              </button>
            );
          })}
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {list.map((e) => {
            const { score, got, total } = evalEvent(e, have);
            return (
              <button
                key={e.id}
                onClick={() => setOpen(e)}
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  background: T.panel,
                  border: `1px solid ${T.border}`,
                  borderRadius: 13,
                  padding: 11,
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                }}
              >
                <Ring score={score} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                    <e.icon size={14} color={e.accent} style={{ flexShrink: 0 }} />
                    <b style={{ color: T.white, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</b>
                    {e.custom && <span style={pill(T.gold)}>custom</span>}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                    {score === 100 ? "Everything in place" : `${total - got} missing · ${got} of ${total} ready`}
                  </div>
                </div>
                {score === 100 ? <Stamp /> : <ChevronRight size={16} color={T.faint} />}
              </button>
            );
          })}
        </div>
        {list.length === 0 && (
          <Card style={{ textAlign: "center", padding: 24 }}>
            <div style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>
              {cat === "My packs" && !q ? "You have not created a pack yet" : `No pack covers "${q}" yet`}
            </div>
            <button onClick={() => setCreating(true)} style={{ ...btnGold, margin: "12px auto 0" }}>
              <Plus size={15} /> Create a custom pack
            </button>
          </Card>
        )}
        {open && (
          <PackageDetail
            ev={open}
            store={store}
            onClose={() => setOpen(null)}
            onEdit={
              open.custom
                ? () => {
                    setEditing(open);
                    setOpen(null);
                    setCreating(true);
                  }
                : undefined
            }
            toast={toast}
          />
        )}
        {creating && (
          <CustomPackModal
            existing={editing}
            have={have}
            catalog={all.filter((p) => !p.custom)}
            onClose={() => {
              setCreating(false);
              setEditing(null);
            }}
            onSave={(name: string, desc: string, reqs: string[]) => {
              if (editing) {
                store.updateCustomPack(editing.id, { name, desc, reqs });
                toast("Custom pack updated");
              } else {
                store.addCustomPack({ name, desc, reqs });
                toast("Custom pack created");
              }
              setCreating(false);
              setEditing(null);
            }}
            onDelete={
              editing
                ? () => {
                    store.removeCustomPack(editing.id);
                    toast("Custom pack removed");
                    setCreating(false);
                    setEditing(null);
                  }
                : undefined
            }
          />
        )}
      </div>
    );
  return (
    <div>
      <SectionHead
        title="Packages"
        sub={`${all.length} real-world situations. ReadiNes matches your archive against each one and shows how ready you already are.`}
      />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "0 0 18px" }}>
        <button onClick={() => setCreating(true)} style={btnGold}>
          <Plus size={15} /> Create a custom pack
        </button>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: T.panel,
          border: `1px solid ${q ? T.gold + "66" : T.border}`,
          borderRadius: 12,
          padding: "10px 14px",
          marginBottom: 12,
        }}
      >
        <Search size={16} color={T.muted} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Schengen visa, home loan, hospital admission, school admission, passport renewal"
          style={{ flex: 1, background: "none", border: "none", outline: "none", color: T.text, fontSize: 14 }}
        />
        {q && (
          <button
            onClick={() => setQ("")}
            style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, display: "flex" }}
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {cats.map((raw) => {
          const c = raw.startsWith("My packs") ? "My packs" : raw;
          const on = cat === c;
          return (
            <button
              key={raw}
              onClick={() => setCat(c)}
              style={{
                padding: "7px 13px",
                borderRadius: 99,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                border: `1px solid ${on ? T.gold + "77" : T.border}`,
                background: on ? T.raised : "transparent",
                color: on ? T.white : T.muted,
              }}
            >
              {raw}
            </button>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(300px,100%),1fr))", gap: 12 }}>
        {list.map((e) => {
          const { score, got, total } = evalEvent(e, have);
          return (
            <button
              key={e.id}
              onClick={() => setOpen(e)}
              style={{
                textAlign: "left",
                cursor: "pointer",
                background: T.panel,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: 16,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <Ring score={score} size={54} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <e.icon size={16} color={e.accent} />
                  <b style={{ color: T.white, fontSize: 15.5 }}>{e.name}</b>
                  {e.custom && <span style={pill(T.gold)}>custom</span>}
                </div>
                <div style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>
                  {score === 100 ? "Everything in place" : `${total - got} missing · ${got} of ${total} ready`}
                </div>
              </div>
              {score === 100 ? <Stamp /> : <ChevronRight size={18} color={T.muted} />}
            </button>
          );
        })}
      </div>
      {list.length === 0 && (
        <Card style={{ textAlign: "center", padding: 30 }}>
          <div style={{ color: T.text, fontWeight: 600, fontSize: 14.5 }}>
            {cat === "My packs" && !q ? "You have not created a pack yet" : `No pack covers "${q}" yet`}
          </div>
          <div style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>
            {cat === "My packs" && !q
              ? "Custom packs you create live here, scored against your archive like any curated pack."
              : "Describe it and ReadiNes drafts the checklist for you."}
          </div>
          <button onClick={() => setCreating(true)} style={{ ...btnGold, margin: "14px auto 0" }}>
            <Plus size={15} /> Create a custom pack
          </button>
        </Card>
      )}
      {open && (
        <PackageDetail
          ev={open}
          store={store}
          onClose={() => setOpen(null)}
          onEdit={
            open.custom
              ? () => {
                  setEditing(open);
                  setOpen(null);
                  setCreating(true);
                }
              : undefined
          }
          toast={toast}
        />
      )}
      {creating && (
        <CustomPackModal
          existing={editing}
          have={have}
          catalog={all.filter((p) => !p.custom)}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={(name: string, desc: string, reqs: string[]) => {
            if (editing) {
              store.updateCustomPack(editing.id, { name, desc, reqs });
              toast("Custom pack updated");
            } else {
              store.addCustomPack({ name, desc, reqs });
              toast("Custom pack created");
            }
            setCreating(false);
            setEditing(null);
          }}
          onDelete={
            editing
              ? () => {
                  store.removeCustomPack(editing.id);
                  toast("Custom pack removed");
                  setCreating(false);
                  setEditing(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

/* ── deterministic checklist starter for custom packs (honest: a draft, not verified) ── */
const PACK_TEMPLATES: [RegExp, string[]][] = [
  [
    /school|admission|kindergarten|college/i,
    ["Birth Certificate", "Passport Photos", "Address Proof", "Identity Proof", "Marksheet", "Immunization Record"],
  ],
  [
    /employer|job|onboard|joining|offer/i,
    ["Identity Proof", "Degree Certificate", "Relieving Letter", "Payslip", "Bank Statement", "Passport Photos"],
  ],
  [
    /rent|lease|tenant|apartment/i,
    ["Identity Proof", "Payslip", "Employment Proof", "Bank Statement", "Passport Photos"],
  ],
  [/passport/i, ["Passport", "Identity Proof", "Address Proof", "Passport Photos"]],
  [/marriage|wedding/i, ["Birth Certificate", "Identity Proof", "Address Proof", "Passport Photos"]],
  [/driving|licen[cs]e|vehicle|car|bike/i, ["Identity Proof", "Address Proof", "Passport Photos", "Vehicle Insurance"]],
  [
    /visa|travel|trip|abroad/i,
    ["Passport", "Bank Statement", "Flight Reservation", "Hotel Booking", "Passport Photos"],
  ],
  [/loan|finance|credit/i, ["Identity Proof", "PAN Card", "Payslip", "Bank Statement", "Address Proof"]],
  [/exam|test|entrance/i, ["Admit Card", "Photo ID", "Passport Photos", "Degree Certificate"]],
  [/insurance|claim/i, ["Photo ID", "Medical Bills", "Prescription", "Bank Statement", "Cancelled Cheque"]],
  [/death|heir|succession/i, ["Death Certificate", "Identity Proof", "Legal Heir Certificate", "Bank Statement"]],
  [/scholar|grant/i, ["Marksheet", "Income Certificate", "National ID", "Bank Statement"]],
  [/business|shop|startup|gst/i, ["National ID", "Tax ID", "Business Registration", "Bank Statement", "Utility Bill"]],
];
function draftChecklist(desc: string): string[] {
  for (const [re, reqs] of PACK_TEMPLATES) if (re.test(desc)) return [...reqs];
  return ["Identity Proof", "Address Proof", "Bank Statement"];
}

function CustomPackModal({ existing, have, catalog, onClose, onSave, onDelete }: any) {
  const [desc, setDesc] = useState(existing?.desc || "");
  const [name, setName] = useState(existing?.name || "");
  const [reqs, setReqs] = useState<string[]>(existing?.reqs || []);
  const [drafted, setDrafted] = useState(!!existing);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<any>(null);
  const words = desc
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w: string) => w.length > 3);
  const similar = words.length
    ? (catalog || [])
        .map((p: any) => ({
          p,
          hits: words.filter((w: string) => `${p.name} ${p.blurb} ${p.cat}`.toLowerCase().includes(w)).length,
        }))
        .filter((x: any) => x.hits > 0)
        .sort((a: any, b: any) => b.hits - a.hits)
        .slice(0, 3)
        .map((x: any) => x.p)
    : [];
  const generate = async (fromPack?: any) => {
    // 1. INSTANT list + name for BOTH paths, so nothing is ever empty or blocked.
    let query: string;
    if (fromPack) {
      setReqs([...fromPack.reqs]);                          // instant: catalog list
      query = fromPack.name;                                // ...then research this topic live
      if (!name.trim()) setName(`${fromPack.name} (my version)`.slice(0, 44));
    } else {
      if (!desc.trim()) return;
      setReqs(draftChecklist(desc));                        // instant: rule-based draft
      query = desc.trim();
      if (!name.trim()) {
        const n = desc.trim().replace(/^documents?\s+(needed|requested|required)\s+(for|by)\s+/i, "");
        setName(n.charAt(0).toUpperCase() + n.slice(1, 44));
      }
    }
    setDrafted(true);

    // 2. REFINE with live sourced requirements. getPackRequirements is cache-first:
    //    a fresh (<30-day) cached result returns instantly; otherwise it researches live.
    setLoading(true);
    try {
      const { data, source } = await getPackRequirements(query);
      setReqs(data.requirements.map((r: any) => (r.ontology && r.ontology !== "Other" ? r.ontology : r.item)));
      setMeta({
        sources: data.sources || [],
        lastChecked: data.lastChecked,
        confidence: data.confidence,
        disclaimer: data.disclaimer,
        dataSource: source,
      });
    } catch {
      setMeta({ sources: [], dataSource: "fallback", disclaimer: "Couldn't reach the live requirements service — showing an offline draft." });
    } finally {
      setLoading(false);
    }
  };
  const inp: CSSProperties = {
    width: "100%",
    background: T.raised,
    border: `1px solid ${T.border}`,
    borderRadius: 9,
    padding: "9px 11px",
    color: T.text,
    fontSize: 14,
    outline: "none",
  };
  const lbl: CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: T.muted,
    fontFamily: "ui-monospace, monospace",
    margin: "12px 0 5px",
    display: "block",
  };
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 72,
        background: "rgba(4,7,15,.62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.panel,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          width: "min(480px,100%)",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: 22,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <b style={{ color: T.white, fontSize: 18 }}>{existing ? "Edit custom pack" : "Create a custom pack"}</b>
          <button onClick={onClose} style={{ ...btnGhost, padding: 8 }}>
            <X size={16} />
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: T.muted, margin: "0 0 4px" }}>
          For situations the catalog does not cover. Describe it in your own words.
        </p>
        <label style={lbl}>What do you need documents for?</label>
        <textarea
          style={{ ...inp, minHeight: 60, resize: "vertical", fontFamily: "inherit" }}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={
            'e.g. "Documents needed for my son\u2019s school admission" or "Documents requested by my new employer"'
          }
        />
        {!drafted && similar.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11.5, color: T.muted, marginBottom: 6 }}>
              The catalog may already cover this. Start from one, or draft fresh:
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {similar.map((sp: any) => (
                <button
                  key={sp.id}
                  onClick={() => generate(sp)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 11px",
                    borderRadius: 99,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: `1px solid ${T.border}`,
                    background: T.raised,
                    color: T.text,
                  }}
                >
                  <sp.icon size={13} color={sp.accent} /> {sp.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {!drafted && (
          <button
            onClick={() => generate()}
            disabled={!desc.trim() || loading}
            style={{
              ...btnGold,
              width: "100%",
              justifyContent: "center",
              marginTop: 12,
              opacity: desc.trim() && !loading ? 1 : 0.4,
            }}
          >
            Draft the checklist
          </button>
        )}
        {drafted && (
          <>
            {loading && (
              <div style={{ fontSize: 11.5, color: T.gold, margin: "4px 0" }}>
                ⟳ Refining with current official sources… (up to a minute)
              </div>
            )}
            <label style={lbl}>Pack name</label>
            <input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this pack" />
            <label style={lbl}>Checklist · edit freely</label>
            <div
              style={{
                fontSize: 11.5,
                color: T.gold,
                background: T.gold + "12",
                border: `1px solid ${T.gold}44`,
                borderRadius: 9,
                padding: "8px 11px",
                marginBottom: 8,
                lineHeight: 1.5,
              }}
            >
              A starting draft from your description, not officially verified. Edit it to match what you were actually
              asked for.
            </div>
            <datalist id="lp-doc-vocab">
              {DOC_VOCAB.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
            {reqs.map((r, i) => {
              const onFile = have?.has(r.trim());
              return (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7, alignItems: "center" }}>
                  <input
                    style={{ ...inp, borderColor: onFile ? T.mint + "66" : T.border }}
                    value={r}
                    list="lp-doc-vocab"
                    placeholder="Type; standard document names suggest themselves"
                    onChange={(e) => setReqs(reqs.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                  <span
                    title={onFile ? "Already in your archive" : "Not in your archive yet"}
                    style={{
                      width: 20,
                      textAlign: "center",
                      fontSize: 13,
                      fontWeight: 800,
                      color: onFile ? T.mint : T.faint,
                    }}
                  >
                    {onFile ? "\u2713" : ""}
                  </span>
                  <button
                    onClick={() => setReqs(reqs.filter((_, j) => j !== i))}
                    style={{ ...btnGhost, padding: "0 11px" }}
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            <button onClick={() => setReqs([...reqs, ""])} style={{ ...btnGhost, padding: "7px 12px", fontSize: 12.5 }}>
              <Plus size={13} /> Add requirement
            </button>
            {drafted && reqs.some((r) => have?.has(r.trim())) && (
              <div style={{ fontSize: 11.5, color: T.mint, marginTop: 8 }}>
                {reqs.filter((r) => have?.has(r.trim())).length} of {reqs.filter((r) => r.trim()).length} already in
                your archive; they will count the moment you save.
              </div>
            )}
            {meta && (
              <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: T.navy, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: meta.dataSource === "fallback" ? T.coral : T.mint, fontWeight: 700 }}>
                    {meta.dataSource === "fallback" ? "Offline estimate" : "Live · sourced"}
                  </span>
                  {meta.confidence && <span>· confidence: {meta.confidence}</span>}
                  {meta.lastChecked && <span>· checked {meta.lastChecked}</span>}
                </div>
                {meta.sources?.slice(0, 4).map((s: any, i: number) => (
                  <a key={i} href={s.url} target="_blank" rel="noreferrer" style={{ display: "block", fontSize: 12, color: T.gold, marginTop: 4 }}>
                    <span style={{ textTransform: "uppercase", fontSize: 9, color: T.muted, marginRight: 6 }}>{s.tier}</span>
                    {s.title}
                  </a>
                ))}
                {meta.disclaimer && <p style={{ fontSize: 11, color: T.muted, marginTop: 8, lineHeight: 1.45 }}>{meta.disclaimer}</p>}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              {onDelete && (
                <button onClick={onDelete} style={{ ...btnGhost, color: T.coral, borderColor: T.coral + "55" }}>
                  <Trash2 size={14} /> Delete
                </button>
              )}
              <button
                onClick={() =>
                  name.trim() &&
                  reqs.filter((r) => r.trim()).length &&
                  onSave(name.trim(), desc.trim(), reqs.map((r) => r.trim()).filter(Boolean))
                }
                disabled={!name.trim() || !reqs.filter((r) => r.trim()).length}
                style={{
                  ...btnGold,
                  flex: 1,
                  justifyContent: "center",
                  opacity: name.trim() && reqs.filter((r) => r.trim()).length ? 1 : 0.4,
                }}
              >
                {existing ? "Save changes" : "Save pack"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PackageDetail({ ev, store, onClose, onEdit, toast }: any) {
  const have: Set<string> = new Set(store.docs.map((d: Doc) => d.docType));
  const [view, setView] = useState<Doc | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addFor, setAddFor] = useState<string | null>(null);
  const [pickFor, setPickFor] = useState<string | null>(null);
  const upRef = useRef<HTMLInputElement>(null);
  const upReq = useRef<string>("");
  const otherPacks = (docType: string) =>
    [...(EVENTS as any[]), ...(store.customPacks || [])]
      .filter((p: any) => (p.reqs || []).includes(docType) && p.id !== ev.id)
      .map((p: any) => p.name);
  const memberName = (mid?: string) => store.members.find((m: Member) => m.id === mid)?.name || "Unassigned";
  const { rows, got, total, score } = evalEvent(ev, have);
  const included: Doc[] = [
    ...new Set(
      rows
        .filter((r: any) => r.have)
        .map((r: any) => satisfyingDoc(r.label, store.docs))
        .filter(Boolean) as Doc[],
    ),
  ];
  const exportPack = () => {
    const body =
      `ReadiNes . ${ev.name}\nGenerated ${new Date().toLocaleString()}\nReadiness ${score}% (${got} of ${total})\n\nINCLUDED:\n` +
      included.map((d: Doc, i: number) => `${i + 1}. ${d.name} [${d.docType}]`).join("\n") +
      `\n\nSTILL NEEDED:\n` +
      rows
        .filter((r) => !r.have)
        .map((r) => `- ${r.label}`)
        .join("\n");
    const b = new Blob([body], { type: "text/plain" });
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u;
    a.download = `${ev.id}_pack.txt`;
    a.click();
    URL.revokeObjectURL(u);
    toast("Pack exported");
  };
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 72,
        background: "rgba(4,7,15,.6)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(460px,100%)",
          height: "100%",
          overflowY: "auto",
          background: T.navy,
          borderLeft: `1px solid ${T.border}`,
        }}
      >
        <div style={{ background: T.panel, padding: 22, borderBottom: `1px solid ${T.border}`, position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, ...btnGhost, padding: 8 }}>
            <X size={16} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 44,
                height: 44,
                borderRadius: 12,
                background: ev.accent + "22",
              }}
            >
              <ev.icon size={21} color={ev.accent} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: T.white, fontSize: 18, fontWeight: 800 }}>{ev.name}</div>
              <div style={{ color: T.muted, fontSize: 13 }}>{ev.blurb}</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: 11.5,
              color: ev.custom ? T.gold : T.muted,
              fontFamily: "ui-monospace, monospace",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {ev.custom ? (
              <>
                <span>Custom / AI-generated · not officially verified</span>
                {onEdit && (
                  <button
                    onClick={onEdit}
                    style={{ ...btnGhost, padding: "4px 10px", fontSize: 11.5, marginLeft: "auto" }}
                  >
                    <Pencil size={11} /> Edit checklist
                  </button>
                )}
              </>
            ) : (
              <span>
                Curated · Source: {ev.source} · Last checked {ev.lastChecked}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
            <Ring score={score} size={64} />
            {score === 100 ? (
              <Stamp />
            ) : (
              <div style={{ color: T.muted, fontSize: 13, fontFamily: "ui-monospace, monospace" }}>
                {got} of {total} ready
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: 18 }}>
          <Card style={{ padding: 0, marginBottom: 12 }}>
            <div
              style={{
                padding: "13px 16px",
                fontWeight: 700,
                color: T.white,
                fontSize: 14.5,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CheckCircle2 size={16} color={T.mint} /> Found in ReadiNes ({rows.filter((r) => r.have).length})
            </div>
            {rows
              .filter((r) => r.have)
              .map((r) => {
                const d = satisfyingDoc(r.label, store.docs);
                const isOpen = expanded === r.label;
                const reuse = otherPacks(r.label);
                return (
                  <div key={r.label} style={{ borderTop: `1px solid ${T.border}` }}>
                    <button
                      onClick={() => setExpanded(isOpen ? null : r.label)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        cursor: "pointer",
                        background: isOpen ? T.raised + "77" : "none",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "9px 16px",
                      }}
                    >
                      <span
                        style={{
                          display: "grid",
                          placeItems: "center",
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          background: T.mint + "26",
                        }}
                      >
                        <Check size={12} color={T.mint} />
                      </span>
                      <span style={{ flex: 1, fontSize: 14, color: T.text }}>{r.label}</span>
                      <ChevronRight
                        size={13}
                        color={T.muted}
                        style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: ".12s" }}
                      />
                    </button>
                    {isOpen && d && (
                      <div style={{ padding: "2px 16px 12px 48px" }}>
                        <div style={{ fontSize: 12.5, color: T.text, fontFamily: "ui-monospace, monospace" }}>
                          {d.name}
                        </div>
                        <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
                          {memberName(d.memberId)}
                          {d.docType !== r.label ? ` · satisfied by ${d.docType}` : ""}
                        </div>
                        {reuse.length > 0 && (
                          <div style={{ fontSize: 11.5, color: T.faint, marginTop: 5, lineHeight: 1.5 }}>
                            Stored once, also counts toward: {reuse.join(", ")}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
                          <button onClick={() => setView(d)} style={{ ...btnGhost, padding: "6px 11px", fontSize: 12 }}>
                            View document
                          </button>
                          <button
                            onClick={() => setPickFor(r.label)}
                            style={{ ...btnGhost, padding: "6px 11px", fontSize: 12 }}
                          >
                            Replace
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </Card>
          {rows.some((r) => !r.have) && (
            <Card style={{ padding: 0, marginBottom: 16 }}>
              <div
                style={{
                  padding: "13px 16px",
                  fontWeight: 700,
                  color: T.white,
                  fontSize: 14.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertTriangle size={16} color={T.gold} /> Still needed ({rows.filter((r) => !r.have).length})
              </div>
              {rows
                .filter((r) => !r.have)
                .map((r) => {
                  const menuOpen = addFor === r.label;
                  const cond = (ev.conditional || []).includes(r.label);
                  return (
                    <div key={r.label} style={{ borderTop: `1px solid ${T.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 16px" }}>
                        <span
                          style={{
                            display: "grid",
                            placeItems: "center",
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            background: T.gold + "26",
                          }}
                        >
                          <X size={12} color={T.gold} />
                        </span>
                        <span style={{ flex: 1, fontSize: 14, color: T.text, minWidth: 0 }}>
                          {r.label}
                          {cond && (
                            <span style={{ display: "block", fontSize: 11, color: T.faint }}>
                              May be required depending on your situation
                            </span>
                          )}
                        </span>
                        <button
                          onClick={() => setAddFor(menuOpen ? null : r.label)}
                          style={{
                            ...btnGhost,
                            padding: "5px 12px",
                            fontSize: 12.5,
                            color: T.gold,
                            borderColor: T.gold + "55",
                          }}
                        >
                          Add
                        </button>
                      </div>
                      {menuOpen && (
                        <div style={{ display: "flex", gap: 8, padding: "0 16px 11px 48px" }}>
                          <button
                            onClick={() => {
                              upReq.current = r.label;
                              upRef.current?.click();
                            }}
                            style={{ ...btnGhost, padding: "6px 11px", fontSize: 12 }}
                          >
                            <UploadCloud size={13} /> Upload document
                          </button>
                          <button
                            onClick={() => {
                              setAddFor(null);
                              setPickFor(r.label);
                            }}
                            style={{ ...btnGhost, padding: "6px 11px", fontSize: 12 }}
                          >
                            <FolderOpen size={13} /> Choose from Documents
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </Card>
          )}
          <input
            ref={upRef}
            type="file"
            hidden
            onChange={async (e) => {
              const input = e.currentTarget;
              const files = e.target.files;
              if (files?.length && upReq.current) {
                await store.addFiles(files, "you", { docType: upReq.current });
                toast(`${upReq.current} added to your archive`);
              }
              input.value = "";
              setAddFor(null);
            }}
          />
          <button onClick={exportPack} style={{ ...btnGold, width: "100%", justifyContent: "center" }}>
            <Download size={16} /> Export pack
          </button>
          <p
            style={{
              fontSize: 12,
              color: T.muted,
              textAlign: "center",
              marginTop: 14,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Lock size={12} /> Checklist based on published requirements; completeness and eligibility are not
            guaranteed.
          </p>
        </div>
      </div>
      {view && <DocViewer doc={view} store={store} onClose={() => setView(null)} />}
      {pickFor && (
        <ReqPickerModal
          req={pickFor}
          docs={store.docs}
          members={store.members}
          onClose={() => setPickFor(null)}
          onPick={(d: Doc) => {
            store.updateDoc(d.id, { docType: pickFor });
            toast(`${d.name} now counts as ${pickFor}`);
            setPickFor(null);
            setExpanded(null);
          }}
        />
      )}
    </div>
  );
}

function ReqPickerModal({ req, docs, members, onClose, onPick }: any) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const list = docs.filter((d: Doc) => !needle || `${d.docType} ${d.name}`.toLowerCase().includes(needle));
  const nameOf = (mid?: string) => members.find((m: Member) => m.id === mid)?.name || "Unassigned";
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 75,
        background: "rgba(4,7,15,.62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.panel,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          width: "min(440px,100%)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          padding: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <b style={{ color: T.white, fontSize: 16 }}>Match a document to “{req}”</b>
          <button onClick={onClose} style={{ ...btnGhost, padding: 7 }}>
            <X size={15} />
          </button>
        </div>
        <p style={{ fontSize: 12, color: T.muted, margin: "0 0 10px" }}>
          The selected document is re-tagged as {req} and reused everywhere that requirement appears.
        </p>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your documents"
          style={{
            background: T.raised,
            border: `1px solid ${T.border}`,
            borderRadius: 9,
            padding: "8px 11px",
            color: T.text,
            fontSize: 13.5,
            outline: "none",
            marginBottom: 8,
          }}
        />
        <div style={{ flex: 1, overflowY: "auto", border: `1px solid ${T.border}`, borderRadius: 11 }}>
          {list.length === 0 ? (
            <div style={{ padding: 16, fontSize: 13, color: T.faint }}>No documents match.</div>
          ) : (
            list.map((d: Doc, i: number) => (
              <button
                key={d.id}
                onClick={() => onPick(d)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  borderTop: i ? `1px solid ${T.border}` : "none",
                  padding: "9px 13px",
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{d.docType}</div>
                <div style={{ fontSize: 11.5, color: T.faint, fontFamily: "ui-monospace, monospace" }}>
                  {d.name} · {nameOf(d.memberId)}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ DOCUMENTS ═══════════════ */
function Documents({ store, toast }: any) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");
  const [person, setPerson] = useState<string>("All");
  const [source, setSource] = useState<string>("All");
  const [quick, setQuick] = useState<"all" | "expiring" | "expired" | "recent" | "proofs">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "name" | "expiry">("newest");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Doc | null>(null);
  const [preview, setPreview] = useState<Doc | null>(null);
  const [upMenu, setUpMenu] = useState(false);
  const [fSheet, setFSheet] = useState(false);
  const [addSheet, setAddSheet] = useState(false);
  const isMobile = useIsMobile();

  const nameOf = (mid?: string) => store.members.find((m: Member) => m.id === mid)?.name || "Unassigned";
  const colorOf = (mid?: string) => store.members.find((m: Member) => m.id === mid)?.color || T.faint;
  const fdate = (s?: string) =>
    s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "—";

  const docs: Doc[] = store.docs;
  const expiring = docs.filter((d) => d.expiry && daysTo(d.expiry) >= 0 && daysTo(d.expiry) < 60);
  const expired = docs.filter((d) => d.expiry && daysTo(d.expiry) < 0);
  const recent = docs.filter((d) => (Date.now() - +new Date(d.addedAt)) / 86400000 <= 7);

  const filtered = useMemo(() => {
    let list = docs;
    if (quick === "expiring") list = list.filter((d) => d.expiry && daysTo(d.expiry) >= 0 && daysTo(d.expiry) < 60);
    if (quick === "expired") list = list.filter((d) => d.expiry && daysTo(d.expiry) < 0);
    if (quick === "recent") list = list.filter((d) => (Date.now() - +new Date(d.addedAt)) / 86400000 <= 7);
    if (quick === "proofs") list = list.filter((d) => d.docType === "Transaction Evidence");
    if (cat !== "All") list = list.filter((d) => d.category === cat);
    if (person !== "All") list = list.filter((d) => (d.memberId || "") === person);
    if (source !== "All") list = list.filter((d) => d.source === source);
    const needle = q.trim().toLowerCase();
    if (needle)
      list = list.filter((d) =>
        `${d.docType} ${d.name} ${d.category} ${nameOf(d.memberId)} ${d.source} ${d.notes || ""}`
          .toLowerCase()
          .includes(needle),
      );
    const by: Record<string, (a: Doc, b: Doc) => number> = {
      newest: (a, b) => +new Date(b.addedAt) - +new Date(a.addedAt),
      oldest: (a, b) => +new Date(a.addedAt) - +new Date(b.addedAt),
      name: (a, b) => a.docType.localeCompare(b.docType),
      expiry: (a, b) => (a.expiry ? +new Date(a.expiry) : Infinity) - (b.expiry ? +new Date(b.expiry) : Infinity),
    };
    return [...list].sort(by[sort]);
  }, [docs, quick, cat, person, source, q, sort, store.members]);

  const allSel = filtered.length > 0 && filtered.every((d) => sel.has(d.id));
  const toggleAll = () => setSel(allSel ? new Set() : new Set(filtered.map((d) => d.id)));
  const toggle = (id: string) =>
    setSel((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const clearSel = () => setSel(new Set());
  const bulkDelete = async () => {
    for (const id of sel) await store.removeDoc(id);
    toast(`${sel.size} document(s) removed`);
    clearSel();
  };
  const bulkAssign = (mid: string) => {
    sel.forEach((id) => store.updateDoc(id, { memberId: mid }));
    toast(`${sel.size} document(s) assigned to ${nameOf(mid)}`);
    clearSel();
  };

  const expiryCell = (d: Doc) => {
    if (!d.expiry) return <span style={{ color: T.faint }}>—</span>;
    const n = daysTo(d.expiry);
    const c = n < 0 ? T.coral : n < 60 ? T.gold : T.muted;
    return <span style={{ color: c, fontWeight: n < 60 ? 700 : 400 }}>{n < 0 ? "expired" : `${n}d`}</span>;
  };
  const panels = (
    <>
      {open && (
        <DocContextPanel
          key={open.id}
          d={store.docs.find((x: Doc) => x.id === open.id) || open}
          store={store}
          toast={toast}
          onClose={() => setOpen(null)}
          onPreview={() => setPreview(store.docs.find((x: Doc) => x.id === open.id) || open)}
          onDeleted={() => setOpen(null)}
        />
      )}
      {preview && <DocViewer doc={preview} store={store} onClose={() => setPreview(null)} />}
    </>
  );

  const catsAll = ["All", ...Array.from(new Set(docs.map((d) => d.category)))];
  const addAndToast = (files: FileList | null, msg: string) => {
    if (files?.length) {
      store.addFiles(files);
      toast(msg.replace("{n}", String(files.length)));
    }
  };
  if (isMobile) {
    const Opt = ({ on, onClick, children }: any) => (
      <button
        onClick={onClick}
        style={{
          padding: "7px 13px",
          borderRadius: 99,
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          border: `1px solid ${on ? T.gold + "77" : T.border}`,
          background: on ? T.raised : "transparent",
          color: on ? T.white : T.muted,
        }}
      >
        {children}
      </button>
    );
    const Sec = ({ label, children }: any) => (
      <div style={{ margin: "12px 0" }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.5, color: T.faint, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{children}</div>
      </div>
    );
    const activeChips: { label: string; clear: () => void }[] = [];
    if (quick !== "all") activeChips.push({ label: { expiring: "Expiring soon", expired: "Expired", recent: "Added this week", proofs: "Proofs" }[quick]!, clear: () => setQuick("all") });
    if (cat !== "All") activeChips.push({ label: cat, clear: () => setCat("All") });
    if (person !== "All") activeChips.push({ label: nameOf(person), clear: () => setPerson("All") });
    if (sort !== "newest") activeChips.push({ label: { oldest: "Oldest first", name: "By name", expiry: "By expiry" }[sort]!, clear: () => setSort("newest") });
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0 12px" }}>
          <b style={{ fontSize: 18, fontWeight: 800, color: T.white }}>Documents</b>
          <span style={pill(T.muted)}>{docs.length}</span>
          <span style={{ flex: 1 }} />
          <button onClick={() => setAddSheet(true)} title="Add documents" style={{ ...btnGhost, padding: 10, borderRadius: 12 }}>
            <Plus size={17} />
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            background: T.panel,
            border: `1px solid ${q ? T.gold + "66" : T.border}`,
            borderRadius: 11,
            padding: "7px 12px",
            marginBottom: 10,
          }}
        >
          <Search size={15} color={T.muted} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search documents…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: T.text }}
          />
          {q && (
            <button onClick={() => setQ("")} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, display: "flex" }}>
              <X size={14} />
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ fontSize: 12.5, color: T.muted }}>
            {filtered.length === docs.length ? `${docs.length} documents` : `${filtered.length} of ${docs.length}`}
          </span>
          {activeChips.map((c, i) => (
            <button
              key={i}
              onClick={c.clear}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 9px",
                borderRadius: 99,
                fontSize: 11.5,
                fontWeight: 600,
                border: `1px solid ${T.gold}55`,
                background: T.raised,
                color: T.white,
                cursor: "pointer",
              }}
            >
              {c.label} <X size={11} />
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <button
            onClick={() => setFSheet(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.gold, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "6px 2px" }}
          >
            <SlidersHorizontal size={14} /> Filter
          </button>
        </div>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 26, textAlign: "center", color: T.muted, fontSize: 13.5 }}>
              {docs.length === 0 ? "Your vault is empty. Add your first document." : "Nothing matches. Try clearing a filter."}
            </div>
          ) : (
            filtered.map((d, i) => {
              const col = CAT_META[d.category as Category].color;
              const Ic = CAT_META[d.category as Category].icon;
              const checked = sel.has(d.id);
              return (
                <div
                  key={d.id}
                  onClick={() => setOpen(d)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "12px 13px",
                    borderTop: i ? `1px solid ${T.border}` : "none",
                    cursor: "pointer",
                    background: checked ? T.raised : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggle(d.id)}
                    style={{ accentColor: T.gold, width: 16, height: 16, flexShrink: 0 }}
                  />
                  <span
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 9, background: col + "22", flexShrink: 0 }}
                  >
                    <Ic size={15} color={col} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: T.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.docType}
                    </span>
                    <span style={{ display: "block", fontSize: 12, color: T.muted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {nameOf(d.memberId)} · {d.expiry ? <>{expiryCell(d)}</> : fdate(d.addedAt)}
                    </span>
                  </span>
                  <ChevronRight size={15} color={T.faint} style={{ flexShrink: 0 }} />
                </div>
              );
            })
          )}
        </Card>
        {sel.size > 0 && (
          <div
            style={{
              position: "fixed",
              left: 10,
              right: 10,
              bottom: "calc(74px + env(safe-area-inset-bottom))",
              zIndex: 56,
              display: "flex",
              alignItems: "center",
              gap: 9,
              background: T.raised,
              border: `1px solid ${T.gold}55`,
              borderRadius: 14,
              padding: "9px 12px",
              boxShadow: "0 14px 40px rgba(0,0,0,.5)",
            }}
          >
            <b style={{ fontSize: 13, color: T.white }}>{sel.size} selected</b>
            <select
              onChange={(e) => e.target.value && bulkAssign(e.target.value)}
              defaultValue=""
              style={{ flex: 1, background: T.panel, color: T.text, border: `1px solid ${T.border}`, borderRadius: 9, padding: "7px 8px", fontSize: 13 }}
            >
              <option value="" disabled>
                Assign to…
              </option>
              {store.members.map((m: Member) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button onClick={bulkDelete} title="Delete selected" style={{ ...btnGhost, padding: 9, color: T.coral }}>
              <Trash2 size={15} color={T.coral} />
            </button>
            <button onClick={clearSel} title="Clear selection" style={{ ...btnGhost, padding: 9 }}>
              <X size={15} />
            </button>
          </div>
        )}
        {addSheet && (
          <MSheet title="Add documents" onClose={() => setAddSheet(false)}>
            <label className="lp-sheet-item">
              <FileText size={19} color={T.muted} /> Upload files
              <input
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  addAndToast(e.target.files, "{n} document(s) added");
                  e.currentTarget.value = "";
                  setAddSheet(false);
                }}
              />
            </label>
            <label className="lp-sheet-item">
              <ImageIcon size={19} color={T.muted} /> From gallery
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  addAndToast(e.target.files, "{n} image(s) added");
                  e.currentTarget.value = "";
                  setAddSheet(false);
                }}
              />
            </label>
            <label className="lp-sheet-item">
              <Camera size={19} color={T.muted} /> Scan with camera
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => {
                  addAndToast(e.target.files, "Scan captured and classified");
                  e.currentTarget.value = "";
                  setAddSheet(false);
                }}
              />
            </label>
          </MSheet>
        )}
        {fSheet && (
          <MSheet title="Filters" onClose={() => setFSheet(false)}>
            <Sec label="Status">
              <Opt on={quick === "all"} onClick={() => setQuick("all")}>All</Opt>
              <Opt on={quick === "expiring"} onClick={() => setQuick("expiring")}>Expiring soon · {expiring.length}</Opt>
              <Opt on={quick === "expired"} onClick={() => setQuick("expired")}>Expired · {expired.length}</Opt>
              <Opt on={quick === "recent"} onClick={() => setQuick("recent")}>Added this week · {recent.length}</Opt>
              <Opt on={quick === "proofs"} onClick={() => setQuick("proofs")}>Proofs</Opt>
            </Sec>
            <Sec label="Category">
              {catsAll.map((c) => (
                <Opt key={c} on={cat === c} onClick={() => setCat(c)}>
                  {c}
                </Opt>
              ))}
            </Sec>
            <Sec label="Person">
              <Opt on={person === "All"} onClick={() => setPerson("All")}>Everyone</Opt>
              {store.members.map((m: Member) => (
                <Opt key={m.id} on={person === m.id} onClick={() => setPerson(m.id)}>
                  {m.name.split(" ")[0]}
                </Opt>
              ))}
            </Sec>
            <Sec label="Sort">
              <Opt on={sort === "newest"} onClick={() => setSort("newest")}>Newest first</Opt>
              <Opt on={sort === "oldest"} onClick={() => setSort("oldest")}>Oldest first</Opt>
              <Opt on={sort === "name"} onClick={() => setSort("name")}>By name</Opt>
              <Opt on={sort === "expiry"} onClick={() => setSort("expiry")}>By expiry</Opt>
            </Sec>
          </MSheet>
        )}
        {panels}
      </div>
    );
  }

  const selStyle: CSSProperties = {
    background: T.raised,
    color: T.text,
    border: `1px solid ${T.border}`,
    borderRadius: 9,
    padding: "8px 10px",
    fontSize: 13,
    outline: "none",
  };
  const quickChips: { k: typeof quick; label: string; n: number; tone?: string }[] = [
    { k: "all", label: "All", n: docs.length },
    { k: "expiring", label: "Expiring soon", n: expiring.length, tone: T.gold },
    { k: "expired", label: "Expired", n: expired.length, tone: T.coral },
    { k: "recent", label: "Added this week", n: recent.length, tone: T.mint },
    {
      k: "proofs",
      label: "Proofs",
      n: docs.filter((d: Doc) => d.docType === "Transaction Evidence").length,
      tone: A.blue,
    },
  ];
  const GRID = "26px 2.1fr 1.15fr 0.95fr 0.85fr 0.75fr 0.65fr 30px";

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          columnGap: 16,
          flexWrap: "wrap",
        }}
      >
        <SectionHead
          title="Documents"
          sub={`${docs.length} records in your archive. Search, filter, and open any row for full context.`}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <div style={{ position: "relative" }}>
            <button onClick={() => setUpMenu((v) => !v)} style={btnGold}>
              <UploadCloud size={15} /> Upload <ChevronDown size={14} />
            </button>
            {upMenu && (
              <>
                <div onClick={() => setUpMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 72 }} />
                <div
                  className="lp-upmenu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    zIndex: 73,
                    width: 190,
                    background: T.panel,
                    border: `1px solid ${T.border}`,
                    borderRadius: 12,
                    padding: 6,
                    boxShadow: "0 20px 60px rgba(0,0,0,.5)",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 11px",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: T.text,
                    }}
                  >
                    <FileText size={15} color={T.muted} /> Upload files
                    <input
                      type="file"
                      multiple
                      hidden
                      onChange={(e) => {
                        if (e.target.files?.length) {
                          store.addFiles(e.target.files);
                          toast(`${e.target.files.length} document(s) classified`);
                        }
                        e.currentTarget.value = "";
                        setUpMenu(false);
                      }}
                    />
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 11px",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: T.text,
                    }}
                  >
                    <ImageIcon size={15} color={T.muted} /> From gallery
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={(e) => {
                        if (e.target.files?.length) {
                          store.addFiles(e.target.files);
                          toast(`${e.target.files.length} image(s) added`);
                        }
                        e.currentTarget.value = "";
                        setUpMenu(false);
                      }}
                    />
                  </label>
                </div>
              </>
            )}
          </div>
          <label style={{ ...btnGhost, cursor: "pointer" }}>
            <Camera size={15} /> Scan
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                if (e.target.files?.length) {
                  store.addFiles(e.target.files);
                  toast("Scan captured and classified");
                }
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {quickChips.map((c) => {
          const on = quick === c.k;
          return (
            <button
              key={c.k}
              onClick={() => setQuick(c.k)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 13px",
                borderRadius: 99,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                border: `1px solid ${on ? T.gold + "77" : T.border}`,
                background: on ? T.raised : "transparent",
                color: on ? T.white : T.muted,
              }}
            >
              {c.tone && <span style={{ width: 7, height: 7, borderRadius: 9, background: c.tone }} />}
              {c.label}
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: on ? T.gold : T.faint }}>
                {c.n}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: T.panel,
            border: `1px solid ${q ? T.gold + "66" : T.border}`,
            borderRadius: 10,
            padding: "8px 12px",
            flex: "1 1 220px",
            minWidth: 200,
          }}
        >
          <Search size={15} color={T.muted} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search type, file, person, notes…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: T.text, fontSize: 13.5 }}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, display: "flex" }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <select style={selStyle} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option style={{ color: "#000" }}>All</option>
          {(Object.keys(CAT_META) as Category[]).map((c) => (
            <option key={c} style={{ color: "#000" }}>
              {c}
            </option>
          ))}
        </select>
        <select style={selStyle} value={person} onChange={(e) => setPerson(e.target.value)}>
          <option value="All" style={{ color: "#000" }}>
            Everyone
          </option>
          {store.members.map((m: Member) => (
            <option key={m.id} value={m.id} style={{ color: "#000" }}>
              {m.name}
            </option>
          ))}
        </select>
        <select style={selStyle} value={source} onChange={(e) => setSource(e.target.value)}>
          {["All", "Upload", "Email", "Drive", "DigiLocker"].map((sName) => (
            <option key={sName} style={{ color: "#000" }}>
              {sName}
            </option>
          ))}
        </select>
        <select style={selStyle} value={sort} onChange={(e) => setSort(e.target.value as any)}>
          <option value="newest" style={{ color: "#000" }}>
            Newest first
          </option>
          <option value="oldest" style={{ color: "#000" }}>
            Oldest first
          </option>
          <option value="name" style={{ color: "#000" }}>
            Type A–Z
          </option>
          <option value="expiry" style={{ color: "#000" }}>
            Expiry soonest
          </option>
        </select>
      </div>

      {sel.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: T.raised,
            border: `1px solid ${T.gold}55`,
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 12,
          }}
        >
          <b style={{ color: T.white, fontSize: 13.5 }}>{sel.size} selected</b>
          <select style={selStyle} defaultValue="" onChange={(e) => e.target.value && bulkAssign(e.target.value)}>
            <option value="" disabled style={{ color: "#000" }}>
              Assign to…
            </option>
            {store.members.map((m: Member) => (
              <option key={m.id} value={m.id} style={{ color: "#000" }}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            onClick={bulkDelete}
            style={{ ...btnGhost, color: T.coral, borderColor: T.coral + "55", padding: "7px 12px", fontSize: 12.5 }}
          >
            <Trash2 size={13} /> Delete
          </button>
          <button onClick={clearSel} style={{ ...btnGhost, marginLeft: "auto", padding: "7px 12px", fontSize: 12.5 }}>
            Clear
          </button>
        </div>
      )}

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <div className="lp-doc-min" style={{ minWidth: 780 }}>
            <div
              className="lp-doc-head"
              style={{
                display: "grid",
                gridTemplateColumns: GRID,
                gap: 10,
                alignItems: "center",
                padding: "12px 16px",
                fontSize: 11,
                fontWeight: 700,
                color: T.muted,
                textTransform: "uppercase",
                letterSpacing: 1,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              <input
                type="checkbox"
                checked={allSel}
                onChange={toggleAll}
                style={{ accentColor: T.gold, cursor: "pointer" }}
              />
              <span>Document</span>
              <span>Person</span>
              <span>Category</span>
              <span>Source</span>
              <span>Added</span>
              <span>Expiry</span>
              <span />
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: "40px 16px", textAlign: "center" }}>
                <FolderOpen size={30} color={T.faint} style={{ margin: "0 auto 10px", display: "block" }} />
                <div style={{ color: T.text, fontWeight: 600, fontSize: 14.5 }}>
                  {docs.length === 0 ? "Your vault is waiting for its first document" : "No documents match these filters"}
                </div>
                <div style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>
                  {docs.length === 0
                    ? "Upload a file and it files itself."
                    : "Try clearing the search or switching a filter."}
                </div>
              </div>
            ) : (
              filtered.map((d) => {
                const Ic = CAT_META[d.category].icon;
                const col = CAT_META[d.category].color;
                const active = open?.id === d.id;
                return (
                  <div
                    key={d.id}
                    className="lp-doc-row"
                    onClick={() => setOpen(d)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: GRID,
                      gap: 10,
                      alignItems: "center",
                      padding: "11px 16px",
                      borderTop: `1px solid ${T.border}`,
                      cursor: "pointer",
                      background: active ? T.raised : sel.has(d.id) ? T.raised + "88" : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={sel.has(d.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggle(d.id)}
                      style={{ accentColor: T.gold, cursor: "pointer" }}
                    />
                    <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <span
                        style={{
                          display: "grid",
                          placeItems: "center",
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: col + "22",
                          flexShrink: 0,
                        }}
                      >
                        <Ic size={14} color={col} />
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span
                          style={{
                            display: "block",
                            fontSize: 14,
                            fontWeight: 600,
                            color: T.white,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {d.docType}
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontSize: 11.5,
                            color: T.faint,
                            fontFamily: "ui-monospace, monospace",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {d.name}
                        </span>
                      </span>
                    </span>
                    <span className="lp-dc-meta">
                    <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span
                        style={{ width: 8, height: 8, borderRadius: 9, background: colorOf(d.memberId), flexShrink: 0 }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          color: T.text,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {nameOf(d.memberId)}
                      </span>
                    </span>
                    <span>
                      <span style={pill(col)}>{d.category}</span>
                    </span>
                    <span style={{ fontSize: 12.5, color: T.muted }}>{d.source}</span>
                    <span style={{ fontSize: 12.5, color: T.muted, fontFamily: "ui-monospace, monospace" }}>
                      {fdate(d.addedAt)}
                    </span>
                    <span style={{ fontSize: 12.5, fontFamily: "ui-monospace, monospace" }}>{expiryCell(d)}</span>
                    </span>
                    <ChevronRight size={15} color={active ? T.gold : T.faint} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>

      {panels}
    </div>
  );
}

/* ── document context drawer ── */
function DocContextPanel({ d, store, toast, onClose, onPreview, onDeleted }: any) {
  const [notes, setNotes] = useState(d.notes || "");
  const Ic = CAT_META[d.category as Category].icon;
  const col = CAT_META[d.category as Category].color;
  const nameOf = (mid?: string) => store.members.find((m: Member) => m.id === mid)?.name || "Unassigned";
  const usedIn = EVENTS.filter((e) => e.reqs.includes(d.docType));
  const holdings = store.holdings.filter((h: Holding) => h.docId === d.id);
  const txs = store.transactions.filter((t: Transaction) => t.docId === d.id);
  const days = d.expiry ? daysTo(d.expiry) : null;

  const lbl: CSSProperties = {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: T.muted,
    fontFamily: "ui-monospace, monospace",
    margin: "16px 0 7px",
    display: "block",
  };
  const inp: CSSProperties = {
    width: "100%",
    background: T.raised,
    border: `1px solid ${T.border}`,
    borderRadius: 9,
    padding: "8px 10px",
    color: T.text,
    fontSize: 13.5,
    outline: "none",
  };
  const fact = (label: string, value: ReactNode) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        padding: "7px 0",
        borderTop: `1px solid ${T.border}`,
      }}
    >
      <span style={{ fontSize: 12.5, color: T.muted }}>{label}</span>
      <span style={{ fontSize: 12.5, color: T.text, fontFamily: "ui-monospace, monospace", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 72, background: "rgba(4,7,15,.5)" }} />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(430px, 94vw)",
          zIndex: 73,
          background: T.navy,
          borderLeft: `1px solid ${T.border}`,
          boxShadow: "-30px 0 80px rgba(0,0,0,.55)",
          display: "flex",
          flexDirection: "column",
          animation: "lpSlideIn .22s ease",
        }}
      >
        <style>{`@keyframes lpSlideIn { from { transform: translateX(40px); opacity: 0 } to { transform: none; opacity: 1 } }`}</style>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "18px 20px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 40,
              height: 40,
              borderRadius: 10,
              background: col + "22",
              flexShrink: 0,
            }}
          >
            <Ic size={18} color={col} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16.5, fontWeight: 700, color: T.white }}>{d.docType}</div>
            <div
              style={{
                fontSize: 11.5,
                color: T.faint,
                fontFamily: "ui-monospace, monospace",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {d.name}
            </div>
          </div>
          <button onClick={onClose} style={{ ...btnGhost, padding: 8 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 20px" }}>
          {d.expiry && (
            <div
              style={{
                marginTop: 16,
                borderRadius: 12,
                border: `1px solid ${(days! < 0 ? T.coral : days! < 60 ? T.gold : T.mint) + "55"}`,
                background: (days! < 0 ? T.coral : days! < 60 ? T.gold : T.mint) + "14",
                padding: "11px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Clock size={15} color={days! < 0 ? T.coral : days! < 60 ? T.gold : T.mint} />
              <span style={{ fontSize: 13, color: T.text }}>
                {days! < 0 ? `Expired ${-days!} days ago` : `Valid · expires in ${days} days`}
              </span>
            </div>
          )}

          <span style={lbl}>Details</span>
          <div>
            {fact("Category", d.category)}
            {fact("Source", d.source)}
            {fact(
              "Added",
              new Date(d.addedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            )}
            {d.docDate &&
              fact(
                "Document date",
                new Date(d.docDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              )}
            {fact("Size", `${d.sizeKB} KB`)}
          </div>

          <span style={lbl}>Belongs to</span>
          <select
            style={inp}
            value={d.memberId || ""}
            onChange={(e) => {
              store.updateDoc(d.id, { memberId: e.target.value || undefined });
              toast(`Assigned to ${nameOf(e.target.value)}`);
            }}
          >
            <option value="" style={{ color: "#000" }}>
              Unassigned
            </option>
            {store.members.map((m: Member) => (
              <option key={m.id} value={m.id} style={{ color: "#000" }}>
                {m.name}
              </option>
            ))}
          </select>

          <span style={lbl}>Expiry</span>
          <input
            style={inp}
            type="date"
            value={d.expiry ? d.expiry.slice(0, 10) : ""}
            onChange={(e) => {
              store.updateDoc(d.id, { expiry: e.target.value || undefined });
              toast(e.target.value ? "Expiry updated" : "Expiry cleared");
            }}
          />

          <span style={lbl}>Used in packages</span>
          {usedIn.length === 0 ? (
            <p style={{ fontSize: 12.5, color: T.faint, margin: 0 }}>No life-event package requires a {d.docType}.</p>
          ) : (
            usedIn.map((e) => (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  borderTop: `1px solid ${T.border}`,
                }}
              >
                <e.icon size={14} color={e.accent} />
                <span style={{ flex: 1, fontSize: 13, color: T.text }}>{e.name}</span>
                <span style={pill(T.mint)}>required</span>
              </div>
            ))
          )}

          {(holdings.length > 0 || txs.length > 0) && (
            <>
              <span style={lbl}>Cited as evidence</span>
              {holdings.map((h: Holding) => (
                <div
                  key={h.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderTop: `1px solid ${T.border}`,
                  }}
                >
                  <Coins size={14} color={T.gold} />
                  <span style={{ flex: 1, fontSize: 13, color: T.text }}>{h.name}</span>
                  <span style={{ fontSize: 12, color: T.muted, fontFamily: "ui-monospace, monospace" }}>
                    {money(h.value || 0)}
                  </span>
                </div>
              ))}
              {txs.map((t: Transaction) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderTop: `1px solid ${T.border}`,
                  }}
                >
                  <Receipt size={14} color={t.direction === "paid" ? T.coral : T.mint} />
                  <span style={{ flex: 1, fontSize: 13, color: T.text }}>{t.purpose}</span>
                  <span style={{ fontSize: 12, color: T.muted, fontFamily: "ui-monospace, monospace" }}>
                    {money(t.amount)}
                  </span>
                </div>
              ))}
            </>
          )}

          <span style={lbl}>Notes</span>
          <textarea
            style={{ ...inp, minHeight: 70, resize: "vertical", fontFamily: "inherit" }}
            value={notes}
            placeholder="Anything your family should know about this document…"
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              if ((d.notes || "") !== notes) {
                store.updateDoc(d.id, { notes: notes || undefined });
                toast("Notes saved");
              }
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderTop: `1px solid ${T.border}` }}>
          <button onClick={onPreview} style={{ ...btnGold, flex: 1, justifyContent: "center" }}>
            <FileText size={15} /> Preview
          </button>
          <button
            onClick={async () => {
              await store.removeDoc(d.id);
              toast("Document removed");
              onDeleted();
            }}
            style={{ ...btnGhost, color: T.coral, borderColor: T.coral + "55" }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </aside>
    </>
  );
}

function AddMember({ onClose, save }: any) {
  const [f, setF] = useState({
    name: "",
    relation: "Parent",
    access: "View only" as Access,
    blood: "O+",
    dob: "1960-01-01",
  });
  const colors = [A.blue, A.purple, A.green, A.pink, A.gold, A.teal];
  const inp: CSSProperties = {
    width: "100%",
    background: T.raised,
    border: `1px solid ${T.border}`,
    borderRadius: 9,
    padding: "9px 11px",
    color: T.text,
    fontSize: 14,
    outline: "none",
  };
  const lbl: CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: T.muted,
    fontFamily: "ui-monospace, monospace",
    marginBottom: 5,
    display: "block",
  };
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 72,
        background: "rgba(4,7,15,.62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.panel,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          width: "min(440px,100%)",
          maxHeight: "88vh",
          overflowY: "auto",
          padding: 22,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <b style={{ color: T.white, fontSize: 18 }}>Add a family member</b>
          <button onClick={onClose} style={{ ...btnGhost, padding: 8 }}>
            <X size={16} />
          </button>
        </div>
        <label style={lbl}>Name</label>
        <input
          style={inp}
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="e.g. Taylor Morgan"
        />
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Relation</label>
            <select style={inp} value={f.relation} onChange={(e) => setF({ ...f, relation: e.target.value })}>
              {["Spouse", "Father", "Mother", "Son", "Daughter", "Sibling", "Parent", "Other"].map((r) => (
                <option key={r} style={{ color: "#000" }}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Access</label>
            <select style={inp} value={f.access} onChange={(e) => setF({ ...f, access: e.target.value as Access })}>
              {(["Full member", "Emergency access", "View only"] as Access[]).map((a) => (
                <option key={a} style={{ color: "#000" }}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Date of birth</label>
            <input type="date" style={inp} value={f.dob} onChange={(e) => setF({ ...f, dob: e.target.value })} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Blood group</label>
            <select style={inp} value={f.blood} onChange={(e) => setF({ ...f, blood: e.target.value })}>
              {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((b) => (
                <option key={b} style={{ color: "#000" }}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          disabled={!f.name}
          onClick={() =>
            save(
              {
                id:
                  f.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, "")
                    .slice(0, 8) + Math.random().toString(36).slice(2, 5),
                name: f.name,
                relation: f.relation,
                color: colors[Math.floor(Math.random() * colors.length)],
                dob: f.dob,
                bloodGroup: f.blood,
                access: f.access,
              },
              { conditions: [], medications: [], allergies: "None recorded", doctor: "", emergency: "" },
            )
          }
          style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 18, opacity: f.name ? 1 : 0.4 }}
        >
          Create profile
        </button>
      </div>
    </div>
  );
}

/* ═══════════════ WEALTH (derived from documents with value) ═══════════════ */
function Wealth({ store, go, toast, unlocked, onUnlock }: any) {
  const [pinModal, setPinModal] = useState(false);
  const [showMath, setShowMath] = useState(false);
  const [viewDoc, setViewDoc] = useState<Doc | null>(null);
  const [edit, setEdit] = useState<Holding | null>(null);
  const [addTx, setAddTx] = useState(false);
  const [sos, setSos] = useState(false);
  const [nomineeFor, setNomineeFor] = useState<Holding | null>(null);
  const [estate, setEstate] = useState(false);
  const attachRef = useRef<HTMLInputElement>(null);
  const pending = useRef<Holding | null>(null);

  const H: Holding[] = store.holdings;
  const assets = H.filter((h) => h.kind === "asset");
  const liabilities = H.filter((h) => h.kind === "liability");
  const covers = H.filter((h) => h.kind === "cover");
  const sum = (a: Holding[]) => a.reduce((s, h) => s + (h.value || 0), 0);
  const totalAssets = sum(assets),
    totalLiab = sum(liabilities),
    net = totalAssets - totalLiab,
    totalCover = sum(covers);
  const guarded = H.filter((h) => h.kind === "asset" || h.kind === "cover");
  const readiness = Math.round(
    (sum(guarded.filter((h) => h.nominee && h.docId && h.accessNote)) / (sum(guarded) || 1)) * 100,
  );
  const missNom = guarded.filter((h) => !h.nominee).length;
  const missDoc = guarded.filter((h) => !h.docId).length;
  const missAcc = guarded.filter((h) => !h.accessNote).length;
  const fixMins = missNom * 2 + missDoc * 3 + missAcc * 2;
  const readyColor = readiness >= 80 ? T.mint : readiness >= 50 ? T.gold : T.coral;
  const trusted = store.members.filter((m: Member) => m.access === "Full member" || m.access === "Emergency access");
  const linkedDoc = (h: Holding) => store.docs.find((d: Doc) => d.id === h.docId) || null;

  type Sev = "critical" | "important" | "info";
  const SEVC: Record<Sev, string> = { critical: T.coral, important: T.gold, info: A.blue };
  const gaps: {
    h: Holding;
    kind: "nominee" | "doc" | "renewal" | "maturity" | "access";
    sev: Sev;
    label: string;
    impact: string;
  }[] = [];
  H.forEach((h) => {
    const guardedKind = h.kind === "asset" || h.kind === "cover";
    const v = h.value || 0;
    if (guardedKind && !h.nominee)
      gaps.push({
        h,
        kind: "nominee",
        sev: "critical",
        label: `${h.name} · no nominee named`,
        impact: "legal heir process instead of a claim · typically 6+ months",
      });
    if (guardedKind && !h.docId)
      gaps.push({
        h,
        kind: "doc",
        sev: v >= 1000000 ? "critical" : "important",
        label: `${h.name} · no document on file`,
        impact: `${money(v)} undocumented · claims stall without proof`,
      });
    if (guardedKind && !h.accessNote)
      gaps.push({
        h,
        kind: "access",
        sev: v >= 500000 ? "critical" : "important",
        label: `${h.name} · no access instructions`,
        impact: `${money(v)} effectively locked for the family`,
      });
    if (h.maturityDate && daysTo(h.maturityDate) >= 0 && daysTo(h.maturityDate) < 60)
      gaps.push({
        h,
        kind: "maturity",
        sev: "info",
        label: `${h.name} matures in ${daysTo(h.maturityDate)} days`,
        impact: "decide renewal or reinvestment",
      });
  });
  covers.forEach((c) => {
    if (c.renewalDate && daysTo(c.renewalDate) < 60)
      gaps.push({
        h: c,
        kind: "renewal",
        sev: daysTo(c.renewalDate) < 15 ? "critical" : "important",
        label: `${c.name} renews in ${daysTo(c.renewalDate)} days`,
        impact: "cover lapses if the premium is missed",
      });
  });
  const sevRank: Record<Sev, number> = { critical: 0, important: 1, info: 2 };
  gaps.sort((a, b) => sevRank[a.sev] - sevRank[b.sev]);
  const txs: Transaction[] = store.transactions || [];

  const attach = (h: Holding) => {
    pending.current = h;
    attachRef.current?.click();
  };
  const onAttachFiles = (files: FileList) => {
    const h = pending.current;
    if (!h || !files.length) return;
    const cat: Category = h.kind === "cover" ? "Insurance" : h.type === "Property" ? "Property" : "Finance";
    store.attachDocToHolding(h.id, files, { category: cat, docType: h.type, memberId: h.memberId || "you" });
    toast("Document attached");
    pending.current = null;
  };

  const stat = (label: string, val: string, color: string) => (
    <Card>
      <div style={{ fontSize: 13, color: T.muted }}>{label}</div>
      <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 24, fontWeight: 800, color, marginTop: 8 }}>
        {val}
      </div>
    </Card>
  );
  const Chip = ({ ok, label }: { ok: boolean; label: string }) => (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        fontFamily: "ui-monospace, monospace",
        color: ok ? T.mint : T.coral,
        background: (ok ? T.mint : T.coral) + "14",
        border: `1px solid ${ok ? T.mint : T.coral}44`,
        borderRadius: 6,
        padding: "2px 7px",
      }}
    >
      {ok ? "✓" : "✗"} {label}
    </span>
  );
  const Row = ({ h }: { h: Holding }) => {
    const d = linkedDoc(h);
    const accent = h.kind === "liability" ? T.coral : h.kind === "cover" ? A.teal : T.gold;
    const Ic = h.kind === "liability" ? Landmark : h.kind === "cover" ? ShieldCheck : Coins;
    const guardedKind = h.kind === "asset" || h.kind === "cover";
    return (
      <div
        className="lp-wrow"
        onClick={() => setEdit(h)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "13px 16px",
          borderTop: `1px solid ${T.border}`,
          cursor: "pointer",
        }}
      >
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 36,
            height: 36,
            borderRadius: 9,
            background: accent + "22",
          }}
        >
          <Ic size={16} color={accent} />
        </span>
        <div className="lp-wname" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: T.white }}>{h.name}</div>
          <div style={{ fontSize: 12.5, color: T.muted }}>
            {h.type}
            {h.institution ? ` · ${h.institution}` : ""}
            {h.accountRef ? ` ${h.accountRef}` : ""}
          </div>
        </div>
        <span
          className="lp-wamt"
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 15,
            fontWeight: 700,
            color: h.kind === "liability" ? T.coral : T.text,
          }}
        >
          {h.kind === "liability" ? "\u2212" : ""}
          {money(h.value || 0)}
        </span>
        {guardedKind && (
          <span className="lp-wchips" style={{ display: "inline-flex", gap: 6, flexShrink: 0 }}>
            <span
              onClick={(e) => {
                e.stopPropagation();
                d ? setViewDoc(d) : attach(h);
              }}
              style={{ cursor: "pointer" }}
              title={d ? "View document" : "Attach document"}
            >
              <Chip ok={!!d} label="Doc" />
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (!h.nominee) setNomineeFor(h);
              }}
              style={{ cursor: h.nominee ? "default" : "pointer" }}
              title={h.nominee ? h.nomineeName || "Nominee named" : "Add nominee"}
            >
              <Chip ok={!!h.nominee} label="Nominee" />
            </span>
            <Chip ok={!!h.accessNote} label="Access" />
          </span>
        )}
        <ChevronRight size={14} color={T.faint} />
      </div>
    );
  };
  const groups: [string, Holding[]][] = [
    ["Assets", assets],
    ["Liabilities", liabilities],
    ["Protection", covers],
  ];

  return (
    <div>
      {store.wealthPin && !unlocked ? (
        <>
          <SectionHead title="Wealth" sub="Locked" />
          <WealthLock store={store} onUnlock={onUnlock} toast={toast} />
        </>
      ) : (
        <>
          <SectionHead
            title="Wealth"
            sub="Not a balance sheet: whether your family could access all of it if something happened to you."
          />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "0 0 28px" }}>
            <button onClick={() => setAddTx(true)} style={btnGhost}>
              <Receipt size={15} /> Capture proof
            </button>
            <button
              onClick={() => setSos(true)}
              style={{ ...btnGhost, color: T.coral, borderColor: T.coral + "66", fontWeight: 700 }}
            >
              <Siren size={15} /> SOS handoff
            </button>
          </div>

          {store.handoff && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                background: T.coral + "14",
                border: `1px solid ${T.coral}66`,
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 16,
              }}
            >
              <Siren size={16} color={T.coral} />
              <span style={{ flex: 1, fontSize: 13.5, color: T.text }}>
                <b style={{ color: T.coral }}>SOS handoff active</b> ({store.handoff.reason}) since{" "}
                {new Date(store.handoff.releasedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                · shared with{" "}
                {store.handoff.recipients
                  .map((id: string) => store.members.find((mm: Member) => mm.id === id)?.name.split(" ")[0])
                  .filter(Boolean)
                  .join(", ")}
              </span>
              <button
                onClick={() => {
                  store.cancelHandoff();
                  toast("Handoff cancelled · access revoked");
                }}
                style={{
                  ...btnGhost,
                  color: T.coral,
                  borderColor: T.coral + "55",
                  padding: "7px 12px",
                  fontSize: 12.5,
                }}
              >
                Cancel handoff
              </button>
            </div>
          )}
          <div
            className="lp-readystrip"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
              border: `1px solid ${T.border}`,
              background: T.panel,
              borderRadius: 14,
              padding: "12px 16px",
              marginBottom: 12,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <KeyRound size={15} color={T.muted} />
              <b style={{ color: T.white, fontSize: 13.5 }}>Estate readiness</b>
            </span>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 24, fontWeight: 800, color: readyColor }}>
              {readiness}%
            </span>
            <span
              style={{
                flex: "1 1 140px",
                minWidth: 120,
                height: 7,
                borderRadius: 9,
                background: T.raised,
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: `${readiness}%`,
                  height: "100%",
                  borderRadius: 9,
                  background: readyColor,
                }}
              />
            </span>
            <span style={{ fontSize: 12, color: T.muted, whiteSpace: "nowrap" }}>
              {missDoc + missAcc + missNom === 0
                ? "everything reachable"
                : [
                    missDoc ? `${missDoc} doc${missDoc > 1 ? "s" : ""}` : "",
                    missAcc ? `${missAcc} access` : "",
                    missNom ? `${missNom} nominee` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ") + " missing"}
            </span>
            <button onClick={() => setShowMath((v) => !v)} style={{ ...btnGhost, padding: "6px 11px", fontSize: 12 }}>
              {showMath ? "Hide math" : "How?"}
            </button>
            <span style={{ width: 1, alignSelf: "stretch", background: T.border }} />
            <button onClick={() => setEstate(true)} style={{ ...btnGold, padding: "8px 14px", fontSize: 13 }}>
              <FileText size={14} /> Estate summary <ArrowRight size={13} />
            </button>
          </div>
          {showMath && (
            <Card style={{ marginBottom: 12, padding: "12px 16px" }}>
              <p style={{ fontSize: 12, color: T.muted, margin: "0 0 8px", lineHeight: 1.6 }}>
                Each asset and cover counts as family-reachable only when all three are true: a document on file, a
                nominee named, and access instructions written. Weighted by value, so the home matters more than the FD.
                Liabilities are excluded. Nothing else is scored.
              </p>
              {guarded.map((h) => {
                const ok = !!(h.docId && h.nominee && h.accessNote);
                return (
                  <div
                    key={h.id}
                    style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0", fontSize: 12 }}
                  >
                    <span
                      style={{ width: 8, height: 8, borderRadius: 9, background: ok ? T.mint : T.coral, flexShrink: 0 }}
                    />
                    <span
                      style={{
                        flex: 1,
                        color: T.text,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h.name}
                    </span>
                    <span style={{ fontFamily: "ui-monospace, monospace", color: T.muted }}>
                      {h.docId ? "✓" : "✗"}doc {h.nominee ? "✓" : "✗"}nom {h.accessNote ? "✓" : "✗"}access
                    </span>
                    <span
                      style={{
                        fontFamily: "ui-monospace, monospace",
                        color: ok ? T.mint : T.coral,
                        width: 74,
                        textAlign: "right",
                      }}
                    >
                      {money(h.value || 0)}
                    </span>
                  </div>
                );
              })}
            </Card>
          )}
          <div
            style={{
              display: "flex",
              gap: 22,
              flexWrap: "wrap",
              alignItems: "center",
              padding: "10px 16px",
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              background: T.panel,
              marginBottom: 24,
              fontFamily: "ui-monospace, monospace",
              fontSize: 13.5,
            }}
          >
            <span style={{ color: T.muted }}>
              Net worth <b style={{ color: T.white }}>{money(net)}</b>
            </span>
            <span style={{ color: T.muted }}>
              Assets <b style={{ color: T.mint }}>{money(totalAssets)}</b>
            </span>
            <span style={{ color: T.muted }}>
              Liabilities <b style={{ color: T.coral }}>{money(totalLiab)}</b>
            </span>
            <span style={{ color: T.muted }}>
              Protection <b style={{ color: A.teal }}>{money(totalCover)}</b>
            </span>
          </div>

          {gaps.length > 0 && (
            <Card style={{ padding: 0, marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 16px" }}>
                <AlertTriangle size={16} color={T.gold} />
                <b style={{ color: T.white, fontSize: 14.5 }}>Needs attention</b>
                <span style={{ marginLeft: "auto", ...pill(T.gold) }}>{gaps.length}</span>
              </div>
              {gaps.map((g, i) => (
                <div
                  key={i}
                  onClick={() =>
                    g.kind === "nominee" ? setNomineeFor(g.h) : g.kind === "doc" ? attach(g.h) : setEdit(g.h)
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "11px 16px",
                    borderTop: `1px solid ${T.border}`,
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 1,
                      fontFamily: "ui-monospace, monospace",
                      color: SEVC[g.sev],
                      border: `1px solid ${SEVC[g.sev]}55`,
                      background: SEVC[g.sev] + "14",
                      borderRadius: 6,
                      padding: "3px 7px",
                      flexShrink: 0,
                      width: 86,
                      textAlign: "center",
                    }}
                  >
                    {g.sev.toUpperCase()}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, color: T.text, fontWeight: 600 }}>{g.label}</span>
                    <span style={{ display: "block", fontSize: 12, color: T.muted, marginTop: 1 }}>{g.impact}</span>
                  </span>
                  <span style={{ fontSize: 12.5, color: SEVC[g.sev], fontWeight: 700, flexShrink: 0 }}>
                    {g.kind === "nominee"
                      ? "Add nominee"
                      : g.kind === "doc"
                        ? "Attach"
                        : g.kind === "access"
                          ? "Add note"
                          : "Review"}
                  </span>
                  <ChevronRight size={14} color={T.faint} />
                </div>
              ))}
            </Card>
          )}

          <div className="lp-cols2">
            <div style={{ display: "grid", gap: 16 }}>
              {groups.map(([label, arr]) =>
                arr.length > 0 ? (
                  <Card key={label} style={{ padding: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "13px 16px",
                      }}
                    >
                      <b style={{ color: T.white, fontSize: 14.5 }}>{label}</b>
                      <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, color: T.muted }}>
                        {money(sum(arr))}
                      </span>
                    </div>
                    {arr.map((h) => (
                      <Row key={h.id} h={h} />
                    ))}
                  </Card>
                ) : null,
              )}
              <Card style={{ padding: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 16px" }}>
                  <Receipt size={16} color={T.muted} />
                  <b style={{ color: T.white, fontSize: 14.5 }}>Proof of payments</b>
                  <button
                    onClick={() => setAddTx(true)}
                    style={{ ...btnGhost, marginLeft: "auto", padding: "6px 12px", fontSize: 12.5 }}
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>
                {txs.length === 0 ? (
                  <p style={{ color: T.muted, fontSize: 13, padding: "0 16px 14px" }}>
                    Record a payment or receipt with its evidence attached, and a follow-up if one is needed.
                  </p>
                ) : (
                  txs.map((t) => {
                    const ev = store.docs.find((d: Doc) => d.id === t.docId);
                    const overdueFu = t.followUpOn && !t.followUpDone;
                    return (
                      <div
                        key={t.id}
                        className="lp-wrow"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 16px",
                          borderTop: `1px solid ${T.border}`,
                        }}
                      >
                        <span
                          style={{
                            display: "grid",
                            placeItems: "center",
                            width: 34,
                            height: 34,
                            borderRadius: 9,
                            background: (t.direction === "paid" ? T.coral : T.mint) + "22",
                            flexShrink: 0,
                          }}
                        >
                          <Receipt size={15} color={t.direction === "paid" ? T.coral : T.mint} />
                        </span>
                        <div className="lp-wname" style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: T.white }}>{t.purpose}</div>
                          <div style={{ fontSize: 12.5, color: T.muted }}>
                            {t.counterparty ? `${t.counterparty} · ` : ""}
                            {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {overdueFu
                              ? ` · follow up ${daysTo(t.followUpOn!) <= 0 ? "today" : `in ${daysTo(t.followUpOn!)}d`}${t.followUpNote ? `: ${t.followUpNote}` : ""}`
                              : ""}
                          </div>
                        </div>
                        <span
                          className="lp-wamt"
                          style={{
                            fontFamily: "ui-monospace, monospace",
                            fontSize: 14.5,
                            fontWeight: 700,
                            color: t.direction === "paid" ? T.coral : T.mint,
                          }}
                        >
                          {t.direction === "paid" ? "\u2212" : "+"}
                          {money(t.amount)}
                        </span>
                        {ev ? (
                          <button
                            onClick={() => setViewDoc(ev)}
                            style={{ ...btnGhost, padding: "6px 10px", fontSize: 12 }}
                          >
                            <Paperclip size={12} /> Evidence
                          </button>
                        ) : (
                          <span style={pill(T.gold)}>no evidence</span>
                        )}
                        {overdueFu && (
                          <button
                            onClick={() => {
                              store.completeFollowUp(t.id);
                              toast("Follow-up done");
                            }}
                            style={{ ...btnGhost, padding: "6px 10px", fontSize: 12 }}
                          >
                            <Check size={12} /> Done
                          </button>
                        )}
                        <button
                          onClick={() => {
                            store.removeTransaction(t.id);
                            toast("Transaction removed");
                          }}
                          title="Remove"
                          style={{ ...btnGhost, padding: 7 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })
                )}
              </Card>
            </div>
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <KeyRound size={16} color={T.muted} />
                <b style={{ color: T.white, fontSize: 15 }}>Legacy handoff</b>
              </div>
              <p style={{ fontSize: 12.5, color: T.muted, margin: "0 0 14px" }}>
                Who steps in, and whether nothing is lost if you are gone.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 14 }}>
                <Ring
                  score={readiness}
                  size={54}
                  color={readiness >= 80 ? T.mint : readiness >= 50 ? T.gold : T.coral}
                />
                <div style={{ fontSize: 13, color: T.muted }}>
                  of documented value has a document, a nominee, and access instructions on file
                </div>
              </div>
              {trusted.map((m: Member) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderTop: `1px solid ${T.border}`,
                  }}
                >
                  <span
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: m.color + "26",
                      color: m.color,
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    {m.name[0]}
                  </span>
                  <span style={{ flex: 1, fontSize: 13.5, color: T.text }}>{m.name}</span>
                  <span style={pill(m.access === "Full member" ? T.mint : A.blue)}>{m.access}</span>
                </div>
              ))}
              <button
                onClick={() => setEstate(true)}
                style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 14 }}
              >
                <FileText size={15} /> Prepare estate summary
              </button>
              <button
                onClick={() => go("trust")}
                style={{ ...btnGhost, width: "100%", justifyContent: "center", marginTop: 8 }}
              >
                Manage trusted people <ArrowRight size={14} />
              </button>
            </Card>
          </div>

          <input
            ref={attachRef}
            type="file"
            hidden
            onChange={(e) => {
              if (e.target.files) onAttachFiles(e.target.files);
              e.currentTarget.value = "";
            }}
          />
          {edit && (
            <HoldingModal
              holding={edit}
              members={store.members}
              onClose={() => setEdit(null)}
              onSave={(h: Holding) => {
                store.updateHolding(h.id, h);
                toast("Holding updated");
                setEdit(null);
              }}
              onDelete={() => {
                store.removeHolding(edit.id);
                toast("Holding removed");
                setEdit(null);
              }}
            />
          )}
          {addTx && (
            <TransactionModal
              members={store.members}
              onClose={() => setAddTx(false)}
              onSave={async (t: Omit<Transaction, "id" | "addedAt" | "docId">, evidence?: File) => {
                await store.addTransaction(t, evidence);
                toast(evidence ? "Transaction saved with evidence" : "Transaction saved");
                setAddTx(false);
              }}
            />
          )}
          {nomineeFor && (
            <NomineeModal
              holding={nomineeFor}
              onClose={() => setNomineeFor(null)}
              onSave={(name: string) => {
                store.updateHolding(nomineeFor.id, { nominee: true, nomineeName: name });
                toast("Nominee added");
                setNomineeFor(null);
              }}
            />
          )}
          {sos && <SOSHandoffModal store={store} toast={toast} onClose={() => setSos(false)} />}
          {estate && <EstateSheet store={store} onClose={() => setEstate(false)} toast={toast} />}
          {viewDoc && <DocViewer doc={viewDoc} store={store} onClose={() => setViewDoc(null)} />}
          {pinModal && (
            <PinModal store={store} hasPin={!!store.wealthPin} onClose={() => setPinModal(false)} toast={toast} />
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════ TRUST ═══════════════ */
function Trust({ store, toast }: any) {
  const withAccess = store.members.filter((m: Member) => m.access);
  const [add, setAdd] = useState(false);
  const accessColor: Record<Access, string> = {
    Owner: T.gold,
    "Full member": T.mint,
    "Emergency access": A.blue,
    "View only": T.muted,
  };
  return (
    <div>
      <SectionHead
        title="Trust center"
        sub="In plain language: what is protected, who is in your archive, and what each person can reach."
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { icon: Lock, t: "Encrypted on device", s: "Your archive is encrypted locally. Even we cannot read it." },
          { icon: FolderOpen, t: `${store.docs.length} documents`, s: "All stored in one private, searchable graph." },
          { icon: Users, t: `${withAccess.length} people`, s: "Have some level of access, set by you." },
        ].map((x) => (
          <Card key={x.t}>
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 34,
                height: 34,
                borderRadius: 9,
                background: T.mint + "22",
              }}
            >
              <x.icon size={17} color={T.mint} />
            </span>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: T.white, marginTop: 12 }}>{x.t}</div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>{x.s}</div>
          </Card>
        ))}
      </div>
      <Card style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px" }}>
          <span style={{ fontWeight: 700, color: T.white, fontSize: 14.5 }}>Family &amp; access</span>
          <button onClick={() => setAdd(true)} style={btnGold}>
            <Plus size={15} /> Add member
          </button>
        </div>
        {store.members.map((m: Member) => (
          <div
            key={m.id}
            className="lp-wrow"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 16px",
              borderTop: `1px solid ${T.border}`,
            }}
          >
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 34,
                height: 34,
                borderRadius: 9,
                background: m.color + "26",
                color: m.color,
                fontWeight: 800,
              }}
            >
              {m.name[0]}
            </span>
            <span className="lp-wname" style={{ flex: 1, minWidth: 0, fontSize: 14, color: T.white }}>
              {m.name}
              <span style={{ color: T.muted, fontWeight: 400 }}> · {m.relation}</span>
            </span>
            <select
              value={m.access || "View only"}
              onChange={(e) => {
                store.updateMember(m.id, { access: e.target.value as Access });
                toast("Access updated");
              }}
              style={{
                background: T.raised,
                color: accessColor[(m.access || "View only") as Access],
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {(["Owner", "Full member", "Emergency access", "View only"] as Access[]).map((a) => (
                <option key={a} style={{ color: "#000" }}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        ))}
      </Card>
      {add && (
        <AddMember
          onClose={() => setAdd(false)}
          save={(mm: Member, care: any) => {
            store.addMember(mm);
            store.updateCare(mm.id, care);
            toast("Member added");
            setAdd(false);
          }}
        />
      )}
      <Card>
        <b style={{ color: T.white, fontSize: 15 }}>Reset demo data</b>
        <p style={{ fontSize: 13, color: T.muted, margin: "6px 0 12px" }}>
          Restore the sample family and documents on this device.
        </p>
        <button
          onClick={() => {
            store.reset();
            toast("Demo data restored");
          }}
          style={{ ...btnGhost, color: T.coral, borderColor: T.coral + "55" }}
        >
          <RotateCcw size={15} /> Reset everything
        </button>
      </Card>
    </div>
  );
}

/* ═══════════════ SHELL ═══════════════ */
const NAV: [string, string, any][] = [
  ["home", "Home", LayoutGrid],
  ["documents", "Documents", FolderOpen],
  ["packages", "Packages", Plane],
  ["health", "Health", HeartPulse],
  ["wealth", "Wealth", Wallet],
  ["settings", "Settings", SettingsIcon],
];

/* ═══════════════ GLOBAL SEARCH ═══════════════ */
function SearchResults({ store, query, go }: any) {
  const q = query.trim().toLowerCase();
  const nameOf = (id?: string) => store.members.find((m: Member) => m.id === id)?.name || "";
  const monthOf = (s?: string) =>
    s ? new Date(s).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";
  const docs = store.docs.filter((d: Doc) =>
    `${d.docType} ${d.name} ${d.category} ${nameOf(d.memberId)} ${d.source} ${monthOf(d.docDate || d.addedAt)}`
      .toLowerCase()
      .includes(q),
  );
  const meds = store.meds.filter((m: any) => m.name.toLowerCase().includes(q));
  const conds: { m: Member; c: string }[] = [];
  store.members.forEach((m: Member) =>
    (store.care[m.id]?.conditions || []).forEach((c: string) => {
      if (c.toLowerCase().includes(q)) conds.push({ m, c });
    }),
  );
  const doctors = store.members.filter((m: Member) => (store.care[m.id]?.doctor || "").toLowerCase().includes(q));
  const rems = store.reminders.filter((r: any) => !r.done && r.title.toLowerCase().includes(q));
  const total = docs.length + meds.length + conds.length + doctors.length + rems.length;
  const Row = ({ icon: Ic, color, title, sub, onClick }: any) => (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 14px",
        background: "none",
        border: "none",
        borderTop: `1px solid ${T.border}`,
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 32,
          height: 32,
          borderRadius: 8,
          background: color + "22",
        }}
      >
        <Ic size={15} color={color} />
      </span>
      <span style={{ flex: 1, fontSize: 14, color: T.text }}>
        {title}
        <span style={{ color: T.muted }}> · {sub}</span>
      </span>
      <ChevronRight size={15} color={T.muted} />
    </button>
  );
  const Group = ({ label, count, children }: any) =>
    count === 0 ? null : (
      <Card style={{ padding: 0, marginBottom: 12 }}>
        <div
          style={{
            padding: "11px 14px",
            fontSize: 11.5,
            fontWeight: 700,
            color: T.muted,
            textTransform: "uppercase",
            letterSpacing: 1,
            fontFamily: "ui-monospace, monospace",
          }}
        >
          {label} · {count}
        </div>
        {children}
      </Card>
    );
  return (
    <div>
      <div style={{ fontSize: 13.5, color: T.muted, marginBottom: 14 }}>
        {total === 0 ? `No matches for "${query}"` : `${total} result${total > 1 ? "s" : ""} for "${query}"`}
      </div>
      <Group label="Documents" count={docs.length}>
        {docs.map((d: Doc) => (
          <Row
            key={d.id}
            icon={CAT_META[d.category].icon}
            color={CAT_META[d.category].color}
            title={d.docType}
            sub={`${d.category}${d.memberId && nameOf(d.memberId) ? " · " + nameOf(d.memberId).split(" ")[0] : ""}`}
            onClick={() => go("documents")}
          />
        ))}
      </Group>
      <Group label="Doctors" count={doctors.length}>
        {doctors.map((m: Member) => (
          <Row
            key={m.id}
            icon={Stethoscope}
            color={A.teal}
            title={store.care[m.id]?.doctor}
            sub={nameOf(m.id).split(" ")[0]}
            onClick={() => go("health")}
          />
        ))}
      </Group>
      <Group label="Medications" count={meds.length}>
        {meds.map((m: any) => (
          <Row
            key={m.id}
            icon={HeartPulse}
            color={A.purple}
            title={`${m.name} ${m.dose}`}
            sub={`${nameOf(m.memberId).split(" ")[0]} · ${m.freq}`}
            onClick={() => go("health")}
          />
        ))}
      </Group>
      <Group label="Conditions" count={conds.length}>
        {conds.map((x, i) => (
          <Row
            key={i}
            icon={HeartPulse}
            color={A.green}
            title={x.c}
            sub={nameOf(x.m.id).split(" ")[0]}
            onClick={() => go("health")}
          />
        ))}
      </Group>
      <Group label="Reminders" count={rems.length}>
        {rems.map((r: any) => (
          <Row
            key={r.id}
            icon={Bell}
            color={T.gold}
            title={r.title}
            sub={`${nameOf(r.memberId).split(" ")[0]} · in ${daysTo(r.due)}d`}
            onClick={() => go("health")}
          />
        ))}
      </Group>
    </div>
  );
}

const pinHash = (pin: string) => {
  let h = 5381;
  const salted = "lifepack|" + pin;
  for (let i = 0; i < salted.length; i++) h = ((h << 5) + h + salted.charCodeAt(i)) >>> 0;
  return h.toString(36);
};

function WealthLock({ store, onUnlock, toast }: any) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const tryUnlock = () => {
    if (pinHash(pin) === store.wealthPin) onUnlock();
    else {
      setErr(true);
      setPin("");
    }
  };
  return (
    <div style={{ maxWidth: 380, margin: "60px auto", textAlign: "center" }}>
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 54,
          height: 54,
          borderRadius: 15,
          background: T.gold + "1a",
          margin: "0 auto 14px",
        }}
      >
        <Lock size={22} color={T.gold} />
      </span>
      <h2 style={{ color: T.white, fontSize: 20, margin: 0 }}>Wealth is locked</h2>
      <p style={{ color: T.muted, fontSize: 13, margin: "8px 0 18px" }}>
        Enter your passcode. This is an app lock for shared screens, separate from your account.
      </p>
      <input
        autoFocus
        type="password"
        inputMode="numeric"
        maxLength={6}
        value={pin}
        onChange={(e) => {
          setErr(false);
          setPin(e.target.value.replace(/\D/g, ""));
        }}
        onKeyDown={(e) => e.key === "Enter" && pin.length >= 4 && tryUnlock()}
        style={{
          width: 180,
          textAlign: "center",
          letterSpacing: 8,
          fontSize: 22,
          fontFamily: "ui-monospace, monospace",
          background: T.raised,
          border: `1px solid ${err ? T.coral : T.border}`,
          borderRadius: 11,
          padding: "12px 14px",
          color: T.white,
          outline: "none",
        }}
      />
      {err && <div style={{ color: T.coral, fontSize: 12.5, marginTop: 8 }}>That passcode is not right.</div>}
      <button
        disabled={pin.length < 4}
        onClick={tryUnlock}
        style={{
          ...btnGold,
          width: 180,
          justifyContent: "center",
          margin: "16px auto 0",
          opacity: pin.length >= 4 ? 1 : 0.4,
        }}
      >
        Unlock
      </button>
    </div>
  );
}

function PinModal({ store, hasPin, onClose, toast }: any) {
  const [cur, setCur] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [err, setErr] = useState("");
  const inp: CSSProperties = {
    width: "100%",
    textAlign: "center",
    letterSpacing: 6,
    fontSize: 18,
    fontFamily: "ui-monospace, monospace",
    background: T.raised,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    padding: "10px 12px",
    color: T.white,
    outline: "none",
  };
  const lbl: CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: T.muted,
    fontFamily: "ui-monospace, monospace",
    margin: "12px 0 5px",
    display: "block",
    textAlign: "left",
  };
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 6);
  const save = () => {
    if (hasPin && pinHash(cur) !== store.wealthPin) return setErr("Current passcode is wrong.");
    if (pin.length < 4) return setErr("Use 4 to 6 digits.");
    if (pin !== pin2) return setErr("The two entries do not match.");
    store.setWealthPin(pinHash(pin));
    toast(hasPin ? "Passcode changed" : "Wealth passcode set");
    onClose();
  };
  const remove = () => {
    if (pinHash(cur) !== store.wealthPin) return setErr("Current passcode is wrong.");
    store.setWealthPin(null);
    toast("Passcode removed");
    onClose();
  };
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 72,
        background: "rgba(4,7,15,.62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.panel,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          width: "min(360px,100%)",
          padding: 22,
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <b style={{ color: T.white, fontSize: 17 }}>{hasPin ? "Change passcode" : "Lock Wealth with a passcode"}</b>
          <button onClick={onClose} style={{ ...btnGhost, padding: 8 }}>
            <X size={15} />
          </button>
        </div>
        <p style={{ fontSize: 12, color: T.muted, margin: "0 0 6px", textAlign: "left" }}>
          An app lock for shared screens and curious eyes. It is not encryption and does not protect the underlying
          data.
        </p>
        {hasPin && (
          <>
            <label style={lbl}>Current passcode</label>
            <input
              type="password"
              inputMode="numeric"
              style={inp}
              value={cur}
              onChange={(e) => {
                setErr("");
                setCur(digits(e.target.value));
              }}
            />
          </>
        )}
        <label style={lbl}>New passcode (4–6 digits)</label>
        <input
          type="password"
          inputMode="numeric"
          style={inp}
          value={pin}
          onChange={(e) => {
            setErr("");
            setPin(digits(e.target.value));
          }}
        />
        <label style={lbl}>Repeat it</label>
        <input
          type="password"
          inputMode="numeric"
          style={inp}
          value={pin2}
          onChange={(e) => {
            setErr("");
            setPin2(digits(e.target.value));
          }}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        {err && <div style={{ color: T.coral, fontSize: 12.5, marginTop: 8 }}>{err}</div>}
        <button onClick={save} style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 16 }}>
          {hasPin ? "Change passcode" : "Set passcode"}
        </button>
        {hasPin && (
          <button
            onClick={remove}
            style={{
              ...btnGhost,
              width: "100%",
              justifyContent: "center",
              marginTop: 8,
              color: T.coral,
              borderColor: T.coral + "55",
            }}
          >
            Remove passcode
          </button>
        )}
      </div>
    </div>
  );
}

function SOSHandoffModal({ store, toast, onClose }: any) {
  const recipients: Member[] = store.members.filter(
    (m: Member) => m.access === "Emergency access" || m.access === "Full member",
  );
  const [chosen, setChosen] = useState<Set<string>>(new Set(recipients.map((m) => m.id)));
  const [reason, setReason] = useState<
    "" | "Medical emergency" | "Travel emergency" | "Death of a family member" | "Temporary incapacity"
  >("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const wealthDocIds = new Set<string>();
  store.holdings.forEach((h: Holding) => h.docId && wealthDocIds.add(h.docId));
  store.transactions.forEach((t: Transaction) => t.docId && wealthDocIds.add(t.docId));
  const wealthDocs: Doc[] = store.docs.filter(
    (d: Doc) =>
      wealthDocIds.has(d.id) || d.category === "Finance" || d.category === "Insurance" || d.category === "Property",
  );
  const toggle = (id: string) =>
    setChosen((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const release = async () => {
    if (!chosen.size || !reason || !ack || busy) return;
    setBusy(true);
    try {
      const estate = buildEstate(store);
      const b = new Blob([estate], { type: "text/html" });
      const u = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = u;
      a.download = "SOS_Estate_Summary.html";
      a.click();
      URL.revokeObjectURL(u);
      await buildZip("SOS_Handoff_Documents", wealthDocs);
      store.releaseHandoff([...chosen], reason);
      toast("SOS handoff released · pack downloaded");
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 72,
        background: "rgba(4,7,15,.62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.panel,
          border: `1px solid ${T.coral}55`,
          borderRadius: 16,
          width: "min(480px,100%)",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: 22,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <b style={{ color: T.white, fontSize: 18, display: "inline-flex", alignItems: "center", gap: 9 }}>
            <Siren size={18} color={T.coral} /> SOS handoff
          </b>
          <button onClick={onClose} style={{ ...btnGhost, padding: 8 }}>
            <X size={16} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: T.muted, margin: "0 0 14px", lineHeight: 1.55 }}>
          For a real emergency. Releases the estate summary, {wealthDocs.length} wealth documents, and every access
          instruction to the people below, so nothing is locked away when it matters. You can cancel any time and access
          is revoked.
        </p>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: T.muted,
            fontFamily: "ui-monospace, monospace",
            marginBottom: 6,
          }}
        >
          Who steps in
        </div>
        {recipients.length === 0 ? (
          <p style={{ fontSize: 13, color: T.coral }}>
            No one has Emergency or Full access yet. Set that up in Trust center first.
          </p>
        ) : (
          recipients.map((m) => (
            <label
              key={m.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "9px 0",
                borderTop: `1px solid ${T.border}`,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={chosen.has(m.id)}
                onChange={() => toggle(m.id)}
                style={{ accentColor: T.coral }}
              />
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: m.color + "26",
                  color: m.color,
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                {m.name[0]}
              </span>
              <span style={{ flex: 1, fontSize: 13.5, color: T.text }}>
                {m.name}
                <span style={{ color: T.muted }}> · {m.relation}</span>
              </span>
              <span style={pill(m.access === "Full member" ? T.mint : A.blue)}>{m.access}</span>
            </label>
          ))
        )}
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: T.muted,
            fontFamily: "ui-monospace, monospace",
            margin: "16px 0 6px",
          }}
        >
          Why is this being released?
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {(["Medical emergency", "Travel emergency", "Death of a family member", "Temporary incapacity"] as const).map(
            (r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  padding: "7px 12px",
                  borderRadius: 9,
                  cursor: "pointer",
                  border: `1px solid ${reason === r ? T.coral : T.border}`,
                  background: reason === r ? T.coral + "1f" : "transparent",
                  color: reason === r ? T.coral : T.muted,
                }}
              >
                {r}
              </button>
            ),
          )}
        </div>
        <div
          style={{
            marginTop: 14,
            borderRadius: 11,
            border: `1px solid ${T.border}`,
            background: T.raised,
            padding: "11px 13px",
            fontSize: 12.5,
            lineHeight: 1.7,
          }}
        >
          <div style={{ color: T.text, fontWeight: 700, marginBottom: 4 }}>They receive</div>
          <div style={{ color: T.mint }}>✓ Estate summary with first steps for the family</div>
          <div style={{ color: T.mint }}>✓ {wealthDocs.length} wealth documents (deeds, policies, statements)</div>
          <div style={{ color: T.mint }}>✓ Access instructions per holding</div>
          <div style={{ color: T.muted, marginTop: 4 }}>
            ✗ Health records · ✗ personal notes · ✗ anything outside Wealth
          </div>
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 9,
            marginTop: 12,
            fontSize: 12.5,
            color: T.muted,
            cursor: "pointer",
            lineHeight: 1.5,
          }}
        >
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            style={{ accentColor: T.coral, marginTop: 2 }}
          />
          I understand this shares my financial documents with the selected people now, and that I can cancel and revoke
          access at any time.
        </label>
        <button
          disabled={!chosen.size || !reason || !ack || busy}
          onClick={release}
          style={{
            ...btnGold,
            width: "100%",
            justifyContent: "center",
            marginTop: 16,
            background: T.coral,
            opacity: chosen.size && reason && ack && !busy ? 1 : 0.4,
          }}
        >
          <Siren size={15} />{" "}
          {busy ? "Releasing…" : `Release handoff to ${chosen.size} ${chosen.size === 1 ? "person" : "people"}`}
        </button>
      </div>
    </div>
  );
}

function TransactionModal({ members, onClose, onSave }: any) {
  const [evidence, setEvidence] = useState<File | null>(null);
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    purpose: "",
    counterparty: "",
    direction: "paid" as "paid" | "received",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    memberId: "you",
    followUpOn: "",
    followUpNote: "",
  });
  const onProof = (file: File | null) => {
    setEvidence(file);
    if (file && !f.purpose) {
      const guess = file.name
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/[_-]+/g, " ")
        .replace(/\b(img|scan|screenshot|receipt|wa|photo)\b/gi, "")
        .replace(/\d{6,}/g, "")
        .trim();
      if (guess) setF((p) => ({ ...p, purpose: guess.charAt(0).toUpperCase() + guess.slice(1) }));
    }
  };
  const valid = f.purpose.trim() && Number(f.amount) > 0;
  const inp: CSSProperties = {
    width: "100%",
    background: T.raised,
    border: `1px solid ${T.border}`,
    borderRadius: 9,
    padding: "9px 11px",
    color: T.text,
    fontSize: 14,
    outline: "none",
  };
  const lbl: CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: T.muted,
    fontFamily: "ui-monospace, monospace",
    margin: "12px 0 5px",
    display: "block",
  };
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 72,
        background: "rgba(4,7,15,.62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.panel,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          width: "min(440px,100%)",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: 22,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <b style={{ color: T.white, fontSize: 18 }}>Capture proof</b>
          <button onClick={onClose} style={{ ...btnGhost, padding: 8 }}>
            <X size={16} />
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: T.muted, margin: "0 0 14px" }}>
          "I paid this." Attach the screenshot or receipt, confirm three details, done.
        </p>
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            padding: evidence ? "14px" : "22px 14px",
            borderRadius: 12,
            border: `1.5px dashed ${evidence ? T.mint + "77" : T.border}`,
            background: evidence ? T.mint + "0d" : T.raised + "66",
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          {evidence ? (
            <>
              <CheckCircle2 size={20} color={T.mint} />
              <span style={{ fontSize: 13, color: T.text, fontWeight: 600, wordBreak: "break-all" }}>
                {evidence.name}
              </span>
              <span style={{ fontSize: 11.5, color: T.muted }}>Tap to replace</span>
            </>
          ) : (
            <>
              <Paperclip size={20} color={T.gold} />
              <span style={{ fontSize: 13.5, color: T.text, fontWeight: 600 }}>Photo · screenshot · receipt · PDF</span>
              <span style={{ fontSize: 11.5, color: T.muted }}>
                The proof is the record; it files into Documents too
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/*,application/pdf"
            hidden
            onChange={(e) => onProof(e.target.files?.[0] || null)}
          />
        </label>
        <label style={lbl}>What was it</label>
        <input
          style={inp}
          value={f.purpose}
          onChange={(e) => setF({ ...f, purpose: e.target.value })}
          placeholder="e.g. LIC premium, advance to contractor"
        />
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1.2 }}>
            <label style={lbl}>Amount</label>
            <input
              style={inp}
              type="number"
              min="0"
              value={f.amount}
              onChange={(e) => setF({ ...f, amount: e.target.value })}
              placeholder="0"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Direction</label>
            <select
              style={inp}
              value={f.direction}
              onChange={(e) => setF({ ...f, direction: e.target.value as "paid" | "received" })}
            >
              <option value="paid" style={{ color: "#000" }}>
                Paid
              </option>
              <option value="received" style={{ color: "#000" }}>
                Received
              </option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Date</label>
            <input style={inp} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </div>
        </div>
        <button
          onClick={() => setMore((v) => !v)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: T.muted,
            fontSize: 12.5,
            fontWeight: 600,
            padding: 0,
            marginTop: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <ChevronDown size={13} style={{ transform: more ? "rotate(180deg)" : "none", transition: ".15s" }} />
          {more ? "Fewer details" : "More details (who, follow-up)"}
        </button>
        {more && (
          <>
            <div>
              <label style={lbl}>Who (any person or institution)</label>
              <input
                style={inp}
                value={f.counterparty}
                onChange={(e) => setF({ ...f, counterparty: e.target.value })}
                placeholder="e.g. Ramesh (contractor), Aegis Life, landlord"
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Follow up on</label>
                <input
                  style={inp}
                  type="date"
                  value={f.followUpOn}
                  onChange={(e) => setF({ ...f, followUpOn: e.target.value })}
                />
              </div>
              <div style={{ flex: 1.4 }}>
                <label style={lbl}>Follow-up note</label>
                <input
                  style={inp}
                  value={f.followUpNote}
                  onChange={(e) => setF({ ...f, followUpNote: e.target.value })}
                  placeholder="e.g. check if cheque cleared"
                />
              </div>
            </div>
          </>
        )}
        <button
          disabled={!valid || saving}
          onClick={async () => {
            if (!valid) return;
            setSaving(true);
            await onSave(
              {
                purpose: f.purpose.trim(),
                counterparty: f.counterparty.trim() || undefined,
                direction: f.direction,
                amount: Number(f.amount),
                date: f.date,
                memberId: f.memberId,
                followUpOn: f.followUpOn || undefined,
                followUpNote: f.followUpNote.trim() || undefined,
                followUpDone: false,
              },
              evidence || undefined,
            );
          }}
          style={{
            ...btnGold,
            width: "100%",
            justifyContent: "center",
            marginTop: 16,
            opacity: valid && !saving ? 1 : 0.4,
          }}
        >
          {saving ? "Saving…" : "Confirm"}
        </button>
      </div>
    </div>
  );
}

function HoldingModal({ holding, members, onClose, onSave, onDelete }: any) {
  const [f, setF] = useState<any>(
    holding || {
      name: "",
      kind: "asset",
      type: "",
      institution: "",
      accountRef: "",
      value: 0,
      nominee: false,
      nomineeName: "",
      renewalDate: "",
      memberId: members[0]?.id || "you",
    },
  );
  const inp: CSSProperties = {
    width: "100%",
    background: T.raised,
    border: `1px solid ${T.border}`,
    borderRadius: 9,
    padding: "9px 11px",
    color: T.text,
    fontSize: 14,
    outline: "none",
  };
  const lbl: CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: T.muted,
    fontFamily: "ui-monospace, monospace",
    marginBottom: 5,
    display: "block",
  };
  const set = (k: string, v: any) => setF({ ...f, [k]: v });
  const canNominee = f.kind === "asset" || f.kind === "cover";
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 75,
        background: "rgba(4,7,15,.62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.panel,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          width: "min(500px,100%)",
          padding: 22,
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <b style={{ color: T.white, fontSize: 18 }}>{holding ? "Edit holding" : "Add holding"}</b>
          <button onClick={onClose} style={{ ...btnGhost, padding: 8 }}>
            <X size={16} />
          </button>
        </div>
        <label style={lbl}>Name</label>
        <input
          style={inp}
          value={f.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Investment portfolio"
        />
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Kind</label>
            <select style={inp} value={f.kind} onChange={(e) => set("kind", e.target.value)}>
              {["asset", "liability", "cover"].map((k) => (
                <option key={k} style={{ color: "#000" }}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Type</label>
            <input
              style={inp}
              value={f.type}
              onChange={(e) => set("type", e.target.value)}
              placeholder="Mutual funds / Mortgage"
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <div style={{ flex: 2 }}>
            <label style={lbl}>Institution</label>
            <input
              style={inp}
              value={f.institution}
              onChange={(e) => set("institution", e.target.value)}
              placeholder="Bank / insurer"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Account</label>
            <input
              style={inp}
              value={f.accountRef}
              onChange={(e) => set("accountRef", e.target.value)}
              placeholder="•4821"
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>{f.kind === "liability" ? "Outstanding" : f.kind === "cover" ? "Cover" : "Value"}</label>
            <input
              type="number"
              style={inp}
              value={f.value}
              onChange={(e) => set("value", parseFloat(e.target.value) || 0)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Owner</label>
            <select style={inp} value={f.memberId} onChange={(e) => set("memberId", e.target.value)}>
              {members.map((m: Member) => (
                <option key={m.id} value={m.id} style={{ color: "#000" }}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {f.kind === "cover" && (
          <div style={{ marginTop: 12 }}>
            <label style={lbl}>Renewal date</label>
            <input
              type="date"
              style={inp}
              value={f.renewalDate || ""}
              onChange={(e) => set("renewalDate", e.target.value)}
            />
          </div>
        )}
        {f.kind === "asset" && (
          <div style={{ marginTop: 12 }}>
            <label style={lbl}>Maturity date (deposits, retirement)</label>
            <input
              type="date"
              style={inp}
              value={f.maturityDate || ""}
              onChange={(e) => set("maturityDate", e.target.value)}
            />
          </div>
        )}
        {canNominee && (
          <div style={{ marginTop: 12 }}>
            <label style={lbl}>Access instructions for the family</label>
            <textarea
              style={{ ...inp, minHeight: 58, resize: "vertical", fontFamily: "inherit" }}
              value={f.accessNote || ""}
              onChange={(e) => set("accessNote", e.target.value)}
              placeholder="Where it is, who to contact, how to claim (locker no., agent, portal)"
            />
          </div>
        )}
        {canNominee && (
          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
            <label
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: T.text }}
            >
              <input type="checkbox" checked={!!f.nominee} onChange={(e) => set("nominee", e.target.checked)} /> Nominee
              named
            </label>
            {f.nominee && (
              <input
                style={{ ...inp, flex: 1 }}
                value={f.nomineeName}
                onChange={(e) => set("nomineeName", e.target.value)}
                placeholder="Nominee name"
              />
            )}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            disabled={!f.name}
            onClick={() => onSave({ ...f, id: f.id || Math.random().toString(36).slice(2, 9) })}
            style={{ ...btnGold, flex: 1, justifyContent: "center", opacity: f.name ? 1 : 0.4 }}
          >
            {holding ? "Save" : "Add holding"}
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              title="Remove"
              style={{ ...btnGhost, color: T.coral, borderColor: T.coral + "55", padding: "10px 14px" }}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NomineeModal({ holding, onClose, onSave }: any) {
  const [name, setName] = useState(holding.nomineeName || "");
  const inp: CSSProperties = {
    width: "100%",
    background: T.raised,
    border: `1px solid ${T.border}`,
    borderRadius: 9,
    padding: "9px 11px",
    color: T.text,
    fontSize: 14,
    outline: "none",
  };
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 75,
        background: "rgba(4,7,15,.62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.panel,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          width: "min(420px,100%)",
          maxHeight: "88vh",
          overflowY: "auto",
          padding: 22,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <b style={{ color: T.white, fontSize: 17 }}>Name a nominee</b>
          <button onClick={onClose} style={{ ...btnGhost, padding: 8 }}>
            <X size={16} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: T.muted, marginBottom: 14 }}>
          Who should receive {holding.name} ({holding.institution || holding.type})?
        </p>
        <input
          style={inp}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Jordan Morgan (spouse)"
          autoFocus
        />
        <button
          disabled={!name.trim()}
          onClick={() => onSave(name.trim())}
          style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 16, opacity: name.trim() ? 1 : 0.4 }}
        >
          Save nominee
        </button>
      </div>
    </div>
  );
}

function EstateSheet({ store, onClose, toast }: any) {
  const html = buildEstate(store);
  const exportH = () => {
    const b = new Blob([html], { type: "text/html" });
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u;
    a.download = "Estate_Summary.html";
    a.click();
    URL.revokeObjectURL(u);
    toast("Estate summary exported");
  };
  const printH = () => {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 250);
    }
  };
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 75,
        background: "rgba(4,7,15,.62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.panel,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          width: "min(680px,100%)",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: T.gold,
                marginBottom: 4,
              }}
            >
              What your family would need
            </div>
            <b style={{ color: T.white, fontSize: 19 }}>Estate summary</b>
          </div>
          <button onClick={onClose} style={{ ...btnGhost, padding: 8 }}>
            <X size={16} />
          </button>
        </div>
        <div
          style={{ flex: 1, overflow: "auto", background: "#eef0f3", borderRadius: 10, padding: 12 }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={printH} style={{ ...btnGold, flex: 1, justifyContent: "center" }}>
            <Printer size={16} /> Save as PDF
          </button>
          <button onClick={exportH} style={{ ...btnGhost, flex: 1, justifyContent: "center" }}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>
    </div>
  );
}

function buildEstate(store: any): string {
  const H: Holding[] = store.holdings;
  const m2 = (v?: number) => `$${(v || 0).toLocaleString("en-US")}`;
  const A_ = H.filter((h) => h.kind === "asset"),
    L_ = H.filter((h) => h.kind === "liability"),
    C_ = H.filter((h) => h.kind === "cover");
  const s = (a: Holding[]) => a.reduce((x, h) => x + (h.value || 0), 0);
  const net = s(A_) - s(L_);
  const dn = (id?: string) => store.docs.find((d: Doc) => d.id === id)?.name || "\u2014 not attached \u2014";
  const trusted = store.members.filter((mm: Member) => mm.access === "Full member" || mm.access === "Emergency access");
  const th = (t: string) => `<th style="text-align:left;padding:6px 10px;font-size:11px;color:#6b7280">${t}</th>`;
  const secTable = (title: string, arr: Holding[], showNom: boolean) =>
    `<h3 style="margin:18px 0 6px;font-size:14px;color:#111827">${title}</h3><table style="width:100%;border-collapse:collapse;font-size:12.5px"><tr style="background:#f3f4f6">${th("Holding")}${th("Type")}${th("Where")}${th("Value")}${showNom ? th("Nominee") : ""}${th("Document")}${th("How to access")}</tr>${arr.map((h) => `<tr><td style="padding:6px 10px;font-weight:600">${h.name}</td><td style="padding:6px 10px">${h.type}</td><td style="padding:6px 10px;color:#6b7280">${h.institution || ""} ${h.accountRef || ""}</td><td style="padding:6px 10px">${m2(h.value)}</td>${showNom ? `<td style="padding:6px 10px;color:${h.nominee ? "#111827" : "#b91c1c"};font-weight:${h.nominee ? 400 : 700}">${h.nominee ? h.nomineeName || "named" : "NOT NAMED"}</td>` : ""}<td style="padding:6px 10px;color:#6b7280">${dn(h.docId)}</td><td style="padding:6px 10px;color:#374151">${h.accessNote || "\u2014"}</td></tr>`).join("") || `<tr><td colspan="6" style="padding:6px 10px;color:#9ca3af">None</td></tr>`}</table>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Estate Summary</title></head><body style="font-family:Inter,Arial,sans-serif;color:#111827;max-width:760px;margin:20px auto;padding:0 20px;background:#fff">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #D8B25A;padding-bottom:12px"><div><div style="font-weight:800;font-size:20px">ReadiNes · Estate Summary</div><div style="color:#6b7280;font-size:13px">What your family would need to find and claim everything</div></div><div style="text-align:right;color:#6b7280;font-size:12px">Prepared ${new Date().toLocaleString()}</div></div>
  <div style="display:flex;gap:26px;margin-top:16px">
    <div><div style="font-size:12px;color:#6b7280">Net worth (documented)</div><div style="font-size:22px;font-weight:800">${m2(net)}</div></div>
    <div><div style="font-size:12px;color:#6b7280">Assets</div><div style="font-size:18px;font-weight:700">${m2(s(A_))}</div></div>
    <div><div style="font-size:12px;color:#6b7280">Liabilities</div><div style="font-size:18px;font-weight:700">${m2(s(L_))}</div></div>
    <div><div style="font-size:12px;color:#6b7280">Protection</div><div style="font-size:18px;font-weight:700">${m2(s(C_))}</div></div>
  </div>
  ${secTable("Assets", A_, true)}
  ${secTable("Liabilities", L_, false)}
  ${secTable("Insurance & protection", C_, true)}
  <h3 style="margin:18px 0 6px;font-size:14px;color:#111827">If something happens: first steps for the family</h3>
  <ol style="margin:0;padding-left:18px;line-height:1.8;color:#374151;font-size:13px">
    ${C_.map((c) => `<li>File the ${c.type.toLowerCase()} claim with <b>${c.institution || "the insurer"}</b>${c.accessNote ? ` — ${c.accessNote}` : ""}${c.nominee ? ` (nominee: ${c.nomineeName || "named"})` : ` <span style="color:#b91c1c;font-weight:700">(no nominee — expect a legal-heir process)</span>`}</li>`).join("")}
    ${[...new Set(A_.map((h) => h.institution).filter(Boolean))].map((inst) => `<li>Visit or contact <b>${inst}</b> with the death certificate, ID proof, and the account references above</li>`).join("")}
    <li>Documents attached in the handoff pack: ${A_.concat(C_).filter((h) => h.docId).length} of ${A_.concat(C_).length} holdings have proof on file${
      A_.concat(C_).filter((h) => !h.docId).length
        ? ` — <span style="color:#b91c1c;font-weight:700">${A_.concat(C_)
            .filter((h) => !h.docId)
            .map((h) => h.name)
            .join(", ")} missing</span>`
        : ""
    }</li>
    ${L_.length ? `<li>Outstanding liabilities to settle or transfer: ${L_.map((l) => `${l.name} (${l.institution || ""})`).join(", ")}</li>` : ""}
  </ol>
  <h3 style="margin:18px 0 6px;font-size:14px;color:#111827">Who can help</h3><ul style="margin:0;padding-left:18px;line-height:1.7;color:#374151;font-size:13px">${trusted.map((mm: Member) => `<li>${mm.name} \u2014 ${mm.relation} (${mm.access})</li>`).join("") || "<li>No trusted contacts set</li>"}</ul>
  <p style="margin-top:22px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:10px">Prepared by ReadiNes from your own records. Account references are masked. This is an organizational summary \u2014 not a will, and not legal, tax, or financial advice. Confirm nominee and succession details with each institution and a professional.</p>
  </body></html>`;
}

/* ═════ SETTINGS ═════ */
const CHANGELOG: [string, string][] = [
  ["Semantic document ontology", "One Aadhaar now satisfies Address Proof across all 34 packs that ask for it."],
  ["100 curated packs", "Requirements gathered from published government, bank, embassy, and insurer checklists."],
  ["Estate readiness, explained", "The score now shows its own math, holding by holding."],
  [
    "SOS handoff",
    "Release the estate summary, documents, and access instructions to your emergency contacts, with reason and revoke.",
  ],
  ["Proof-first capture", "Money moments are captured as evidence, findable in Wealth and under Documents › Proofs."],
];
const FAQS: [string, string][] = [
  [
    "Where is my data stored?",
    "In this prototype, everything lives in your browser's storage on this device. The production design stores encrypted data server-side with strict access controls; nothing is sold or shared.",
  ],
  [
    "Is the Wealth passcode encryption?",
    "No. It is an app lock for shared screens. It stops casual viewing, not a determined person with access to your device.",
  ],
  [
    "Are pack checklists guaranteed complete?",
    "They follow published requirements from the named sources, with 'may be required' flags for situational items. Institutions can ask for more; treat packs as a strong head start, not a guarantee.",
  ],
  [
    "Who can see my family's documents?",
    "Access levels are set per person in Trust center: Full member, Contributor, Emergency access, or View only. SOS handoff shares the wealth pack with emergency contacts only when you release it.",
  ],
  [
    "Does ReadiNes give medical or financial advice?",
    "Never. It organizes documents and shows readiness. It does not diagnose, recommend investments, or predict approvals.",
  ],
];

function ProfileMenu({ store, account, go, onSignOut, toast }: any) {
  const [open, setOpen] = useState(false);
  const you = store.members.find((m: Member) => m.id === "you");
  const name = account?.name || you?.name || "You";
  const isSample = store.dataMode === "sample";
  const initial = (name || "?").trim()[0]?.toUpperCase() || "?";
  const switchTo = (mode: "sample" | "empty") => {
    store.setDataMode(mode);
    setOpen(false);
    go("home");
    toast(mode === "sample" ? "Switched to the sample family" : "Switched to your archive");
  };
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: T.panel,
          border: `1px solid ${open ? T.gold + "66" : T.border}`,
          borderRadius: 99,
          padding: "5px 10px 5px 6px",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 30,
            height: 30,
            borderRadius: 99,
            background: T.gold + "26",
            color: T.gold,
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          {initial}
        </span>
        <span
          className="lp-pm-name"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: T.text,
            maxWidth: 120,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name.split(" ")[0]}
        </span>
        <ChevronDown className="lp-pm-name" size={14} color={T.muted} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 72 }} />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              zIndex: 73,
              width: 264,
              background: T.panel,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              boxShadow: "0 24px 60px rgba(0,0,0,.55)",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 11, padding: 14 }}>
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: T.gold + "26",
                  color: T.gold,
                  fontWeight: 800,
                  fontSize: 17,
                }}
              >
                {initial}
              </span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: T.white,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: T.muted,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {account?.email || "Not signed in"}
                </div>
              </div>
            </div>
            <div style={{ padding: "8px 12px", borderTop: `1px solid ${T.border}` }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: T.faint,
                  fontFamily: "ui-monospace, monospace",
                  marginBottom: 6,
                }}
              >
                Instance
              </div>
              {(
                [
                  ["empty", "My archive", "Your real documents"],
                  ["sample", "Sample family", "A demo to explore"],
                ] as const
              ).map(([mode, label, sub]) => {
                const on = store.dataMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => switchTo(mode)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 10px",
                      borderRadius: 9,
                      cursor: "pointer",
                      border: "none",
                      background: on ? T.raised : "transparent",
                      textAlign: "left",
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        display: "grid",
                        placeItems: "center",
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        background: (mode === "sample" ? A.purple : T.mint) + "22",
                      }}
                    >
                      {mode === "sample" ? (
                        <Users size={14} color={A.purple} />
                      ) : (
                        <FolderOpen size={14} color={T.mint} />
                      )}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.text }}>{label}</span>
                      <span style={{ display: "block", fontSize: 11, color: T.muted }}>{sub}</span>
                    </span>
                    {on && <Check size={15} color={T.gold} />}
                  </button>
                );
              })}
            </div>
            <div style={{ padding: 8, borderTop: `1px solid ${T.border}` }}>
              {[
                ["Profile and settings", SettingsIcon, () => go("settings")],
                ["Family", Users, () => go("trust")],
              ].map(([label, Ic, fn]: any, i) => (
                <button
                  key={i}
                  onClick={() => {
                    fn();
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 10px",
                    borderRadius: 9,
                    cursor: "pointer",
                    border: "none",
                    background: "transparent",
                    color: T.text,
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: "left",
                  }}
                >
                  <Ic size={15} color={T.muted} /> {label}
                </button>
              ))}
              <button
                onClick={onSignOut}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 10px",
                  borderRadius: 9,
                  cursor: "pointer",
                  border: "none",
                  background: "transparent",
                  color: T.coral,
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: "left",
                }}
              >
                <LogOut size={15} color={T.coral} /> Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SettingsPage({ store, account, go, toast, onSignOut, onDeleteAccount }: any) {
  const [pinModal, setPinModal] = useState(false);
  const [modal, setModal] = useState<null | "whatsnew" | "faq" | "feedback" | "about" | "delete">(null);
  const [name, setName] = useState(account?.name || store.members.find((m: Member) => m.id === "you")?.name || "");
  const [fb, setFb] = useState("");
  const you = store.members.find((m: Member) => m.id === "you");
  const saveName = () => {
    if (!name.trim()) return;
    store.updateMember("you", { name: name.trim() });
    updateAccountName(name.trim());
    toast("Name updated");
  };
  const toggleNotifications = async () => {
    if (store.notifications) {
      store.setNotifications(false);
      toast("Notifications off");
      return;
    }
    if (!("Notification" in window)) return toast("This browser does not support notifications");
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      store.setNotifications(true);
      new Notification("ReadiNes reminders are on", {
        body: "Due reminders will alert on this device while the app is open.",
      });
      toast("Notifications on");
    } else toast("Permission was not granted");
  };
  const RowBtn = ({ icon: Ic, label, sub, onClick, danger }: any) => (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderTop: `1px solid ${T.border}`,
        background: "none",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <Ic size={16} color={danger ? T.coral : T.muted} />
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: danger ? T.coral : T.text }}>
          {label}
        </span>
        {sub && <span style={{ display: "block", fontSize: 12, color: T.muted, marginTop: 1 }}>{sub}</span>}
      </span>
      <ChevronRight size={14} color={T.faint} />
    </button>
  );
  const inp: CSSProperties = {
    background: T.raised,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    padding: "9px 12px",
    color: T.text,
    fontSize: 14,
    outline: "none",
  };
  const Overlay = ({ children, title }: any) => (
    <div
      onClick={() => setModal(null)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 72,
        background: "rgba(4,7,15,.62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.panel,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          width: "min(480px,100%)",
          maxHeight: "86vh",
          overflowY: "auto",
          padding: 22,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <b style={{ color: T.white, fontSize: 17 }}>{title}</b>
          <button onClick={() => setModal(null)} style={{ ...btnGhost, padding: 8 }}>
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
  const docCount = store.docs.length;
  const storageMB = (store.docs.reduce((n: number, d: Doc) => n + (d.sizeKB || 0), 0) / 1024).toFixed(1);
  const Section = ({ label, children }: any) => (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: T.faint,
          fontFamily: "ui-monospace, monospace",
          margin: "0 0 8px 2px",
        }}
      >
        {label}
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>{children}</Card>
    </div>
  );
  const Row = ({ icon: Ic, label, value, sub, onClick, danger, first }: any) => (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 16px",
        borderTop: first ? "none" : `1px solid ${T.border}`,
        background: "none",
        border: "none",
        cursor: onClick ? "pointer" : "default",
        textAlign: "left",
      }}
    >
      <Ic size={16} color={danger ? T.coral : T.muted} />
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: danger ? T.coral : T.text }}>
          {label}
        </span>
        {sub && <span style={{ display: "block", fontSize: 12, color: T.muted, marginTop: 1 }}>{sub}</span>}
      </span>
      {value && <span style={{ fontSize: 12.5, color: T.muted, fontFamily: "ui-monospace, monospace" }}>{value}</span>}
      {onClick && <ChevronRight size={14} color={T.faint} />}
    </button>
  );
  return (
    <div>
      <SectionHead title="Settings" sub="Your account, your family, and how ReadiNes behaves." />
      <div className="lp-cols2">
        <div>
          <Section label="Account">
            <div style={{ display: "flex", alignItems: "center", gap: 13, padding: 16 }}>
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 44,
                  height: 44,
                  borderRadius: 13,
                  background: T.gold + "22",
                  color: T.gold,
                  fontWeight: 800,
                  fontSize: 18,
                }}
              >
                {(name || "?")[0]}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    borderBottom: `1px solid ${T.border}`,
                    padding: "2px 0 5px",
                    color: T.white,
                    fontSize: 15,
                    fontWeight: 600,
                    outline: "none",
                  }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={saveName}
                />
                <div style={{ fontSize: 12, color: T.muted, marginTop: 5 }}>
                  {account?.email || "Not signed in · changes are saved on this device"}
                </div>
              </div>
            </div>
            <Row
              icon={Users}
              label="Manage family members"
              sub="Who is in your ReadiNes and what each can see"
              onClick={() => go("trust")}
            />
            <Row
              icon={Lock}
              label="Protect Wealth with a PIN"
              sub="Require a passcode before opening financial documents"
              value={store.wealthPin ? "On" : "Off"}
              onClick={() => setPinModal(true)}
            />
            <Row
              icon={ShieldCheck}
              label="Family & Trust center"
              sub="Access levels, emergency contacts and SOS handoff"
              value=""
              onClick={() => go("trust")}
            />
          </Section>
          <Section label="Preferences">
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px" }}>
              {store.theme === "dark" ? <Moon size={16} color={T.muted} /> : <Sun size={16} color={T.gold} />}
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: T.text }}>Theme</span>
              <div style={{ display: "flex", border: `1px solid ${T.border}`, borderRadius: 9, overflow: "hidden" }}>
                {(["dark", "light"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      store.setTheme(t);
                      toast(t === "light" ? "Light mode on" : "Dark mode on");
                    }}
                    style={{
                      padding: "6px 14px",
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      border: "none",
                      background: store.theme === t ? T.gold : "transparent",
                      color: store.theme === t ? "#10182A" : T.muted,
                    }}
                  >
                    {t === "dark" ? "Dark" : "Light"}
                  </button>
                ))}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "13px 16px",
                borderTop: `1px solid ${T.border}`,
              }}
            >
              <BellIcon size={16} color={store.notifications ? T.gold : T.muted} />
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: T.text }}>Notifications</span>
                <span style={{ display: "block", fontSize: 12, color: T.muted }}>Reminder alerts on this device</span>
              </span>
              <button
                onClick={toggleNotifications}
                style={{
                  width: 42,
                  height: 24,
                  borderRadius: 99,
                  border: `1px solid ${store.notifications ? T.gold : T.border}`,
                  background: store.notifications ? T.gold + "55" : T.raised,
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: store.notifications ? 20 : 2,
                    width: 18,
                    height: 18,
                    borderRadius: 99,
                    background: store.notifications ? T.gold : T.muted,
                    transition: "left .15s",
                  }}
                />
              </button>
            </div>
          </Section>
          <Section label="Archive">
            <Row
              icon={HardDrive}
              label="Storage"
              value={`${docCount} docs · ${storageMB} MB`}
              sub="Everything in your current archive on this device"
              first
            />
            <Row
              icon={Download}
              label="Export archive"
              sub="Download all documents as a zip"
              onClick={async () => {
                await buildZip("ReadiNes_Archive", store.docs);
                toast("Archive exported");
              }}
            />
          </Section>
        </div>
        <div>
          <Section label="Support">
            <Row
              icon={Sparkles}
              label="What's new"
              value="v0.9"
              sub="Latest changes in ReadiNes"
              onClick={() => setModal("whatsnew")}
              first
            />
            <Row
              icon={HelpCircle}
              label="Help and FAQs"
              sub="Straight answers, including the uncomfortable ones"
              onClick={() => setModal("faq")}
            />
            <Row
              icon={MessageSquare}
              label="Send feedback"
              sub="Tell us what is broken or missing"
              onClick={() => setModal("feedback")}
            />
            <Row icon={Info} label="About ReadiNes" onClick={() => setModal("about")} />
          </Section>
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: T.coral,
                fontFamily: "ui-monospace, monospace",
                margin: "0 0 8px 2px",
              }}
            >
              Danger zone
            </div>
            <Card style={{ padding: 0, overflow: "hidden", border: `1px solid ${T.coral}44` }}>
              <Row icon={LogOut} label="Sign out" sub="Your archive stays on this device" onClick={onSignOut} first />
              <Row
                icon={RefreshCw}
                label="Reset demo data"
                sub="Restore the sample family to its original state"
                onClick={() => {
                  store.setDataMode("sample");
                  localStorage.removeItem("lifepack.v3.saved");
                  toast("Sample data reset");
                  go("home");
                }}
              />
              <Row
                icon={Trash2}
                label="Delete account"
                sub="Erase your account and this device's archive"
                danger
                onClick={() => setModal("delete")}
              />
            </Card>
          </div>
        </div>
      </div>
      {pinModal && (
        <PinModal store={store} hasPin={!!store.wealthPin} onClose={() => setPinModal(false)} toast={toast} />
      )}
      {modal === "whatsnew" && (
        <Overlay title="What's new">
          {CHANGELOG.map(([t, b], i) => (
            <div key={i} style={{ padding: "10px 0", borderTop: i ? `1px solid ${T.border}` : "none" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{t}</div>
              <div style={{ fontSize: 12.5, color: T.muted, marginTop: 3, lineHeight: 1.55 }}>{b}</div>
            </div>
          ))}
        </Overlay>
      )}
      {modal === "faq" && (
        <Overlay title="Help and FAQs">
          {FAQS.map(([q, a], i) => (
            <div key={i} style={{ padding: "10px 0", borderTop: i ? `1px solid ${T.border}` : "none" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{q}</div>
              <div style={{ fontSize: 12.5, color: T.muted, marginTop: 4, lineHeight: 1.6 }}>{a}</div>
            </div>
          ))}
        </Overlay>
      )}
      {modal === "feedback" && (
        <Overlay title="Send feedback">
          <textarea
            autoFocus
            value={fb}
            onChange={(e) => setFb(e.target.value)}
            placeholder="What is broken, missing, or confusing?"
            style={{ ...inp, width: "100%", minHeight: 110, resize: "vertical", fontFamily: "inherit" }}
          />
          <button
            disabled={!fb.trim()}
            onClick={() => {
              const k = "lifepack.feedback";
              const arr = JSON.parse(localStorage.getItem(k) || "[]");
              arr.push({ at: new Date().toISOString(), text: fb.trim() });
              localStorage.setItem(k, JSON.stringify(arr));
              setFb("");
              setModal(null);
              toast("Thank you — feedback recorded");
            }}
            style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 12, opacity: fb.trim() ? 1 : 0.4 }}
          >
            Send
          </button>
          <p style={{ fontSize: 11.5, color: T.faint, marginTop: 8 }}>
            Prototype note: feedback is recorded on this device for the team to collect.
          </p>
        </Overlay>
      )}
      {modal === "about" && (
        <Overlay title="About ReadiNes">
          <p style={{ fontSize: 13.5, color: T.text, lineHeight: 1.7, margin: 0 }}>
            ReadiNes keeps your family ready for life's important moments: it understands the documents you save, knows
            what a hundred real-world situations require, shows how ready you already are, and assembles the pack when
            the moment comes.
          </p>
          <p style={{ fontSize: 12, color: T.muted, marginTop: 10 }}>Prototype build v0.9 · Jul 2026</p>
        </Overlay>
      )}
      {modal === "delete" && (
        <Overlay title="Delete account?">
          <p style={{ fontSize: 13.5, color: T.text, lineHeight: 1.6, margin: 0 }}>
            This removes your account and erases the archive stored on this device: documents, holdings, packs,
            everything. There is no undo.
          </p>
          <button
            onClick={onDeleteAccount}
            style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 14, background: T.coral }}
          >
            <Trash2 size={14} /> Delete everything
          </button>
        </Overlay>
      )}
    </div>
  );
}

/* ═════ AUTH ═════ */
function AuthScreen({
  defaultMode,
  onAuthed,
}: {
  defaultMode: "signin" | "signup";
  onAuthed: (a: Account, isNew: boolean) => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const inp: CSSProperties = {
    width: "100%",
    background: T.raised,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    padding: "11px 13px",
    color: T.white,
    fontSize: 15,
    outline: "none",
    marginTop: 9,
  };
  const submit = () => {
    setErr("");
    if (mode === "signup") {
      if (pw !== pw2) return setErr("Passwords do not match.");
      const r = signup(name, email, pw);
      if (!r.ok) return setErr(r.error);
      onAuthed(r.account, true);
    } else {
      const r = login(email, pw);
      if (!r.ok) return setErr(r.error);
      onAuthed(r.account, false);
    }
  };
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 95,
        background: T.navy,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        overflowY: "auto",
      }}
    >
      <div style={{ width: "min(400px,100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, justifyContent: "center" }}>
          <BrandMark size={34} carve={T.navy} />
          <BrandWordmark size={18} color={T.white} gold={T.gold} />
        </div>
        <div
          style={{
            display: "flex",
            border: `1px solid ${T.border}`,
            borderRadius: 11,
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setErr("");
              }}
              style={{
                flex: 1,
                padding: "10px 0",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                background: mode === m ? T.raised : "transparent",
                color: mode === m ? T.white : T.muted,
              }}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
        {mode === "signup" && (
          <input style={inp} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input style={inp} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          style={inp}
          type="password"
          placeholder="Password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && mode === "signin" && submit()}
        />
        {mode === "signup" && (
          <input
            style={inp}
            type="password"
            placeholder="Repeat password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        )}
        {err && <div style={{ color: T.coral, fontSize: 12.5, marginTop: 10 }}>{err}</div>}
        <button onClick={submit} style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 14 }}>
          {mode === "signin" ? "Sign in" : "Create account"} <ArrowRight size={15} />
        </button>
        <p style={{ fontSize: 11.5, color: T.faint, textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
          Prototype accounts live on this device only. Production replaces this with server-side auth.
        </p>
      </div>
    </div>
  );
}

function OnboardingWizard({ store, onDone }: any) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [picks, setPicks] = useState<Set<string>>(new Set());
  const [sealPhase, setSealPhase] = useState(0);
  const INTERESTS = [
    ["schengen", "A visa or trip abroad", Plane],
    ["home-buy", "Buying a home", HomeIcon],
    ["home-loan", "A home loan", Wallet],
    ["baby", "A new baby", Baby],
    ["wedding", "A wedding", Gem],
    ["tax", "Tax season", FileText],
    ["school-adm", "Kids' school or exams", GraduationCap],
    ["onboarding", "A job change", Briefcase],
  ] as const;
  const finish = () => {
    try { localStorage.setItem("rn-moments", JSON.stringify([...picks])); } catch {}
    if (name.trim()) store.updateMember("you", { name: name.trim() });
    store.setOnboarded(true);
    onDone(picks.size > 0);
  };
  const SEAL_LINES = [
    "Generating your keys on this device…",
    "Encrypting your space. Nothing readable ever leaves your device.",
    "Done. Only you hold the key.",
  ];
  useEffect(() => {
    if (step !== 2) return;
    setSealPhase(0);
    const t1 = setTimeout(() => setSealPhase(1), 900);
    const t2 = setTimeout(() => setSealPhase(2), 1900);
    const t3 = setTimeout(() => finish(), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  const inp: CSSProperties = {
    width: "100%",
    background: T.raised,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    padding: "11px 13px",
    color: T.white,
    fontSize: 14.5,
    outline: "none",
    fontFamily: "inherit",
    textAlign: "center",
  };
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: T.navy,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        overflowY: "auto",
      }}
    >
      <div style={{ width: "min(460px,100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, justifyContent: "center" }}>
          <BrandMark size={34} carve={T.navy} />
          <BrandWordmark size={18} color={T.white} gold={T.gold} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <button
            onClick={() => setStep((v) => Math.max(0, v - 1))}
            style={{ visibility: step === 1 ? "visible" : "hidden", background: "none", border: "none", color: T.muted, fontSize: 12.5, cursor: "pointer" }}
          >
            ← Back
          </button>
          <button
            onClick={finish}
            style={{ visibility: step < 2 ? "visible" : "hidden", background: "none", border: "none", color: T.muted, fontSize: 12.5, cursor: "pointer" }}
          >
            Skip setup
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 22 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{ width: 26, height: 4, borderRadius: 4, background: i <= step ? T.gold : T.raised }}
            />
          ))}
        </div>
        {step === 1 && (
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: T.white, fontSize: 22, margin: 0 }}>
              {name.trim() ? `Nice to meet you, ${name.trim().split(" ")[0]}. What's coming up?` : "What is coming up in your life?"}
            </h2>
            <p style={{ color: T.muted, fontSize: 13.5, margin: "8px 0 18px" }}>
              This chooses which curated packs we spotlight first. Nothing is locked out; every pack stays available.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
              {INTERESTS.map(([id, label, Ic]) => {
                const on = picks.has(id);
                return (
                  <button
                    key={id}
                    onClick={() =>
                      setPicks((prev) => {
                        const n = new Set(prev);
                        if (n.has(id)) n.delete(id);
                        else n.add(id);
                        return n;
                      })
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      background: on ? `${T.gold}18` : T.raised,
                      border: `1px solid ${on ? T.gold : T.border}`,
                      borderRadius: 11,
                      padding: "12px 12px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <Ic size={16} color={on ? T.gold : T.muted} />
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: T.white }}>{label}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStep(2)}
              style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 16 }}
            >
              {picks.size > 0 ? `Prepare me for ${picks.size === 1 ? "this" : `these ${picks.size}`}` : "I will decide later"}{" "}
              <ArrowRight size={15} />
            </button>
          </div>
        )}
        {step === 0 && (
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: T.white, fontSize: 22, margin: 0 }}>Welcome. What should we call you?</h2>
            <p style={{ color: T.muted, fontSize: 13.5, margin: "8px 0 18px" }}>
              This names your vault. It stays on this device, and everything in it starts empty and private.
            </p>
            <input
              autoFocus
              style={inp}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setStep(1)}
            />
            <button
              onClick={() => setStep(1)}
              style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 14 }}
            >
              Continue <ArrowRight size={15} />
            </button>
          </div>
        )}
        {step === 2 && (
          <div style={{ textAlign: "center", padding: "18px 0" }}>
            <div style={{ display: "inline-block", marginBottom: 18 }}>
              <BrandMark size={56} carve={T.navy} />
            </div>
            <h2 style={{ color: T.white, fontSize: 22, margin: "0 0 16px" }}>
              {name.trim() ? `Sealing ${name.trim().split(" ")[0]}'s family vault` : "Sealing your vault"}
            </h2>
            <div style={{ display: "grid", gap: 9, maxWidth: 360, margin: "0 auto", textAlign: "left" }}>
              {SEAL_LINES.map((l, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    opacity: sealPhase >= i ? 1 : 0.25,
                    transition: "opacity .4s",
                    color: sealPhase >= i ? T.text : T.muted,
                    fontSize: 13.5,
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 99,
                      background: sealPhase >= i ? T.gold : T.raised,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      transition: "background .4s",
                    }}
                  >
                    {sealPhase >= i && <Check size={11} color={T.navy} strokeWidth={3.5} />}
                  </span>
                  {l}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const store = useStore();
  const [route, setRoute] = useState("home");
  const [navOpen, setNavOpen] = useState(true);
  const isMobile = useIsMobile();
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 760) setNavOpen(false);
  }, []);
  useEffect(() => { ensureVaultReady(); }, []);
  const [wealthOpen, setWealthOpen] = useState(false);
  const [booted, setBooted] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  useEffect(() => {
    const sess = getSession();
    setAccount(sess);
    if (sess && sessionStorage.getItem("lp-new-account") === "1") {
      sessionStorage.removeItem("lp-new-account");
      store.setDataMode("empty"); // a new account starts genuinely empty
      store.setOnboarded(false);
      store.updateMember("you", { name: sess.name });
    }
    if (sessionStorage.getItem("lp-fresh") === "1") {
      sessionStorage.removeItem("lp-fresh");
      store.setDataMode("empty");
      store.setOnboarded(false);
    }
    if (sessionStorage.getItem("lp-demo") === "1") {
      sessionStorage.removeItem("lp-demo");
      store.setDataMode("sample");
      store.setOnboarded(true);
    }
    setBooted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!booted || !store.notifications || typeof Notification === "undefined" || Notification.permission !== "granted")
      return;
    if (sessionStorage.getItem("lp-notified") === "1") return;
    const due = store.reminders.filter((r: Reminder) => !r.done && daysTo(r.due) <= 0);
    if (due.length) {
      new Notification(`ReadiNes: ${due.length} reminder${due.length === 1 ? "" : "s"} due`, {
        body: due
          .map((r: Reminder) => r.title)
          .slice(0, 3)
          .join(" · "),
      });
      sessionStorage.setItem("lp-notified", "1");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted, store.notifications]);
  const needsOnboarding = booted && !store.onboarded;
  const [query, setQuery] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toast = (m: string) => {
    setToastMsg(m);
    window.clearTimeout((toast as any)._t);
    (toast as any)._t = window.setTimeout(() => setToastMsg(null), 2400);
  };
  const go = (r: string) => setRoute(r);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: T.navy,
        fontFamily: "Inter, system-ui, sans-serif",
        color: T.text,
        filter: store.theme === "light" ? "invert(0.93) hue-rotate(180deg)" : "none",
      }}
    >
      <style>{APPCSS}</style>
      {needsOnboarding && (
        <OnboardingWizard
          store={store}
          onDone={() => setRoute("home")}
        />
      )}
      <aside
        style={{
          width: navOpen ? 232 : 68,
          flexShrink: 0,
          borderRight: `1px solid ${T.border}`,
          padding: navOpen ? 16 : "16px 10px",
          position: "sticky",
          top: 0,
          height: "100vh",
          display: isMobile ? "none" : "flex",
          flexDirection: "column",
          transition: "width .18s ease, padding .18s ease",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: navOpen ? "6px 8px 18px" : "6px 0 18px",
            justifyContent: navOpen ? "flex-start" : "center",
          }}
        >
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 40,
              height: 40,
              borderRadius: 11,
              background: `linear-gradient(135deg, ${T.gold}, ${T.goldBright})`,
              flexShrink: 0,
            }}
          >
            <FileText size={20} color="#10182A" />
          </span>
          {navOpen && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: T.white, whiteSpace: "nowrap" }}>
                Readi<span style={{ color: T.gold }}>N</span>es
              </div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  color: T.muted,
                  fontFamily: "ui-monospace, monospace",
                  whiteSpace: "nowrap",
                }}
              >
                READY FOR LIFE
              </div>
            </div>
          )}
        </div>
        <nav style={{ display: "grid", gap: 3 }}>
          {NAV.map(([key, label, Ic]) => {
            const on = route === key;
            return (
              <button
                key={key}
                onClick={() => setRoute(key)}
                title={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: navOpen ? "flex-start" : "center",
                  gap: navOpen ? 12 : 0,
                  padding: navOpen ? "10px 12px" : "10px 0",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: "left",
                  cursor: "pointer",
                  border: on ? `1px solid ${T.border}` : "1px solid transparent",
                  background: on ? T.raised : "transparent",
                  color: on ? T.white : T.muted,
                  whiteSpace: "nowrap",
                }}
              >
                <Ic size={18} color={on ? T.gold : T.muted} style={{ flexShrink: 0 }} /> {navOpen ? label : ""}
              </button>
            );
          })}
        </nav>
        <button
          onClick={() => setNavOpen((v) => !v)}
          title={navOpen ? "Collapse menu" : "Expand menu"}
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "9px 0",
            borderRadius: 10,
            border: `1px solid ${T.border}`,
            background: T.panel,
            color: T.muted,
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          {navOpen ? (
            <>
              <ChevronsLeft size={16} />
            </>
          ) : (
            <ChevronsRight size={16} />
          )}
        </button>
      </aside>

      <main className="lp-main">
        <div
          style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, position: "relative", zIndex: 40 }}
        >
          <div
            style={{ flex: 1, display: route === "documents" ? "none" : "block", position: "relative", maxWidth: 300 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: T.panel,
                border: `1px solid ${query ? T.gold + "66" : T.border}`,
                borderRadius: 10,
                padding: "8px 12px",
              }}
            >
              <Search size={15} color={T.muted} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: T.text, fontSize: 13.5 }}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, display: "flex" }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
            {query.trim() && (
              <div
                className="lp-searchdrop"
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: 440,
                  maxWidth: "88vw",
                  maxHeight: 460,
                  overflowY: "auto",
                  background: T.navy,
                  border: `1px solid ${T.border}`,
                  borderRadius: 14,
                  padding: 12,
                  boxShadow: "0 24px 70px rgba(0,0,0,.55)",
                }}
              >
                <SearchResults
                  store={store}
                  query={query}
                  go={(r: string) => {
                    setQuery("");
                    go(r);
                  }}
                />
              </div>
            )}
          </div>
          <div style={{ flex: 1 }} />
          <ProfileMenu
            store={store}
            account={account}
            go={go}
            onSignOut={() => {
              logout();
              window.location.href = "/";
            }}
            toast={toast}
          />
        </div>
        {route === "home" && <Home store={store} go={go} toast={toast} />}
        {route === "packages" && <Packages store={store} toast={toast} />}
        {route === "documents" && <Documents store={store} toast={toast} />}
        {route === "health" && <Healthcare toast={toast} />}
        {route === "wealth" && (
          <Wealth store={store} go={go} toast={toast} unlocked={wealthOpen} onUnlock={() => setWealthOpen(true)} />
        )}
        {route === "trust" && <Trust store={store} toast={toast} />}
        {route === "settings" && (
          <SettingsPage
            store={store}
            account={account}
            go={go}
            toast={toast}
            onSignOut={() => {
              logout();
              window.location.href = "/";
            }}
            onDeleteAccount={() => {
              deleteAccount();
              localStorage.removeItem("lifepack.v3");
              window.location.href = "/";
            }}
          />
        )}
      </main>
      {query.trim() && <div onClick={() => setQuery("")} style={{ position: "fixed", inset: 0, zIndex: 30 }} />}

      {isMobile && (
        <nav className="lp-tabbar" aria-label="Primary">
          {(
            [
              ["home", "Home", LayoutGrid],
              ["documents", "Documents", FolderOpen],
              ["packages", "Packages", Plane],
              ["health", "Health", HeartPulse],
              ["wealth", "Wealth", Wallet],
            ] as [string, string, any][]
          ).map(([key, label, Ic]) => {
            const on = route === key;
            return (
              <button
                key={key}
                className="lp-tab"
                style={{ color: on ? T.gold : T.muted }}
                onClick={() => setRoute(key)}
              >
                <Ic size={20} color={on ? T.gold : T.muted} /> {label}
              </button>
            );
          })}
        </nav>
      )}

      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: isMobile ? "calc(92px + env(safe-area-inset-bottom))" : 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 90,
            background: T.panel,
            border: `1px solid ${T.border}`,
            color: T.text,
            padding: "12px 20px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 16px 50px rgba(0,0,0,.5)",
          }}
        >
          <CheckCircle2 size={17} color={T.mint} /> {toastMsg}
        </div>
      )}
    </div>
  );
}
