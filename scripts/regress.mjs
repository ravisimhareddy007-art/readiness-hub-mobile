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

step("banned patterns");
const walk = (d, out = []) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
};
const all = walk("src").filter((p) => !p.endsWith(`components${sep}Landing.tsx`)); // marketing page, web type scale
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

step("release blockers (listed, not failing yet)");
let dev = 0;
for (const p of all) readFileSync(p, "utf8").split("\n").forEach((l, i) => { if (/DEV ONLY/.test(l)) { dev++; console.log(`  ${p}:${i + 1}: ${l.trim().slice(0, 120)}`); } });
if (!dev) console.log("ok   none");

step("production build");
run(npx, ["vite", "build"], true) && console.log("ok   build");

console.log(`\n== result: ${status ? "FAIL" : "PASS"} ==`);
process.exit(status);
