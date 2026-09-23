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
t("the country is set in Settings and costs no room in Packages", () => {
  assert.ok(/<Globe size=\{16\}/.test(app), "Settings must own the setting");
  assert.ok(/const CountryChip/.test(app), "Packages shows the jurisdiction as a chip, not a bar");
  assert.ok(!/Requirements for <b/.test(app), "a full-width bar for a setting owned elsewhere is waste");
  assert.ok(/function CountrySheet\(\{ current, onPick, onClose, title \}/.test(app), "one picker, used by both");
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
t("the pack states where its list came from", () => {
  for (const s of ["Curated list", "Offline list", "checked against published sources"])
    assert.ok(app.includes(s), s);
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
t("provenance is shown, and a recheck is one tap", () => {
  assert.ok(/Checked \{fmtDate\(live\.lastChecked\)\}/.test(app), "the date it was checked must be visible");
  assert.ok(/title="Check again now"/.test(app), "a manual recheck must be available");
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
  assert.ok(/live\.reqs\.filter\(\(r: string\) => !skipped\.includes\(r\)\)/.test(pkg));
});
t("setting aside never deletes from the published list", () => {
  assert.ok(/packSkips/.test(store), "skips are per pack, separate from the requirements themselves");
});
console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
