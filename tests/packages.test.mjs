// Packages: country scoping and the live requirements contract.
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const c = await import(pathToFileURL(join(root, "src/lib/countries.ts")).href);
const app = readFileSync(join(root, "src/App.tsx"), "utf8");
const idx = readFileSync(join(root, "src/lib/requirements/index.ts"), "utf8");

let fails = 0;
const t = (n, fn) => { try { fn(); console.log("ok   " + n); } catch (e) { fails++; console.log("FAIL " + n + " :: " + e.message.split("\n")[0]); } };

t("an India-anchored pack is hidden elsewhere", () => {
  const pan = ["PAN Card", "Aadhaar Card", "Passport Photos"];
  assert.equal(c.packFitsCountry(pan, "IN"), true);
  assert.equal(c.packFitsCountry(pan, "CA"), false);
});
t("a universal pack shows everywhere", () => {
  const visa = ["Passport", "Passport Photos", "Travel Insurance", "Flight Reservation", "Proof of Funds"];
  for (const k of ["IN", "CA", "GB", "AE"]) assert.equal(c.packFitsCountry(visa, k), true, k);
});
t("one incidental local document does not hide a large pack", () => {
  const big = ["Passport", "Bank Statement", "Payslip", "Employment Proof", "ITR Acknowledgement"];
  assert.equal(c.packFitsCountry(big, "GB"), true);
});
t("country falls back to India when the device region is not covered", () => {
  assert.ok(c.COUNTRIES.some((x) => x.code === c.defaultCountry()));
});
t("every country has a name and a flag", () => {
  c.COUNTRIES.forEach((x) => { assert.ok(x.name.length > 2); assert.ok(x.flag.length > 0); });
});
t("the first release offers no country choice", () => {
  assert.ok(!/const CountryChip/.test(app), "India only until packs and pricing exist elsewhere");
  assert.ok(!/function CountrySheet\(/.test(app));
  assert.ok(!/<Globe size=\{16\}/.test(app), "no country row in Settings");
});
t("the country cannot drift to a market we do not support", () => {
  const cc = readFileSync(join(root, "src/lib/countries.ts"), "utf8");
  assert.ok(!/navigator\.language/.test(cc), "a device set to en-US must not switch the catalogue");
  const st3 = readFileSync(join(root, "src/lib/store.ts"), "utf8");
  assert.ok(/country: "IN",/.test(st3), "a stored country from an earlier build must be brought back");
});
t("requirements are cached per country, not per pack alone", () => {
  assert.ok(/jurisdiction \? `\$\{query\}::\$\{jurisdiction\}` : query/.test(idx), "cache key must include the country");
});
t("a forced check bypasses the cache", () => {
  assert.ok(/force \? null : getCached\(key\)/.test(idx));
});
t("every pack is checked against live sources, not only custom ones", () => {
  assert.ok(/getPackRequirements\(query, store\.country, force\)/.test(app));
});
t("the curated list shows while the live check runs", () => {
  assert.ok(/origin: "curated"/.test(app), "the sheet must never open empty");
});
t("one source and one date, not three", () => {
  const shown = [...app.matchAll(/>\s*(Last checked|Checked)\b/g)].length;
  assert.ok(shown <= 2, `a date is labelled "checked" ${shown} times`);
  assert.ok(/Last checked<\/span>/.test(app), "the date must still be shown once");
});
t("a source appears only where one was verified", () => {
  assert.ok(/ev\.source\?\.basis === "authority" && ev\.source\.url/.test(app),
    "a citation nobody has opened is worse than none");
  assert.ok(/const unsourcedLine = /.test(app), "the line must follow who sets the list");

  assert.ok(/Typical across lenders/.test(app) && /Typical across insurers/.test(app),

    "one sentence for every pack read as if a passport had a provider");

  assert.ok(/Your institution sets its own list/.test(app));
});
t("refresh is offered only where there is something to recheck", () => {
  assert.ok(/\(ev\.source\?\.basis === "authority" \|\| ev\.custom\) && \(/.test(app));
});
t("no pack inherits a source from its category", () => {
  assert.ok(!/source: "Official published requirements"/.test(app));
  assert.ok(!/lastChecked: "Jul 25, 2026"/.test(app), "a hardcoded date is not a checked date");
});
t("what goes in the download can be chosen", () => {
  assert.ok(/In this download/.test(app));
  assert.ok(/Add another document/.test(app));
  assert.ok(/dropped\.has\(d\.id\)/.test(app));
});
t("sources are linked and official ones are marked", () => {
  assert.ok(/live\.sources\.slice\(0, 3\)/.test(app));
  assert.ok(/src\.tier === "official" \|\| src\.tier === "embassy"/.test(app));
});
t("official sources are distinguishable from general ones", () => {
  assert.ok(/src\.tier === "official" \|\| src\.tier === "embassy"/.test(app));
});


/* ── cost: an outside lookup follows intent, never curiosity ── */
const cache = readFileSync(join(root, "src/lib/requirements/cache.ts"), "utf8");
t("a pack knows its requirements without being asked", () => {
  assert.ok(/if \(!ev\.custom && \(!held \|\| held\.stale\)\) refresh\(\)/.test(app),
    "the research must already be done when the pack opens");
  assert.ok(!/Check official requirements/.test(app), "the user must never be sent to do the research");
});
t("a held answer is reused for 30 days", () => {
  assert.ok(/TTL_MS = 30 \* 24 \* 60 \* 60 \* 1000/.test(cache));
  assert.ok(/Date\.now\(\) - e\.at > TTL_MS/.test(cache));
});
t("a held answer is shown without spending anything", () => {
  assert.ok(/cachedRequirements\(query, store\.country\)/.test(app));
  assert.ok(/origin: "cache"/.test(app));
});
t("a stale answer is shown while it refreshes, never a blank sheet", () => {
  assert.ok(/getCachedAny/.test(cache), "an expired entry must still be readable");
  assert.ok(/stale: Date\.now\(\) - e\.at > TTL_MS/.test(cache));
});

/* ── the module obeys the colour constitution ── */
const pkg = app.slice(app.indexOf("function Packages({ store, toast }"), app.indexOf("/* ═════ SETTINGS ═════ */"));
t("gold is not used for a selected state or a focus ring", () => {
  assert.ok(!/on \? T\.gold \+ "77"/.test(pkg), "selected chips must be teal");
  assert.ok(!/q \? T\.gold \+ "66"/.test(pkg), "a focused field must be teal");
});
t("a missing requirement is amber, not gold", () => {
  assert.ok(!/background: T\.gold \+ "26"/.test(pkg));
  assert.ok(/SEM\.warning \+ "26"/.test(pkg));
});
t("the action on a missing requirement is teal", () => {
  assert.ok(!/color: T\.gold,\s*\n\s*borderColor: T\.gold/.test(pkg));
});
t("the list row states one fact, not the same fact twice", () => {
  assert.ok(!/missing · \$\{got\} of \$\{total\} ready/.test(pkg));
  assert.ok(/\$\{got\} of \$\{total\} ready/.test(pkg));
});
t("the checklist speaks as the user, not as the brand", () => {
  assert.ok(!/Found in ReadiNes/.test(pkg));
  assert.ok(/Already in your vault/.test(pkg));
});

/* ── a requirement can be set aside and brought back ── */
const store = readFileSync(join(root, "src/lib/store.ts"), "utf8");
t("a requirement the user does not need can be set aside", () => {
  assert.ok(/setPackSkip/.test(store), "the store must hold the decision");
  assert.ok(/Not needed/.test(pkg), "the pack must offer it");
});
t("setting aside is reversible", () => {
  assert.ok(/Need it after all/.test(pkg));
  assert.ok(/setPackSkip\(ev\.id, label, false\)/.test(pkg));
});
t("a set-aside requirement stops dragging the score down", () => {
  assert.ok(/base\.filter\(\(r: string\) => !skipped\.includes\(r\)\)/.test(pkg));
});
t("setting aside never deletes from the published list", () => {
  assert.ok(/packSkips/.test(store), "skips are per pack, separate from the requirements themselves");
});
t("packs that fail the customer filter are gone", () => {
  for (const id of ["ration-card", "sim-kyc", "disaster-relief", "lpg", "trademark",
                    "incorporation", "udyam", "freelance-kyc", "adoption", "senior-card"])
    assert.ok(!new RegExp('"' + id + '"').test(app), `${id} should have been cut`);
});
t("over-split packs are collapsed into parameters", () => {
  assert.ok(!/"carloan"/.test(app), "car and two-wheeler are one vehicle loan");
  assert.ok(/"vehicle-loan"/.test(app));
  assert.ok(!/"f1-visa"|"h1b-stamp"/.test(app), "student and work visas are parameterised");
  assert.ok(!/"lost-pan"|"lost-aadhaar"|"lost-dl"/.test(app), "losing a document is a variant");
});
t("the situations a household actually meets are present", () => {
  for (const id of ["pan-aadhaar-link", "aadhaar-address", "aadhaar-mobile", "voter-address",
                    "motor-claim", "gratuity", "name-change-marriage", "police-clearance",
                    "oci-card", "loan-lien-release", "first-30-days", "water-connection",
                    "property-tax-name", "health-ins-port"])
    assert.ok(new RegExp('"' + id + '"').test(app), `${id} is missing`);
});
t("no pack id is used twice", () => {
  const ids = [...app.matchAll(/P\(\s*\n\s*"([^"]+)",/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
});
t("nothing references a pack that no longer exists", () => {
  const ids = new Set([...app.matchAll(/P\(\s*\n\s*"([^"]+)",/g)].map((m) => m[1]));
  const scope = readFileSync(join(root, "src/lib/pack-scope.ts"), "utf8");
  for (const m of scope.matchAll(/"([a-z0-9-]+)":\s*"[A-Z]{2}"/g))
    assert.ok(ids.has(m[1]), `pack-scope names ${m[1]}, which is not in the catalogue`);
});

/* ── the hundred-pack baseline: structured requirements, verified links, staleness ── */
const catalogue = app.slice(app.indexOf("const EVENTS = ["), app.indexOf("const catalogueReview"));
const CAPS = ["identity", "address", "income", "ownership", "relationship", "qualification", "purpose"];
const packBlocks = catalogue.split(/\n  P\(\n/).slice(1);
t("the catalogue holds exactly one hundred packs", () => {
  const ids = [...catalogue.matchAll(/P\(\s*\n\s*"([^"]+)",/g)].map((m) => m[1]);
  assert.equal(ids.length, 100);
});
t("the duplicate packs stay merged", () => {
  assert.ok(!/"pcc"/.test(catalogue), "police-clearance is the one police clearance pack");
  assert.ok(!/"loan-closure"/.test(catalogue), "loan-lien-release is the one loan closure pack");
});
t("a pack is built by name, never by position", () => {
  assert.ok(/const P = \(id: string, spec: PackSpec\) =>/.test(app), "a positional constructor put a source in the icon slot once");
  assert.ok(/reqs: spec\.needs\.map\(\(n\) => n\.doc\)/.test(app), "the checklist is derived from the requirements, not written twice");
});
t("every requirement states what it proves", () => {
  const made = [...catalogue.matchAll(/\b(?:must|may)\("[^"]+", "([a-z]+)"/g)].map((m) => m[1]);
  assert.ok(made.length > 400, "requirements must be structured, not bare strings");
  for (const c of made) assert.ok(CAPS.includes(c), `${c} is not a capability`);
  assert.equal([...catalogue.matchAll(/\b(?:must|may)\(/g)].length, made.length, "a requirement is missing its capability");
});
t("a conditional requirement says when it applies", () => {
  const mays = [...catalogue.matchAll(/\bmay\("[^"]+", "[a-z]+", "([^"]*)"/g)];
  assert.equal(mays.length, [...catalogue.matchAll(/\bmay\(/g)].length);
  for (const m of mays) assert.ok(m[1].trim().length > 3, "a condition is empty");
});
t("every pack has at least one mandatory requirement", () => {
  for (const block of packBlocks) assert.ok(/\bmust\(/.test(block), block.slice(0, 40));
});
t("a link lands on the list, never on a home page", () => {
  const urls = [...catalogue.matchAll(/url: "([^"]+)"/g)].map((m) => m[1]);
  assert.ok(urls.length > 150);
  for (const u of urls) {
    const x = new URL(u);
    assert.equal(x.protocol, "https:", u);
    assert.ok(x.pathname.length > 1 || x.hash.startsWith("#:~:text="), `${u} is a home page`);
  }
});
t("no pack shows more than three links", () => {
  assert.ok(/\(ev\.sources \|\| \[\]\)\.slice\(0, 3\)/.test(app));
  for (const block of packBlocks) assert.ok((block.match(/url: "/g) || []).length <= 3);
});
t("a pack reports its own staleness", () => {
  assert.ok(/REVIEW_EVERY_DAYS = 365/.test(app));
  assert.ok(/staleness: \(now\?: number\) => packStaleness\(spec\.reviewed, now\)/.test(app));
  assert.ok(/state: "never", days: null/.test(app), "a pack never reviewed must say so, not pass as fresh");
});
t("the catalogue can list which packs are overdue", () => {
  assert.ok(/const catalogueReview = /.test(app));
  assert.ok(/Catalogue review/.test(app), "the list must be reachable in the app");
});
t("a reviewed date is never written without a link behind it", () => {
  for (const block of packBlocks) assert.equal(/reviewed: "/.test(block), /sources: \[/.test(block), block.slice(0, 40));
});
t("a draft guessed from a pack's name never replaces a catalogue list", () => {
  assert.ok(/source === "fallback" && !ev\.custom\) return;/.test(app));
  assert.ok(!/curatedWins/.test(app), "every pack is looked up monthly and served from the cache, reviewed or not");
});
t("one function says where a document counts", () => {
  assert.ok(/const packsUsing = /.test(app));
  assert.ok(/packs\.filter\(\(p\) => evalEvent\(p, only, country\)\.got > 0\)/.test(app), "it must run the packs' own scoring");
  assert.ok(!/e\.reqs\.includes\(d\.docType\)/.test(app), "an exact-name match misses every pack that asks for what the document proves");
  assert.ok(/const usedIn = packsUsing\(/.test(app));
});
t("a new document says where it counts the moment it lands", () => {
  assert.ok(/const packGain = /.test(app));
  assert.ok(/used in \$\{packs\(used\.size\)\}/.test(app));
  assert.ok(/\}, \[store\.docs\]\);/.test(app), "the watcher follows the vault, not any one upload button");
});
t("a document is in the vault before it is read or encrypted", () => {
  const add = store.slice(store.indexOf("const addFiles = useCallback"), store.indexOf("const updateDoc = useCallback"));
  assert.ok(add.indexOf("persist();") < add.indexOf("await ensureVaultReady()"), "nothing on screen waits for the slow steps");
  assert.ok(add.indexOf("persist();") < add.indexOf("await safeOcr("));
  assert.ok(/classifyContent\(file\.name, ""\)/.test(add), "filed from its name at once");
});
t("reading the page never overwrites what the user already set", () => {
  assert.ok(/if \(!fixed && !edited\) next\[k\] = /.test(store));
});
t("a document counts under the name it was filed with", () => {
  const onto = readFileSync(join(root, "src/lib/ontology.ts"), "utf8");
  assert.ok(/"Driving License": \["Driver's License"\]/.test(onto));
  assert.ok(/const own = heldAs\(requirement, held\)/.test(onto));
});
t("a document accepted in place of another counts as held", () => {
  assert.ok(/ev\.needs\?\.find\(\(n\) => n\.doc === r\)\?\.alt/.test(app));
});
t("a conditional requirement shows its condition, not a stock phrase", () => {
  assert.ok(/need\?\.when \|\| "May be required depending on your situation"/.test(app));
});
console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
