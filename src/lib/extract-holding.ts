import type { Holding } from "./types";

const INSTITUTIONS = [
  "State Bank of India", "SBI", "HDFC Bank", "HDFC Life", "HDFC ERGO", "ICICI Bank", "ICICI Prudential", "ICICI Lombard",
  "Axis Bank", "Kotak Mahindra", "Kotak Life", "Bank of Baroda", "Punjab National Bank", "Canara Bank", "Union Bank",
  "IndusInd Bank", "Yes Bank", "IDFC First", "Federal Bank", "LIC", "Life Insurance Corporation", "SBI Life", "Max Life",
  "Bajaj Allianz", "Tata AIA", "Tata AIG", "Star Health", "Niva Bupa", "Care Health", "New India Assurance",
  "United India Insurance", "Zerodha", "Groww", "Upstox", "Nippon India", "Aditya Birla", "Mirae Asset", "EPFO", "NPS",
];

const AMOUNT = "(?:₹|Rs\\.?|INR)?\\s*([0-9]{1,3}(?:,[0-9]{2,3})+(?:\\.[0-9]{1,2})?|[0-9]{4,}(?:\\.[0-9]{1,2})?)";
const VALUE_LABELS = [
  "sum assured", "sum insured", "cover(?:age)? amount", "outstanding(?: principal| balance| amount)?",
  "closing balance", "available balance", "current value", "market value", "maturity value", "balance",
];
const DATE = "(\\d{1,2}[\\/\\-.]\\d{1,2}[\\/\\-.]\\d{2,4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\s+[A-Za-z]{3,9},?\\s+\\d{4})";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function toISO(raw: string): string | undefined {
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return raw;
  m = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = raw.match(/^(\d{1,2})\s+([A-Za-z]{3,9}),?\s+(\d{4})$/);
  if (m) {
    const mi = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    if (mi >= 0) return `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return undefined;
}

function findDate(text: string, labels: string[]): string | undefined {
  const re = new RegExp(`(?:${labels.join("|")})[^0-9]{0,24}${DATE}`, "i");
  const m = text.match(re);
  return m ? toISO(m[1]) : undefined;
}

/** Literal facts only. Anything not clearly printed is left out, never guessed. */
export function extractHoldingFields(text: string): Partial<Holding> {
  const out: Partial<Holding> = {};
  const t = text.replace(/\s+/g, " ");

  const inst = INSTITUTIONS.find((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(t));
  if (inst) out.institution = inst;

  for (const label of VALUE_LABELS) {
    const m = t.match(new RegExp(`${label}[^0-9₹]{0,24}${AMOUNT}`, "i"));
    if (m) {
      const n = Number(m[1].replace(/,/g, ""));
      if (Number.isFinite(n) && n > 0) { out.value = n; break; }
    }
  }

  const ref = t.match(/(?:policy|account|a\/c|folio|loan)\s*(?:no\.?|number|#|id)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/ ]{5,})/i);
  if (ref) {
    const digits = ref[1].replace(/[^0-9A-Z]/gi, "");
    if (digits.length >= 4) out.accountRef = "•" + digits.slice(-4);
  }

  const renewal = findDate(t, ["renewal date", "next premium due", "premium due date", "policy expiry", "valid till", "valid up ?to", "due date"]);
  if (renewal) out.renewalDate = renewal;
  const maturity = findDate(t, ["maturity date", "date of maturity"]);
  if (maturity) out.maturityDate = maturity;

  return out;
}
