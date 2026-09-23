// Where the user is preparing documents. Requirements differ by country, so every pack and every
// live lookup is scoped to one, and the app never implies a single answer for everyone.

export interface Country {
  code: string;
  name: string;
  flag: string;
}

/* Where a user prepares documents. Deliberately a short list rather than all 195.
   Three reasons: inference runs through Bedrock, whose geographic restrictions are stricter than
   Anthropic's direct API; a handful of regions serve these markets; and a curated pack catalogue
   is only worth showing where it has real coverage. The list is the Indian diaspora corridors.

   Every entry below was checked against the sanctions position: none appear on the US
   comprehensively sanctioned list (Cuba, Iran, North Korea, Syria, and the occupied regions of
   Ukraine), none are subject to a UN Security Council embargo that India implements, and none sit
   in the regions Anthropic excludes (China, Hong Kong, Russia, Belarus). Add a country here only
   after making the same check. */
const CODES = [
  "IN", // home market
  "AE", "SA", "QA", "KW", "OM", "BH", // Gulf: the largest Indian expatriate population anywhere
  "US", "CA", "GB", "IE", // the qualification and settlement corridors
  "AU", "NZ", "SG", "MY", // Asia Pacific
  "DE", "NL", // Europe, the growing skilled-work corridor
  "ZA", "MU", // long-settled Indian-origin communities
  "NP", "LK", // neighbours with constant document traffic
];

/* Shown first because they carry the most traffic; the rest follow alphabetically. */
export const PINNED = ["IN", "AE", "US", "GB", "CA", "AU", "SG", "SA"];

const flagOf = (code: string) =>
  String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

const nameOf = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
};

export const COUNTRIES: Country[] = CODES.map((code) => ({ code, name: nameOf(code), flag: flagOf(code) })).sort(
  (a, b) => {
    const pa = PINNED.indexOf(a.code);
    const pb = PINNED.indexOf(b.code);
    if (pa !== -1 || pb !== -1) return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
    return a.name.localeCompare(b.name);
  },
);

/* Never add these: comprehensively sanctioned, or outside the regions our inference provider
   serves. Kept explicit so the reason survives the person who knew it. */
export const NEVER_SUPPORTED = ["CU", "IR", "KP", "SY", "RU", "BY", "CN", "HK"];

export const countryName = (code?: string) => COUNTRIES.find((c) => c.code === code)?.name || "India";
export const countryFlag = (code?: string) => COUNTRIES.find((c) => c.code === code)?.flag || "🇮🇳";

/** The device's region, when it is one we cover. */
export function defaultCountry(): string {
  try {
    const loc = typeof navigator !== "undefined" ? navigator.language : "en-IN";
    const region = new Intl.Locale(loc).maximize().region;
    return CODES.includes(region as string) ? (region as string) : "IN";
  } catch {
    return "IN";
  }
}

/** Match a typed query against a country's name or code. */
export function searchCountries(q: string): Country[] {
  const n = q.trim().toLowerCase();
  if (!n) return COUNTRIES;
  return COUNTRIES.filter((c) => c.name.toLowerCase().includes(n) || c.code.toLowerCase() === n);
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
