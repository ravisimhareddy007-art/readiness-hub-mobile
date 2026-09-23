// Where the user is preparing documents. Requirements differ by country, so every pack and every
// live lookup is scoped to one, and the app never implies a single answer for everyone.

export interface Country {
  code: string;
  name: string;
  flag: string;
}

/* The markets a family vault plausibly serves first: India, the diaspora corridors, and the
   destinations Indian applicants most often prepare for. */
export const COUNTRIES: Country[] = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "US", name: "United States", flag: "🇺🇸" },
];

export const countryName = (code?: string) => COUNTRIES.find((c) => c.code === code)?.name || "India";
export const countryFlag = (code?: string) => COUNTRIES.find((c) => c.code === code)?.flag || "🇮🇳";

/** The device's region, when it is one we cover. */
export function defaultCountry(): string {
  try {
    const loc = typeof navigator !== "undefined" ? navigator.language : "en-IN";
    const region = new Intl.Locale(loc).maximize().region;
    return COUNTRIES.some((c) => c.code === region) ? (region as string) : "IN";
  } catch {
    return "IN";
  }
}

/* Documents that only exist in one country. A pack asking for an Aadhaar card is meaningless in
   Canada, so packs whose requirements are anchored to a country are shown only there. */
export const COUNTRY_ONLY_DOCS: Record<string, string[]> = {
  IN: [
    "Aadhaar Card", "PAN Card", "Voter ID", "Form 16", "ITR Acknowledgement", "EPF Passbook",
    "Ration Card", "UAN", "GST Registration", "Udyam Registration", "Encumbrance Certificate",
    "Khata Certificate", "Patta", "Caste Certificate", "Domicile Certificate", "NREGA Card",
  ],
};

/** Is this pack meaningful in the selected country? */
export function packFitsCountry(reqs: string[], country: string): boolean {
  for (const [code, docs] of Object.entries(COUNTRY_ONLY_DOCS)) {
    if (code === country) continue;
    /* A pack is country-specific when its requirements are mostly documents of that country. */
    const anchored = reqs.filter((r) => docs.includes(r)).length;
    if (anchored >= 2 || (anchored === 1 && reqs.length <= 3)) return false;
  }
  return true;
}
