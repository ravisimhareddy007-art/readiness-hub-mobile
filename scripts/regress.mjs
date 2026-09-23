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

// Dead code and orphaned data: a store function nothing calls, or rows left behind by a delete.
{
  const hits = [];
  const st = readFileSync("src/lib/store.ts", "utf8");
  const ui = ["src/App.tsx", "src/components/Healthcare.tsx", "src/components/DocViewer.tsx"]
    .map((p) => readFileSync(p, "utf8")).join("\n");
  const block = (st.match(/\n  return \{([\s\S]*?)\n  \};/) || ["", ""])[1];
  for (const m of block.matchAll(/^\s{4}(\w+),$/gm))
    if (!new RegExp("\\." + m[1] + "\\b").test(ui)) hits.push(`store.${m[1]} exported but never called`);
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

step("release blockers (listed, not failing yet)");
let dev = 0;
for (const p of all) readFileSync(p, "utf8").split("\n").forEach((l, i) => { if (/DEV ONLY/.test(l)) { dev++; console.log(`  ${p}:${i + 1}: ${l.trim().slice(0, 120)}`); } });
if (!dev) console.log("ok   none");

step("production build");
run(npx, ["vite", "build"], true) && console.log("ok   build");

console.log(`\n== result: ${status ? "FAIL" : "PASS"} ==`);
process.exit(status);
