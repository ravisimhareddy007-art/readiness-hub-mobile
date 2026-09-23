// What satisfies a requirement, and where.
//
// A requirement like "Identity Proof" is satisfied by different documents in different countries:
// an Aadhaar card in India, an Emirates ID in the UAE, a BRP in the UK. The old table was Indian
// only, so a UAE resident holding every document they needed still scored zero against it.
//
// Also handles the harder half: the live engine returns real item names ("Emirates ID copy",
// "Yellow Fever Vaccination Certificate") that are not ontology keys at all. Without a way to
// resolve those, they sit in "still needed" forever even when the user has the document.

/** Documents that satisfy a requirement anywhere. */
const UNIVERSAL: Record<string, string[]> = {
  "Identity Proof": ["Passport", "National ID", "Driving License"],
  "Address Proof": ["Utility Bill", "Rental Agreement", "Bank Statement", "Passport", "Driving License"],
  "Date of Birth Proof": ["Birth Certificate", "Passport"],
  "Photo ID": ["Passport", "National ID", "Driving License"],
  "Income Proof": ["Payslip", "Salary Certificate", "Tax Return"],
  "Employment Proof": ["Employment Offer", "Salary Certificate", "Payslip", "Employment Contract"],
  "Proof of Funds": ["Bank Statement", "Investment Statement"],
  "Accommodation Proof": ["Hotel Booking", "Rental Agreement", "Invitation Letter", "Tenancy Contract"],
  "Travel Itinerary": ["Flight Reservation"],
  "Property Ownership Proof": ["Property Deed", "Sale Agreement", "Title Deed"],
};

/** What each country adds. An Emirates ID proves identity in Dubai; an Aadhaar card does not. */
const LOCAL: Record<string, Record<string, string[]>> = {
  IN: {
    "Identity Proof": ["Aadhaar Card", "PAN Card", "Voter ID"],
    "Address Proof": ["Aadhaar Card", "Voter ID", "Ration Card"],
    "Date of Birth Proof": ["Aadhaar Card", "PAN Card", "School Leaving Certificate"],
    "Photo ID": ["Aadhaar Card", "PAN Card", "Voter ID"],
    "Income Proof": ["Form 16", "ITR Acknowledgement"],
    "Property Ownership Proof": ["Khata Certificate", "Encumbrance Certificate", "Patta"],
  },
  AE: {
    "Identity Proof": ["Emirates ID", "Residence Visa"],
    "Address Proof": ["Ejari Certificate", "DEWA Bill", "Tenancy Contract"],
    "Photo ID": ["Emirates ID"],
    "Employment Proof": ["Labour Contract", "Salary Certificate", "NOC from Employer"],
    "Income Proof": ["Salary Certificate", "Labour Contract"],
  },
  SA: {
    "Identity Proof": ["Iqama", "National ID"],
    "Photo ID": ["Iqama"],
    "Address Proof": ["National Address Certificate", "Utility Bill"],
    "Employment Proof": ["Employment Contract", "Salary Certificate"],
  },
  QA: { "Identity Proof": ["Qatar ID"], "Photo ID": ["Qatar ID"], "Address Proof": ["Utility Bill", "Tenancy Contract"] },
  KW: { "Identity Proof": ["Civil ID"], "Photo ID": ["Civil ID"], "Address Proof": ["Utility Bill", "Tenancy Contract"] },
  OM: { "Identity Proof": ["Resident Card"], "Photo ID": ["Resident Card"], "Address Proof": ["Utility Bill", "Tenancy Contract"] },
  BH: { "Identity Proof": ["CPR Card"], "Photo ID": ["CPR Card"], "Address Proof": ["Utility Bill", "Tenancy Contract"] },
  US: {
    "Identity Proof": ["Social Security Card", "State ID", "Green Card"],
    "Photo ID": ["State ID", "Green Card"],
    "Address Proof": ["Utility Bill", "Lease Agreement", "Bank Statement"],
    "Income Proof": ["W-2", "Pay Stub", "Tax Return"],
  },
  CA: {
    "Identity Proof": ["PR Card", "Provincial ID", "SIN Letter"],
    "Photo ID": ["PR Card", "Provincial ID"],
    "Address Proof": ["Utility Bill", "Lease Agreement"],
    "Income Proof": ["Notice of Assessment", "Pay Stub", "T4"],
  },
  GB: {
    "Identity Proof": ["BRP", "Share Code"],
    "Photo ID": ["BRP"],
    "Address Proof": ["Council Tax Bill", "Utility Bill", "Tenancy Agreement"],
    "Income Proof": ["P60", "Payslip", "SA302"],
  },
  IE: { "Identity Proof": ["IRP Card", "PPS Number Letter"], "Photo ID": ["IRP Card"], "Address Proof": ["Utility Bill", "Tenancy Agreement"] },
  AU: {
    "Identity Proof": ["Medicare Card", "Visa Grant Notice"],
    "Photo ID": ["Driving License", "Proof of Age Card"],
    "Address Proof": ["Utility Bill", "Rental Ledger"],
    "Income Proof": ["Payslip", "Notice of Assessment", "Payment Summary"],
  },
  NZ: { "Identity Proof": ["Visa Grant Notice", "IRD Letter"], "Address Proof": ["Utility Bill", "Tenancy Agreement"] },
  SG: {
    "Identity Proof": ["NRIC", "FIN Card", "Employment Pass"],
    "Photo ID": ["NRIC", "FIN Card"],
    "Address Proof": ["Utility Bill", "Tenancy Agreement"],
    "Income Proof": ["CPF Statement", "IR8A", "Payslip"],
  },
  MY: { "Identity Proof": ["MyKad", "MyPR", "Employment Pass"], "Photo ID": ["MyKad"], "Address Proof": ["Utility Bill", "Tenancy Agreement"] },
  DE: { "Identity Proof": ["Personalausweis", "Aufenthaltstitel"], "Address Proof": ["Meldebescheinigung", "Utility Bill"], "Income Proof": ["Gehaltsabrechnung", "Steuerbescheid"] },
  NL: { "Identity Proof": ["Verblijfsvergunning", "BSN Letter"], "Address Proof": ["BRP Extract", "Utility Bill"], "Income Proof": ["Jaaropgaaf", "Payslip"] },
  ZA: { "Identity Proof": ["South African ID", "Permit"], "Address Proof": ["Utility Bill", "Lease Agreement"] },
  MU: { "Identity Proof": ["National Identity Card"], "Address Proof": ["Utility Bill"] },
  NP: { "Identity Proof": ["Citizenship Certificate", "National ID"], "Address Proof": ["Utility Bill"] },
  LK: { "Identity Proof": ["National Identity Card"], "Address Proof": ["Utility Bill", "Grama Niladhari Certificate"] },
};

/** Everything that satisfies a requirement in this country. */
export function satisfiedBy(requirement: string, country: string): string[] {
  return [...new Set([...(UNIVERSAL[requirement] || []), ...(LOCAL[country]?.[requirement] || [])])];
}

/* Words that appear inside a requirement and tell you what kind of document it wants. Used only
   when the live engine returns a real item name rather than an ontology key: "Emirates ID copy"
   is not a key, but it plainly asks for an Emirates ID. */
const HINTS: [RegExp, string][] = [
  [/passport/i, "Photo ID"],
  [/emirates id|iqama|qatar id|civil id|cpr|nric|fin card|mykad|brp|personalausweis|national id|citizenship certificate/i, "Identity Proof"],
  [/identity|photo\s*id|\bid\s*(card|proof|copy)\b/i, "Identity Proof"],
  [/address|residence proof|utility bill|ejari|tenancy|lease|council tax|meldebesch/i, "Address Proof"],
  [/birth certificate|date of birth/i, "Date of Birth Proof"],
  [/salary|payslip|pay stub|income|form 16|itr|p60|w-2|notice of assessment/i, "Income Proof"],
  [/employment|labour contract|employer|noc|appointment letter|offer letter/i, "Employment Proof"],
  [/bank statement|proof of funds|financial|solvency/i, "Proof of Funds"],
  [/hotel|accommodation|invitation letter|host/i, "Accommodation Proof"],
  [/flight|itinerary|ticket|travel plan/i, "Travel Itinerary"],
  [/deed|title|ownership|khata|patta/i, "Property Ownership Proof"],
];

/** The ontology key a free-text requirement is really asking for, if any. */
export function inferOntology(requirement: string): string | null {
  for (const [re, key] of HINTS) if (re.test(requirement)) return key;
  return null;
}

/**
 * Which document the user holds that meets this requirement, if any.
 * Tries the exact type, then the country's ontology, then what the wording implies. The last step
 * is what stops a live-researched item from being permanently unsatisfiable.
 */
export function resolveRequirement(requirement: string, held: Set<string>, country: string): string | null {
  if (held.has(requirement)) return requirement;
  for (const t of satisfiedBy(requirement, country)) if (held.has(t)) return t;
  const inferred = inferOntology(requirement);
  if (inferred && inferred !== requirement) {
    if (held.has(inferred)) return inferred;
    for (const t of satisfiedBy(inferred, country)) if (held.has(t)) return t;
  }
  return null;
}
