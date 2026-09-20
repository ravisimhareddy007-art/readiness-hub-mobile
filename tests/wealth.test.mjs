// Unit fixtures for Wealth libraries. Run: node --experimental-strip-types tests/wealth.test.mjs
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cur = await import(pathToFileURL(join(root, "src/lib/currency.ts")).href);
const ex = await import(pathToFileURL(join(root, "src/lib/extract-holding.ts")).href);

let fails = 0;
const t = (name, fn) => {
  try { fn(); console.log("ok   " + name); }
  catch (e) { fails++; console.log("FAIL " + name + " :: " + e.message.split("\n")[0]); }
};
const near = (a, b) => Math.abs(a - b) < 1e-9;

/* currency */
t("rate USD->INR", () => assert.ok(near(cur.rateBetween("USD", "INR"), cur.RATES_INR.USD)));
t("rate INR->USD inverse", () => assert.ok(near(cur.rateBetween("INR", "USD") * cur.RATES_INR.USD, 1)));
t("rate CHF->USD cross", () => assert.ok(near(cur.rateBetween("CHF", "USD"), cur.RATES_INR.CHF / cur.RATES_INR.USD)));
t("rate unknown -> 1", () => assert.equal(cur.rateBetween("XXX", "INR"), 1));
t("INR 60,000 full", () => assert.equal(cur.formatMoney(60000, "INR"), "₹60,000"));
t("INR 99,999 full", () => assert.equal(cur.formatMoney(99999, "INR"), "₹99,999"));
t("INR 1L", () => assert.equal(cur.formatMoney(100000, "INR"), "₹1L"));
t("INR 1.5L", () => assert.equal(cur.formatMoney(150000, "INR"), "₹1.5L"));
t("INR 1.2Cr", () => assert.equal(cur.formatMoney(12000000, "INR"), "₹1.2Cr"));
t("INR 10Cr rounds", () => assert.equal(cur.formatMoney(99900000, "INR"), "₹10Cr"));
t("INR zero", () => assert.equal(cur.formatMoney(0, "INR"), "₹0"));
t("INR NaN", () => assert.equal(cur.formatMoney(NaN, "INR"), "₹0"));
t("INR negative", () => assert.equal(cur.formatMoney(-25000, "INR"), "-₹25,000"));
t("INR non-compact", () => assert.equal(cur.formatMoney(2500000, "INR", false), "₹25,00,000"));
t("USD 999", () => assert.equal(cur.formatMoney(999, "USD"), "$999"));
t("USD 1.2M no trailing zero", () => assert.ok(/^\$1\.2M$/.test(cur.formatMoney(1200000, "USD"))));
t("USD 1M no .0", () => assert.ok(!/\.0/.test(cur.formatMoney(1000000, "USD"))));
t("CHF full", () => assert.ok(cur.formatMoney(1200, "CHF", false).includes("1,200")));
t("currency list has INR first", () => assert.equal(cur.CURRENCIES[0], "INR"));

/* extraction: literal facts only, never guessed */
const cases = [
  ["LIC policy", "Life Insurance Corporation of India  Policy No: 982345671 Sum Assured Rs. 25,00,000  Next Premium Due 15/03/2027 Date of Maturity 15 Mar 2041",
    { institution: "Life Insurance Corporation", value: 2500000, accountRef: "•5671", renewalDate: "2027-03-15", maturityDate: "2041-03-15" }],
  ["HDFC statement", "HDFC Bank Ltd Statement of Account  Account Number: 50100234567890  Closing Balance INR 3,42,118.50  Statement Date 31-08-2026",
    { institution: "HDFC Bank", value: 342118.5, accountRef: "•7890" }],
  ["home loan", "Bajaj Finance Home Loan A/c LN00988712 Outstanding Principal ₹ 18,75,000 Due Date 05/10/2026",
    { value: 1875000, accountRef: "•8712", renewalDate: "2026-10-05" }],
  ["ICICI Pru", "ICICI Prudential Life  Policy Number 12345678  Sum Assured INR 50,00,000  Premium Due Date 01-01-2027",
    { institution: "ICICI Prudential", value: 5000000, accountRef: "•5678", renewalDate: "2027-01-01" }],
  ["SBI FD", "State Bank of India  Term Deposit  A/c No. 3456789012  Maturity Value Rs 2,20,000  Maturity Date 30 Jun 2028",
    { institution: "State Bank of India", value: 220000, accountRef: "•9012", maturityDate: "2028-06-30" }],
  ["Star Health", "Star Health and Allied Insurance  Policy # P/700/2026/004521  Sum Insured ₹ 10,00,000  Valid till 14/11/2026",
    { institution: "Star Health", value: 1000000, accountRef: "•4521", renewalDate: "2026-11-14" }],
  ["small balance", "Account No: 123 Balance 900", { value: 900 }],
  ["dd.mm.yy", "Renewal Date 05.02.27 Cover Amount 300000", { renewalDate: "2027-02-05", value: 300000 }],
  ["no labels", "Received Rs 5000 from Ramesh on 3 Sep 2026", {}],
  ["empty", "", {}],
  ["junk amount", "Balance abc", {}],
];
for (const [name, text, exp] of cases) {
  t("extract " + name, () => {
    const x = ex.extractHoldingFields(text);
    for (const k of Object.keys(exp)) assert.equal(x[k], exp[k], k);
    for (const k of Object.keys(x)) if (!(k in exp)) throw new Error("unexpected " + k + "=" + x[k]);
  });
}

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
