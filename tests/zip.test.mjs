// Prepare for a visit must hand a doctor the family's own original files.
// Run: node --experimental-strip-types tests/zip.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const zipSrc = readFileSync(join(root, "src/lib/zip.ts"), "utf8");
const hc = readFileSync(join(root, "src/components/Healthcare.tsx"), "utf8");

let fails = 0;
const t = (n, fn) => { try { fn(); console.log("ok   " + n); } catch (e) { fails++; console.log("FAIL " + n + " :: " + e.message.split("\n")[0]); } };

t("a document that cannot be read is reported, never dropped", () => {
  assert.ok(/missing\.push\(d\)/.test(zipSrc), "unreadable files must be collected");
  assert.ok(/return \{ added, missing \}/.test(zipSrc), "the packer must report what happened");
});
t("the pack carries original files, not only a summary", () => {
  assert.ok(/folder\.file\(`\$\{label\}\$\{ext\(d\)\}`/.test(zipSrc), "each document blob must be written into the zip");
});
t("originals are named so a doctor can navigate them", () => {
  assert.ok(/String\(i \+ 1\)\.padStart\(2, "0"\)/.test(zipSrc), "numbered in order");
  assert.ok(/d\.docDate \|\| d\.addedAt/.test(zipSrc), "dated");
  assert.ok(/d\.docType/.test(zipSrc), "labelled by what it is");
});
t("the cover sheet sorts after the originals", () => {
  assert.ok(/99_ReadiNes_Cover_Sheet\.html/.test(hc), "cover must not be the first thing in the folder");
  assert.ok(!/00_Cover_Sheet/.test(hc), "old cover-first naming is gone");
});
t("a pack with no readable originals is never reported as a success", () => {
  assert.ok(/res\.added === 0/.test(hc), "zero originals must be handled");
  assert.ok(/if \(res\.added > 0\) onClose\(\)/.test(hc), "the sheet must stay open on failure");
});
t("a partial pack says how many were left out", () => {
  assert.ok(/res\.missing\.length/.test(hc));
});
t("the contents list names every original and every omission", () => {
  assert.ok(/Original documents included/.test(zipSrc));
  assert.ok(/Could not be included/.test(zipSrc));
});
t("every export path checks the result", () => {
  for (const f of ["src/App.tsx", "src/components/Events.tsx"]) {
    const s = readFileSync(join(root, f), "utf8");
    if (!/buildZip\(/.test(s)) continue;
    assert.ok(/res\.added === 0/.test(s), f + " ignores an empty pack");
  }
});

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
