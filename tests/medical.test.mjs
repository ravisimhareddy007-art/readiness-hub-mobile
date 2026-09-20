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
  console.log("     -> " + JSON.stringify(x.readings));
  const by = Object.fromEntries(x.readings.map(r=>[r.metric,r]));
  assert.equal(by.HbA1c.value, 6.8); assert.equal(by.HbA1c.refHigh, 5.6); assert.equal(by.HbA1c.refLow, 4);
  assert.equal(by.LDL.value, 142); assert.equal(by.LDL.refHigh, 100);
  assert.equal(by["Fasting Glucose"].value, 118);
  assert.equal(by.TSH.value, 3.2);
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
t("out-of-plausible-range value dropped", () => {
  const x = m.extractMedical("HbA1c 680 %", "lab_report");
  assert.equal(x.readings.length, 0);
});
t("empty", () => { const x = m.extractMedical("", "lab_report"); assert.equal(x.readings.length,0); assert.equal(x.doctor,undefined); });
console.log(f?`\n${f} FAILED`:"\nall passed");
process.exit(f?1:0);
