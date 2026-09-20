import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const m = await import(pathToFileURL(join(root, "src/lib/extract-medical.ts")).href);
let f=0; const t=(n,fn)=>{try{fn();console.log("ok   "+n)}catch(e){f++;console.log("FAIL "+n+" :: "+e.message.split("\n")[0])}};

const lab = `Apollo Diagnostics Laboratory
Patient: Ravi S   Referred by Dr. Anil Mehta
Sample Collected on 12/08/2026   Reported on 13/08/2026
TEST                RESULT     REFERENCE RANGE
HbA1c               6.8 %      4.0 - 5.6
LDL Cholesterol     142 mg/dL  < 100
Fasting Blood Sugar 118 mg/dL  70 - 99
TSH                 3.2 mIU/L  0.4 - 4.0`;
t("lab readings", () => {
  const x = m.extractMedical(lab, "lab_report");
  console.log("     -> " + JSON.stringify(x.readings.map(r=>[r.metric,r.value,r.unit,r.refText])));
  const find = (re) => x.readings.find((r) => re.test(r.metric));
  const h = find(/HbA1c/i), ldl = find(/LDL/i), fg = find(/Fasting/i), tsh = find(/TSH/i);
  assert.equal(h.value, 6.8); assert.equal(h.refHigh, 5.6); assert.equal(h.refLow, 4);
  assert.equal(ldl.value, 142); assert.equal(ldl.refHigh, 100);
  assert.equal(fg.value, 118);
  assert.equal(tsh.value, 3.2);
});
t("lab index", () => {
  const x = m.extractMedical(lab, "lab_report");
  console.log("     -> " + JSON.stringify({doctor:x.doctor,lab:x.lab,docDate:x.docDate}));
  assert.equal(x.doctor, "Dr Anil Mehta"); assert.ok(/Apollo/.test(x.lab||"")); assert.equal(x.docDate, "2026-08-12");
});

const rx = `Fortis Hospital   Department of Cardiology
Dr. Sunita Rao, MD DM Cardiology
Date of visit 04/09/2026
Tab. Telmisartan 40mg 1-0-0 for 30 days
Tab. Atorvastatin 10mg 0-0-1 for 30 days
Review on 04/12/2026`;
t("prescription", () => {
  const x = m.extractMedical(rx, "prescription");
  console.log("     -> " + JSON.stringify(x));
  assert.equal(x.doctor, "Dr Sunita Rao");
  assert.equal(x.hospital, "Fortis Hospital");
  assert.equal(x.specialisation, "Cardiology");
  assert.equal(x.docDate, "2026-09-04");
  assert.equal(x.reviewOn, "2026-12-04");
  assert.equal(x.medicines.length, 2);
  assert.equal(x.medicines[0].name, "Telmisartan");
  assert.equal(x.medicines[0].dose, "40mg");
  assert.equal(x.medicines[0].days, 30);
});
t("bp pair", () => {
  const x = m.extractMedical("Blood Pressure 148/94 mmHg recorded", "discharge");
  console.log("     -> " + JSON.stringify(x.readings));
  assert.equal(x.readings[0].value, 148); assert.equal(x.readings[0].value2, 94);
});
t("no narrative leaks", () => {
  const x = m.extractMedical("Impression: suspected ischemic heart disease. Advice: rest.", "discharge");
  assert.equal(JSON.stringify(x.readings), "[]");
  assert.ok(!JSON.stringify(x).includes("ischemic"));
});
t("specialisation not inferred from name", () => {
  const x = m.extractMedical("Dr. Heart Kumar, MBBS", "prescription");
  console.log("     -> " + JSON.stringify({d:x.doctor,s:x.specialisation}));
  assert.equal(x.specialisation, undefined);
});
t("a value is recorded as printed, never second-guessed", () => {
  const x = m.extractMedical("HbA1c 6.8 % 4.0 - 5.6", "lab_report");
  assert.equal(x.readings[0].value, 6.8);
});
t("a row with no recognised unit is not a result", () => {
  assert.equal(m.extractMedical("Consultation Fee 800 rupees", "lab_report").readings.length, 0);
});
t("empty", () => { const x = m.extractMedical("", "lab_report"); assert.equal(x.readings.length,0); assert.equal(x.doctor,undefined); });

/* ── generic reader: any test the report prints, never a curated list ── */
const R = (txt) => m.extractReadings(txt);

const psa = `Apollo Diagnostics
Patient Name: Ramesh K   Age 68 Years   UHID 4471203
Sample Collected on 12/08/2026
TEST                      RESULT      UNIT      REFERENCE RANGE
PSA Total                 6.82        ng/mL     0.0 - 4.0
PSA Free                  0.91        ng/mL     0.5 - 2.0
Creatinine (Jaffe)        1.42        mg/dL     0.7 - 1.3
eGFR                      52          mL/min/1.73m2   > 90
Amount Payable            1200        INR`;
t("reads any test, not a fixed list", () => {
  const r = R(psa); console.log("     -> " + JSON.stringify(r.map(x=>[x.metric,x.value,x.unit,x.refText])));
  const names = r.map(x=>x.metric);
  assert.ok(names.some(n=>/PSA Total/i.test(n)) && names.some(n=>/Creatinine/i.test(n)) && names.some(n=>/eGFR/i.test(n)));
});
t("Free PSA and Total PSA are different series", () => {
  const r = R(psa);
  const tot = r.find(x=>/total/i.test(x.metric)), fr = r.find(x=>/free/i.test(x.metric));
  assert.notEqual(tot.key, fr.key);
});
t("billing and demographics are not results", () => {
  const r = R(psa);
  assert.ok(!r.some(x=>/amount|age|uhid/i.test(x.metric)), JSON.stringify(r.map(x=>x.metric)));
});
t("sub-threshold result is kept with its qualifier", () => {
  const r = R("PSA Total   <0.01   ng/mL   0.0 - 4.0");
  console.log("     -> " + JSON.stringify(r));
  assert.equal(r[0].value, 0.01); assert.equal(r[0].qualifier, "<");
});
t("same test across labs lands in one series", () => {
  const a = R("Glycated Haemoglobin (HbA1c)   6.8 %   4.0 - 5.6")[0];
  const b = R("HBA1C    7.2 %   4.0 - 5.6")[0];
  const c = R("S. HbA1c  7.0 %  4.0 - 5.6")[0];
  console.log("     -> " + [a.key,b.key,c.key].join(" | "));
  assert.equal(a.key, b.key); assert.equal(b.key, c.key);
});
t("different units never merge", () => {
  const a = R("Creatinine 1.4 mg/dL 0.7 - 1.3")[0];
  const b = R("Creatinine 124 umol/L 62 - 115")[0];
  assert.notEqual(a.key, b.key);
});
t("micro sign, mu and mcg normalise together", () => {
  const a = R("Vitamin B12  180 \u00B5g/L  200 - 900")[0];
  const b = R("Vitamin B12  210 mcg/L  200 - 900")[0];
  assert.equal(a.key, b.key);
});
t("calculated and direct LDL stay apart", () => {
  const a = R("LDL Cholesterol Calculated 142 mg/dL < 100")[0];
  const b = R("LDL Cholesterol Direct 138 mg/dL < 100")[0];
  assert.notEqual(a.key, b.key);
});
t("fasting and random glucose stay apart", () => {
  const a = R("Glucose Fasting 118 mg/dL 70 - 99")[0];
  const b = R("Glucose Random 156 mg/dL 70 - 140")[0];
  assert.notEqual(a.key, b.key);
});
t("a row's range never comes from the row below", () => {
  const r = R("LDL Cholesterol 142 mg/dL < 100\nHDL Cholesterol 38 mg/dL 40 - 60");
  const ldl = r.find(x=>/LDL/i.test(x.metric));
  assert.equal(ldl.refHigh, 100); assert.equal(ldl.refLow, undefined);
});
t("a result with no printed range is still captured", () => {
  const r = R("Ferritin 18 ng/mL");
  assert.equal(r.length, 1); assert.equal(r[0].refText, undefined);
});
t("unrecognised units are ignored", () => {
  assert.equal(R("Consultation Fee 800 rupees").length, 0);
});
t("blood pressure pairs", () => {
  const r = R("Blood Pressure 148/94 mmHg");
  assert.equal(r[0].value, 148); assert.equal(r[0].value2, 94);
});
t("narrative yields nothing", () => {
  assert.equal(R("Impression: suspected ischemic heart disease. Advice: rest.").length, 0);
});
t("a full panel yields many results", () => {
  const cbc = `Haemoglobin 13.2 g/dL 13.0 - 17.0
Total Leucocyte Count 7200 /cumm 4000 - 11000
Platelet Count 210 thousand/uL 150 - 410
MCV 88 fL 83 - 101`;
  assert.equal(R(cbc).length, 4);
});

console.log(f?`\n${f} FAILED`:"\nall passed");
process.exit(f?1:0);
