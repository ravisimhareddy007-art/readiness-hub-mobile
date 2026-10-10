// ReadiNes regression gate. Run from repo root:  node scripts/regress.mjs   (or: npm run regress)
// Fails on type errors, build errors, failing unit fixtures, or any banned pattern.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
let status = 0;
const step = (s) => console.log(`\n== ${s} ==`);
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const run = (cmd, args, quiet = false, shell = process.platform === "win32") => {
  const r = spawnSync(cmd, args, { stdio: quiet ? "pipe" : "inherit", shell });
  if (r.status !== 0) { status = 1; if (quiet) console.log((r.stdout || "") + (r.stderr || "")); }
  return r.status === 0;
};

step("typecheck");
run(npx, ["tsc", "--noEmit"]) && console.log("ok   typecheck");

step("unit fixtures");
run(process.execPath, ["--experimental-strip-types", "--no-warnings", "tests/wealth.test.mjs"], false, false);
run(process.execPath, ["--experimental-strip-types", "--no-warnings", "tests/medical.test.mjs"], false, false);
run(process.execPath, ["--experimental-strip-types", "--no-warnings", "tests/health.test.mjs"], false, false);
run(process.execPath, ["--experimental-strip-types", "--no-warnings", "tests/zip.test.mjs"], false, false);
run(process.execPath, ["--experimental-strip-types", "--no-warnings", "tests/packages.test.mjs"], false, false);

step("banned patterns");
const walk = (d, out = []) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
};
const all = walk("src")
  .filter((p) => !p.endsWith(`components${sep}Landing.tsx`)) // marketing page, web type scale
  .filter((p) => !/components.(Dashboard|Documents|Events|Viewer|ui)\.tsx$/.test(p) || /Events|ui/.test(p)); // Dashboard.tsx and Documents.tsx are not imported anywhere
const app = all.filter((p) => !p.endsWith(`lib${sep}currency.ts`));                // holds the one legitimate locale fallback
const ban = (desc, re, files) => {
  const hits = [];
  for (const p of files) {
    readFileSync(p, "utf8").split("\n").forEach((line, i) => { if (re.test(line)) hits.push(`${p}:${i + 1}: ${line.trim().slice(0, 140)}`); });
  }
  if (hits.length) { status = 1; console.log(`FAIL ${desc} (${hits.length})`); hits.forEach((h) => console.log("  " + h)); }
  else console.log(`ok   ${desc}`);
};
ban("hard-coded locale (use fmtDate / undefined)", /"en-US"|"en-GB"/, app);
ban("hard-coded dollar formatting (use formatMoney)", /`\$\$\{/, all);
ban("font size below 12px", /fontSize: (10|11)(\.[0-9])?[,} ]/, all);
ban("gold used on warning icon (use SEM.warning)", /AlertTriangle[^/]*color=\{T\.gold\}/, all);
ban("Tax documents offered as Wealth holdings", /"Property", "Tax"\]/, all);
ban("Inter font (platform font only)", /['"]Inter['"]|font-family:\s*Inter\b|Inter,Arial/, walk("src"));
const externalFontPattern = new RegExp([
  "fonts\\.googleapis" + "\\.com",
  "fonts\\.gstatic" + "\\.com",
  "@" + "fontsource",
  "Space" + " Grotesk",
  "JetBrains" + " Mono",
].join("|"));
const fontFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  if (["node_modules", ".git", ".output", "dist", ".tanstack"].includes(entry.name)) return [];
  const path = join(dir, entry.name);
  return entry.isDirectory() ? fontFiles(path) : /\.(tsx?|jsx?|mjs|css|html|json|md|lock)$/.test(entry.name) ? [path] : [];
});
ban("external fonts (platform font only)", externalFontPattern, fontFiles("."));

// Dead code and orphaned data: a store function nothing calls, or rows left behind by a delete.
{
  const hits = [];
  const st = readFileSync("src/lib/store.ts", "utf8");
  const ui = ["src/App.tsx", "src/components/Healthcare.tsx", "src/components/DocViewer.tsx"]
    .map((p) => readFileSync(p, "utf8")).join("\n");
  const block = (st.match(/\n  return \{([\s\S]*?)\n  \};/) || ["", ""])[1];
  /* Deliberately unused while the country choice is withheld for the India-only release. */
  const parked = new Set(["setCountry", "setNationality"]);
  for (const m of block.matchAll(/^\s{4}(\w+),$/gm))
    if (!parked.has(m[1]) && !new RegExp("\\." + m[1] + "\\b").test(ui))
      hits.push(`store.${m[1]} exported but never called`);
  for (const k of ["labs", "meds", "reminders"])
    if (!new RegExp(k + ": state\\." + k + "\\.filter\\(\\(x\\) => x\\.memberId !== mid\\)").test(st))
      hits.push(`removeMember leaves ${k} behind`);
  if (!/labs: state\.labs\.filter\(\(x\) => x\.sourceDocId !== docId\)/.test(st))
    hits.push("removeDoc leaves readings behind");
  if (hits.length) { status = 1; console.log(`FAIL dead code and orphaned data (${hits.length})`); hits.forEach((h) => console.log("  " + h)); }
  else console.log("ok   dead code and orphaned data");
}

// Exported documents are read on paper: nothing below 12px there either.
{
  const hits = [];
  for (const p of all) for (const m of readFileSync(p, "utf8").matchAll(/font-size:(\d+)px/g))
    if (+m[1] < 12) hits.push(`${p}: ${m[1]}px in exported HTML`);
  if (hits.length) { status = 1; console.log(`FAIL export type below 12px (${hits.length})`); hits.forEach((h) => console.log("  " + h)); }
  else console.log("ok   export type below 12px");
}

// Light mode: a hard-coded scrim, an invisible tint, or a low-contrast printed footer all look
// fine on dark and break on white.
{
  const hits = [];
  for (const p of all) {
    const src = readFileSync(p, "utf8");
    for (const m of src.matchAll(/background: "rgba\\(\\d+, ?\\d+, ?\\d+, ?\\.\\d+\\)"/g))
      hits.push(`${p}: modal scrim ignores the theme (${m[0].slice(12)})`);
    for (const m of src.matchAll(/(\w+(?:\.\w+)?)\s*\+\s*"(0[0-9a-fA-F]|1[0-9a-fA-F])"/g))
      if (parseInt(m[2], 16) < 0x1a) hits.push(`${p}: ${m[1]} tinted at ${Math.round((parseInt(m[2], 16) / 255) * 100)}% is invisible on white`);
    for (const m of src.matchAll(/color:#(9ca3af|d1d5db|e5e7eb)/g))
      hits.push(`${p}: printed text at ${m[1]} is below 4.5:1 on white`);
  }
  if (hits.length) { status = 1; console.log(`FAIL light-mode surfaces (${hits.length})`); hits.slice(0, 12).forEach((h) => console.log("  " + h)); }
  else console.log("ok   light-mode surfaces");
}

// Anything the app reads from a document must be correctable by the person who owns it.
{
  const hits = [];
  const hc = readFileSync("src/components/Healthcare.tsx", "utf8");
  if (!/function EditRecord\(/.test(hc)) hits.push("no way to correct an extracted record");
  if (!/s\.updateDoc\(/.test(hc)) hits.push("the record index is written but never editable");
  for (const fld of ["doctor", "hospital", "specialisation"])
    if (!new RegExp(`setF\\(\\{ \\.\\.\\.f, ${fld}:`).test(hc)) hits.push(`${fld} cannot be corrected`);
  if (!/onRemoveReading/.test(hc)) hits.push("a misread reading cannot be removed from its record");
  if (hits.length) { status = 1; console.log(`FAIL extracted data is not correctable (${hits.length})`); hits.forEach((h) => console.log("  " + h)); }
  else console.log("ok   extracted data is correctable");
}

// The store is passed around as `any`, so calling a function it does not export compiles fine and
// fails at the user's finger. Check every store.<fn>() the UI calls actually exists.
{
  const st = readFileSync("src/lib/store.ts", "utf8");
  const block = (st.match(/\n  return \{([\s\S]*?)\n  \};/) || ["", ""])[1];
  const exported = new Set([...block.matchAll(/^\s{4}(\w+),$/gm)].map((m) => m[1]));
  for (const m of block.matchAll(/^\s{4}(\w+):/gm)) exported.add(m[1]);
  const hits = [];
  for (const p of all) {
    const src = readFileSync(p, "utf8");
    for (const m of src.matchAll(/\bstore\.(\w+)\(/g))
      if (!exported.has(m[1])) hits.push(`${p}: store.${m[1]}() is called but the store does not export it`);
    for (const m of src.matchAll(/\bs\.(\w+)\(/g))
      if (!exported.has(m[1]) && /Healthcare/.test(p)) hits.push(`${p}: s.${m[1]}() is called but the store does not export it`);
  }
  if (hits.length) { status = 1; console.log(`FAIL store calls that do not exist (${[...new Set(hits)].length})`); [...new Set(hits)].forEach((h) => console.log("  " + h)); }
  else console.log("ok   store calls that do not exist");
}

// Prose creep: explanatory sentences accumulate one fix at a time until a sheet is mostly caption.
// A paragraph inside a sheet or a card is almost always something to cut.
{
  const hits = [];
  for (const p of all) {
    const src = readFileSync(p, "utf8");
    for (const m of src.matchAll(/>\s*\n\s*([A-Z][^<>{}]{110,})\n/g))
      hits.push(`${p}: ${m[1].trim().slice(0, 64)}…`);
  }
  /* Listed, not failing: a few of these are consent wording that has to be exact. Everything else
     is a caption that accumulated one fix at a time and should be cut. */
  if (hits.length) { console.log(`note prose creep (${hits.length} paragraphs inside UI)`); hits.slice(0, 12).forEach((h) => console.log("  " + h)); }
  else console.log("ok   prose creep");
}

// The design system is only a system if nothing escapes it. One off-scale value is how an app ends
// up with six font sizes half a pixel apart and ten corner radii.
{
  const hits = [];
  const TYPE = [12, 13, 14, 15, 16, 20, 28];
  const SPACE = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48];
  const RADIUS = [12, 999];
  const WEIGHT = [400, 500, 700];
  for (const p of all) {
    if (p.endsWith("ds.ts")) continue;
    const src = readFileSync(p, "utf8");
    const file = p.split(sep).pop();
    for (const m of src.matchAll(/fontSize: ([0-9.]+)/g))
      if (!TYPE.includes(Number(m[1]))) hits.push(`${file}: fontSize ${m[1]} is off the scale`);
    for (const m of src.matchAll(/borderRadius: ([0-9]+)/g))
      if (!RADIUS.includes(Number(m[1]))) hits.push(`${file}: borderRadius ${m[1]} is off the scale`);
    for (const m of src.matchAll(/fontWeight: ([0-9]+)/g))
      if (!WEIGHT.includes(Number(m[1]))) hits.push(`${file}: fontWeight ${m[1]} is off the scale`);
    if (!p.endsWith("Landing.tsx")) for (const m of src.matchAll(/font-weight:\s*([0-9]+)/g))
      if (!WEIGHT.includes(Number(m[1]))) hits.push(`${file}: font-weight ${m[1]} in CSS is off the scale`);
    for (const m of src.matchAll(/\b(?:padding|paddingTop|paddingBottom|paddingLeft|paddingRight|gap|rowGap|columnGap|marginTop|marginBottom|marginLeft|marginRight): (\d+)\b/g))
      if (!SPACE.includes(Number(m[1]))) hits.push(`${file}: spacing ${m[1]} is off the scale`);
  }
  const uniq = [...new Set(hits)];
  if (uniq.length) { status = 1; console.log(`FAIL design system (${uniq.length})`); uniq.slice(0, 14).forEach((h) => console.log("  " + h)); }
  else console.log("ok   design system");
}

// A tick saying "nothing wrong here" spends the loudest element in the UI on the default state,
// and repeats what the dashboard already lists as an action. Only exceptions get ink.
{
  const hits = [];
  for (const p of all) {
    const src = readFileSync(p, "utf8");
    const file = p.split(sep).pop();
    for (const m of src.matchAll(/["'`]\s*[\u2713\u2714\u2715\u2717\u2716\u00d7]\s*[A-Z][a-z]/g))
      hits.push(`${file}: a tick or cross badge at "${m[0].trim()}"`);
    if (/const Chip = \(\{ ok, label \}/.test(src)) hits.push(`${file}: a boolean status pill component`);
  }
  const uniq = [...new Set(hits)];
  if (uniq.length) { status = 1; console.log(`FAIL status badges (${uniq.length})`); uniq.slice(0, 10).forEach((h) => console.log("  " + h)); }
  else console.log("ok   status badges");
}

// CSS grid fails silently: a grid-template-areas whose rows have unequal name counts, or which
// names an area no child claims, is discarded entirely and the layout collapses into overlap.
{
  const hits = [];
  for (const p of all) {
    const src = readFileSync(p, "utf8");
    const file = p.split(sep).pop();
    for (const m of src.matchAll(/\.([\w-]+)\{[^}]*grid-template-areas:((?:"[^"]*"\s*)+)/g)) {
      const cls = m[1];
      const rows = [...m[2].matchAll(/"([^"]*)"/g)].map((r) => r[1].trim().split(/\s+/));
      const widths = new Set(rows.map((r) => r.length));
      if (widths.size > 1) hits.push(`${file}: .${cls} grid rows have ${[...widths].join(" and ")} columns`);
      const colDecl = src.slice(src.indexOf("." + cls + "{")).match(/grid-template-columns:([^;}]*)/);
      if (colDecl) {
        const n = colDecl[1].trim().split(/\s+(?![^(]*\))/).length;
        if (!widths.has(n)) hits.push(`${file}: .${cls} declares ${n} columns but its areas use ${[...widths].join("/")}`);
      }
      const named = new Set(rows.flat().filter((a) => a !== "."));
      for (const area of named)
        if (!src.includes(`grid-area:${area}`) && !src.includes(`grid-area: ${area}`))
          hits.push(`${file}: .${cls} names area "${area}" that no child claims`);
    }
  }
  const uniq = [...new Set(hits)];
  if (uniq.length) { status = 1; console.log(`FAIL grid layout (${uniq.length})`); uniq.slice(0, 10).forEach((h) => console.log("  " + h)); }
  else console.log("ok   grid layout");
}

// A design system is only a system if screens cannot opt out of it. These three
// checks are what make the earlier work permanent rather than a convention that
// decays with the next edit.
{
  const MIGRATED = [];   // add screen paths here as each one is migrated
  const hits = [];
  for (const p of all) {
    const rel = p.split("src" + sep)[1] || p;
    if (!MIGRATED.some((m) => rel.endsWith(m))) continue;
    const src = readFileSync(p, "utf8");
    const file = p.split(sep).pop();

    // 1. no appearance in a screen file
    if (/style=\{\{/.test(src)) hits.push(`${file}: contains a style object`);
    for (const m of src.matchAll(/#[0-9A-Fa-f]{6}\b/g)) hits.push(`${file}: hex colour ${m[0]}`);
    for (const m of src.matchAll(/\b(fontSize|borderRadius|padding|margin|gap):/g))
      hits.push(`${file}: declares ${m[1]}`);

    // 2. no raw layout containers outside src/ui
    if (/display: "flex"|display: "grid"|className="[^"]*\bflex\b/.test(src))
      hits.push(`${file}: builds its own layout container`);

    // 3. no component outside src/ui that renders a button
    if (/<button\b/.test(src)) hits.push(`${file}: renders a raw <button>, use Button`);
  }
  const uniq = [...new Set(hits)];
  if (uniq.length) { status = 1; console.log(`FAIL screens own appearance (${uniq.length})`); uniq.slice(0, 12).forEach((h) => console.log("  " + h)); }
  else console.log("ok   screens own appearance");
}

// Readiness gets its colour from toneFor alone. A second threshold ternary is how a 45 ends up amber
// on one screen and red on another.
{
  const hits = [];
  for (const p of all) {
    const src = readFileSync(p, "utf8");
    if (/const toneFor = /.test(src)) continue;
    src.split("\n").forEach((l, i) => { if (/>=\s*\d+\s*\?\s*[A-Z]\w*\.(mint|gold|coral|emerald|warning|red|success|attention)/.test(l)) hits.push(`${p}:${i + 1}: ${l.trim().slice(0, 120)}`); });
  }
  if (hits.length) { status = 1; console.log(`FAIL readiness colour outside toneFor (${hits.length})`); hits.forEach((h) => console.log("  " + h)); }
  else console.log("ok   readiness colour has one source");
}

// A flex child does not shrink below its content without min-height:0, so overflow:auto never
// engages, the panel grows past the sheet and the touch scroll falls through to the page behind.
{
  const hits = [];
  for (const p of all) {
    const src = readFileSync(p, "utf8");
    const file = p.split(sep).pop();
    for (const m of src.matchAll(/\{ flex: 1,(?![^}]*minHeight: 0)[^}]*overflow(?:Y)?: "auto"/g))
      hits.push(`${file}: a flex:1 scroll container without minHeight:0`);
    if (/^\.lp-sheet\{(?![^}]*overscroll-behavior)/m.test(src))
      hits.push(`${file}: .lp-sheet scrolls the page behind it`);
  }
  const uniq = [...new Set(hits)];
  if (uniq.length) { status = 1; console.log(`FAIL scroll containers (${uniq.length})`); uniq.forEach((h) => console.log("  " + h)); }
  else console.log("ok   scroll containers");
}

step("release blockers (listed, not failing yet)");
let dev = 0;
for (const p of all) readFileSync(p, "utf8").split("\n").forEach((l, i) => { if (/DEV ONLY/.test(l)) { dev++; console.log(`  ${p}:${i + 1}: ${l.trim().slice(0, 120)}`); } });
if (!dev) console.log("ok   none");

step("production build");
run(npx, ["vite", "build"], true) && console.log("ok   build");

console.log(`\n== result: ${status ? "FAIL" : "PASS"} ==`);
process.exit(status);
