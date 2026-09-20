// Health module logic fixtures. Run: node --experimental-strip-types tests/health.test.mjs
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const st = await import(pathToFileURL(join(root, "src/lib/extract-medical.ts")).href);

let fails = 0;
const t = (n, fn) => { try { fn(); console.log("ok   " + n); } catch (e) { fails++; console.log("FAIL " + n + " :: " + e.message.split("\n")[0]); } };
const iso = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

const docs = [
  { id: "d1", category: "Medical", memberId: "m1", medType: "prescription", docDate: iso(-10), doctor: "Dr Rao", hospital: "Fortis Hospital", specialisation: "Cardiology", docType: "Prescription", name: "rx1" },
  { id: "d2", category: "Medical", memberId: "m1", medType: "lab_report", docDate: iso(-20), doctor: "Dr Rao", lab: "Apollo Diagnostics", docType: "Lab Report", name: "lab1" },
  { id: "d3", category: "Medical", memberId: "m1", medType: "prescription", docDate: iso(-400), doctor: "Dr Shah", hospital: "Manipal Hospital", specialisation: "Dermatology", docType: "Prescription", name: "rx2" },
  { id: "d4", category: "Medical", memberId: "m2", medType: "prescription", docDate: iso(-5), doctor: "Dr Other", docType: "Prescription", name: "rx3" },
  { id: "d5", category: "Insurance", memberId: "m1", docType: "Health Insurance", name: "ins" },
];

t("targets come from this member's records only", () => {
  const ts = st.visitTargets(docs, "m1").map((x) => x.value || x.kind);
  assert.ok(ts.includes("Dr Rao") && ts.includes("Cardiology") && ts.includes("Fortis Hospital"));
  assert.ok(!ts.includes("Dr Other"));
});
t("targets are deduplicated", () => {
  const ts = st.visitTargets(docs, "m1").filter((x) => x.value === "Dr Rao");
  assert.equal(ts.length, 1);
});
t("targets are newest first", () => {
  const ts = st.visitTargets(docs, "m1").filter((x) => x.kind === "doctor").map((x) => x.value);
  assert.deepEqual(ts, ["Dr Rao", "Dr Shah"]);
});
t("general is always last", () => {
  const ts = st.visitTargets(docs, "m1");
  assert.equal(ts[ts.length - 1].kind, "general");
});
t("a member with no records still gets general", () => {
  const ts = st.visitTargets(docs, "nobody");
  assert.equal(ts.length, 1);
  assert.equal(ts[0].kind, "general");
});
t("doctor target pulls that doctor's records", () => {
  const picked = st.selectVisitDocs(docs, "m1", { kind: "doctor", value: "Dr Rao" }).map((d) => d.id);
  assert.ok(picked.includes("d1") && picked.includes("d2"));
});
t("specialisation target pulls the matching record even when old", () => {
  const picked = st.selectVisitDocs(docs, "m1", { kind: "specialisation", value: "Dermatology" }).map((d) => d.id);
  assert.ok(picked.includes("d3"), "old dermatology prescription must travel");
});
t("hospital target matches a lab too", () => {
  const picked = st.selectVisitDocs(docs, "m1", { kind: "hospital", value: "Apollo Diagnostics" }).map((d) => d.id);
  assert.ok(picked.includes("d2"));
});
t("insurance always travels", () => {
  for (const tg of [{ kind: "general" }, { kind: "doctor", value: "Dr Rao" }]) {
    assert.ok(st.selectVisitDocs(docs, "m1", tg).some((d) => d.id === "d5"), JSON.stringify(tg));
  }
});
t("general excludes records older than 12 months, except the latest prescription", () => {
  const picked = st.selectVisitDocs(docs, "m1", { kind: "general" }).map((d) => d.id);
  assert.ok(!picked.includes("d3"));
  assert.ok(picked.includes("d1"));
});
t("another member's records never travel", () => {
  const picked = st.selectVisitDocs(docs, "m1", { kind: "general" }).map((d) => d.id);
  assert.ok(!picked.includes("d4"));
});
t("no duplicate documents in a pack", () => {
  const picked = st.selectVisitDocs(docs, "m1", { kind: "doctor", value: "Dr Rao" }).map((d) => d.id);
  assert.equal(new Set(picked).size, picked.length);
});
t("labels read naturally", () => {
  assert.equal(st.targetLabel({ kind: "specialisation", value: "Cardiology" }), "Cardiology visit");
  assert.equal(st.targetLabel({ kind: "doctor", value: "Dr Rao" }), "Dr Rao");
  assert.equal(st.targetLabel({ kind: "general" }), "General checkup");
});

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
