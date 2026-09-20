export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "CHF", "AUD", "CAD", "SAR", "JPY"] as const;
export type Currency = (typeof CURRENCIES)[number];

/* Indicative bundled rates, INR per 1 unit. Replaced by a live feed later; the UI labels them as indicative. */
export const RATES_INR: Record<string, number> = {
  INR: 1, USD: 95.4, EUR: 110.0, GBP: 128.7, AED: 25.2, SGD: 72.6, CHF: 117.0, AUD: 65.2, CAD: 68.5, SAR: 25.4, JPY: 0.598,
};
export const RATES_NOTE = "Indicative rate, bundled with the app";

/** Units of `to` per 1 unit of `from`. */
export function rateBetween(from: string, to: string): number {
  const a = RATES_INR[from], b = RATES_INR[to];
  if (!a || !b) return 1;
  return a / b;
}

export function defaultCurrency(): string {
  try {
    const loc = typeof navigator !== "undefined" ? navigator.language : "en-IN";
    const region = new Intl.Locale(loc).maximize().region || "IN";
    const map: Record<string, string> = {
      IN: "INR", US: "USD", GB: "GBP", AE: "AED", SG: "SGD", CH: "CHF", AU: "AUD", CA: "CAD", SA: "SAR", JP: "JPY",
      DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", IE: "EUR", AT: "EUR", BE: "EUR", PT: "EUR", FI: "EUR",
    };
    return map[region] || "INR";
  } catch {
    return "INR";
  }
}

const SYMBOL: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£", AED: "AED ", SGD: "S$", CHF: "CHF ", AUD: "A$", CAD: "C$", SAR: "SAR ", JPY: "¥" };

/** Compact, locale-aware: ₹12L / ₹1.2Cr for INR, $1.2M for USD. */
export function formatMoney(v: number, currency: string, compact = true): string {
  const n = Number.isFinite(v) ? v : 0;
  const locale = currency === "INR" ? "en-IN" : typeof navigator !== "undefined" ? navigator.language : "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: compact && Math.abs(n) >= 1000 ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : 0,
    }).format(n);
  } catch {
    return `${SYMBOL[currency] || currency + " "}${Math.round(n).toLocaleString()}`;
  }
}