// Where a pack applies, and which sources may be trusted for it.
//
// A pack is a situation, not a checklist. "Open a bank account" happens in every country; what
// differs is the documents, and those are fetched per country. So the catalogue is scoped
// explicitly here rather than inferred from a pack's requirements, which silently leaked
// Indian packs into every other country.

/** Situations that exist only under Indian law or Indian administrative practice. */
export const INDIA_ONLY = new Set([
  // identity instruments that exist nowhere else
  "lost-pan", "tax-id", "lost-aadhaar", "id-update", "voter-id", "ration-card", "domicile-cert",
  "income-cert", "caste-cert",
  // Indian tax, retirement and savings products
  "tax", "demat", "ppf", "nps", "pf-transfer", "epf-withdraw", "mf-kyc",
  // Indian business registration
  "gst-reg", "udyam", "incorporation", "trademark", "prof-reg",
  // Indian property instruments
  "khata", "society-noc",
  // Indian welfare and certificates
  "govt-health-card", "disability-cert", "senior-card", "disaster-relief", "govt-job",
  "tenant-verify", "board-reg", "lpg",
  // Indian succession instruments
  "legal-heir", "succession",
]);

/** Situations tied to one destination country regardless of where the applicant lives. */
export const DESTINATION_PACKS: Record<string, string> = {
  schengen: "EU",
  us: "US",
  uk: "GB",
  canada: "CA",
  australia: "AU",
  japan: "JP",
  singapore: "SG",
  uae: "AE",
  "h1b-stamp": "US",
  "f1-visa": "US",
};

/**
 * Does this pack belong in the catalogue for this country?
 * A visa pack is about a destination, so it shows everywhere: an Indian in Dubai still applies
 * for a Schengen visa. A pack built on one country's own instruments shows only there.
 */
export function packInCountry(packId: string, country: string, custom?: boolean): boolean {
  if (custom) return true;
  if (DESTINATION_PACKS[packId]) return true;
  if (INDIA_ONLY.has(packId)) return country === "IN";
  return true;
}

/* ── Trusted sources ──
   Requirements are only as good as where they came from. Each country lists the domains that
   count as official or embassy-grade, so a sourced answer can be ranked and a user can see a
   government domain rather than a blog. Verified against the published government portals. */
export const TRUSTED_SOURCES: Record<string, { official: string[]; note: string }> = {
  IN: {
    official: [
      "india.gov.in", "passportindia.gov.in", "uidai.gov.in", "incometax.gov.in",
      "parivahan.gov.in", "eci.gov.in", "mea.gov.in", "epfindia.gov.in", "gst.gov.in",
      "nvsp.in", "cbic.gov.in", "irdai.gov.in", "rbi.org.in", "sebi.gov.in",
    ],
    note: "National portals and the issuing authority for each document",
  },
  AE: {
    official: ["u.ae", "icp.gov.ae", "gdrfad.gov.ae", "mohre.gov.ae", "moj.gov.ae", "dubai.ae", "tamm.abudhabi"],
    note: "The UAE government platform and the federal identity, residency and labour authorities",
  },
  SA: {
    official: ["my.gov.sa", "absher.sa", "ksavisa.sa", "mofa.gov.sa", "hrsd.gov.sa", "moi.gov.sa"],
    note: "Absher and the unified national platform",
  },
  QA: {
    official: ["hukoomi.gov.qa", "portal.moi.gov.qa", "hayya.qa", "mofa.gov.qa", "adlsa.gov.qa"],
    note: "Hukoomi, the national e-government portal",
  },
  KW: {
    official: ["e.gov.kw", "moi.gov.kw", "paci.gov.kw", "manpower.gov.kw"],
    note: "The Kuwait government online portal and the Public Authority for Civil Information",
  },
  OM: {
    official: ["oman.om", "rop.gov.om", "evisa.rop.gov.om", "mol.gov.om", "fm.gov.om"],
    note: "The Royal Oman Police, which issues residency and visa documents",
  },
  BH: {
    official: ["bahrain.bh", "evisa.gov.bh", "lmra.gov.bh", "npra.gov.bh", "mofa.gov.bh"],
    note: "The Bahrain national portal and the Labour Market Regulatory Authority",
  },
  US: {
    official: ["usa.gov", "travel.state.gov", "uscis.gov", "state.gov", "cbp.gov", "ssa.gov", "irs.gov"],
    note: "Federal agencies; state requirements vary and are checked separately",
  },
  CA: {
    official: ["canada.ca", "cic.gc.ca", "ircc.canada.ca", "servicecanada.gc.ca", "cra-arc.gc.ca"],
    note: "Immigration, Refugees and Citizenship Canada and Service Canada",
  },
  GB: {
    official: ["gov.uk", "hmrc.gov.uk", "homeoffice.gov.uk", "nhs.uk"],
    note: "GOV.UK, which is authoritative for every central service",
  },
  IE: {
    official: ["gov.ie", "citizensinformation.ie", "irishimmigration.ie", "revenue.ie", "dfa.ie"],
    note: "The Irish government portal and Citizens Information",
  },
  AU: {
    official: ["australia.gov.au", "immi.homeaffairs.gov.au", "servicesaustralia.gov.au", "ato.gov.au", "passports.gov.au"],
    note: "Home Affairs for immigration, Services Australia for benefits and identity",
  },
  NZ: {
    official: ["govt.nz", "immigration.govt.nz", "ird.govt.nz", "passports.govt.nz", "nzta.govt.nz"],
    note: "The New Zealand government portal and Immigration New Zealand",
  },
  SG: {
    official: ["gov.sg", "ica.gov.sg", "mom.gov.sg", "iras.gov.sg", "cpf.gov.sg", "mfa.gov.sg"],
    note: "The Immigration and Checkpoints Authority and the Ministry of Manpower",
  },
  MY: {
    official: ["malaysia.gov.my", "imi.gov.my", "jpn.gov.my", "hasil.gov.my", "kln.gov.my"],
    note: "The Immigration Department and the National Registration Department",
  },
  DE: {
    official: ["bund.de", "auswaertiges-amt.de", "bamf.de", "make-it-in-germany.com", "bmi.bund.de"],
    note: "Federal ministries; Länder requirements vary and are checked separately",
  },
  NL: {
    official: ["government.nl", "ind.nl", "rijksoverheid.nl", "belastingdienst.nl", "netherlandsworldwide.nl"],
    note: "The Immigration and Naturalisation Service",
  },
  ZA: {
    official: ["gov.za", "dha.gov.za", "sars.gov.za", "dirco.gov.za"],
    note: "The Department of Home Affairs",
  },
  MU: {
    official: ["govmu.org", "passport.govmu.org", "mra.mu", "pmo.govmu.org"],
    note: "The Government of Mauritius portal",
  },
  NP: {
    official: ["nepal.gov.np", "nepalpassport.gov.np", "immigration.gov.np", "ird.gov.np", "mofa.gov.np"],
    note: "The Department of Passports and the Department of Immigration",
  },
  LK: {
    official: ["gov.lk", "immigration.gov.lk", "rgd.gov.lk", "ird.gov.lk", "mfa.gov.lk"],
    note: "The Department of Immigration and Emigration and the Registrar General",
  },
};

/** Domains that count as official for a country, plus the embassies of every country we cover. */
export function trustedDomains(country: string): string[] {
  const own = TRUSTED_SOURCES[country]?.official || [];
  /* An embassy publishes the requirements an applicant from this country actually faces, so it
     ranks alongside the destination's own government. */
  const embassies = Object.values(TRUSTED_SOURCES).flatMap((s) => s.official.filter((d) => /mofa|mea|dfa|dirco|state\.gov|auswaertiges/.test(d)));
  return [...new Set([...own, ...embassies])];
}
