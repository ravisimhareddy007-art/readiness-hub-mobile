import { useEffect, useState } from "react";
import { X, Download, FileText, ShieldCheck } from "lucide-react";
import { getBlob } from "../lib/idb";
import { getDecrypted } from "../lib/secure-idb";
import type { Doc } from "../lib/types";

const fmt = (s?: string) =>
  s ? new Date(s).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const money = (v: number) => `$${v.toLocaleString("en-US")}`;

const rid = (p: string, n = 8) =>
  p + Array.from({ length: n }, () => "0123456789".at(Math.floor(Math.random() * 10))).join("");

/* deterministic-ish id from doc id so previews are stable */
function seededId(prefix: string, seed: string, n = 8) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  let out = "";
  for (let i = 0; i < n; i++) {
    out += (h % 10).toString();
    h = Math.floor(h / 7) + 13 * (i + 1);
  }
  return prefix + out;
}

function paper(title: string, issuer: string, accent: string, fields: [string, string][], body = "") {
  const rows = fields
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:#6b7280;font-size:12.5px;width:44%">${k}</td><td style="padding:8px 0;font-weight:600;font-size:13.5px;color:#111827">${v}</td></tr>`,
    )
    .join("");
  return `<div style="font-family:Inter,Arial,sans-serif;background:#fff;color:#111827">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${accent};padding-bottom:12px;margin-bottom:14px">
      <div style="font-weight:800;font-size:16px">${title}</div>
      <div style="text-align:right;color:#6b7280;font-size:12px">${issuer}</div>
    </div>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    ${body}
    <div style="margin-top:18px;padding-top:10px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:10.5px">Sample document rendered by ReadiNes for preview. Not an official copy.</div>
  </div>`;
}

function docHTML(doc: Doc, store: any): string {
  const owner = store.members.find((m: any) => m.id === doc.memberId) ||
    store.members[0] || { name: "Alex Morgan", dob: "1985-06-14", bloodGroup: "O+" };
  const name: string = owner.name;
  const dt = doc.docType;
  const labsFor = (id: string) => store.labs.filter((l: any) => l.memberId === id);
  const medsFor = (id: string) => store.meds.filter((m: any) => m.memberId === id);

  if (dt === "Passport")
    return paper("PASSPORT", "Department of State", "#1e3a8a", [
      ["Surname", name.split(" ").slice(-1)[0]],
      ["Given names", name.split(" ").slice(0, -1).join(" ")],
      ["Passport no.", seededId("P", doc.id)],
      ["Nationality", "United States"],
      ["Date of birth", fmt(owner.dob)],
      ["Date of expiry", fmt(doc.expiry)],
    ]);
  if (dt === "Aadhaar Card" || dt === "National ID")
    return paper("AADHAAR", "Unique Identification Authority of India", "#334155", [
      ["Full name", name],
      ["ID number", seededId("", doc.id, 11).replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3")],
      ["Date of birth", fmt(owner.dob)],
      ["Issued", fmt(doc.addedAt)],
    ]);
  if (dt === "PAN Card" || dt === "Tax ID")
    return paper("PERMANENT ACCOUNT NUMBER", "Income Tax Department", "#166534", [
      ["Taxpayer", name],
      ["TIN", seededId("", doc.id, 9).replace(/(\d{3})(\d{2})(\d{4})/, "$1-$2-$3")],
      ["Status", "Individual"],
      ["On file since", fmt(doc.addedAt)],
    ]);
  if (dt === "Driver's License")
    return paper("DRIVER LICENSE", "Dept. of Motor Vehicles", "#b45309", [
      ["Name", name],
      ["License no.", seededId("D", doc.id)],
      ["Class", "C"],
      ["DOB", fmt(owner.dob)],
      ["Expires", fmt(doc.expiry)],
    ]);
  if (dt === "Payslip")
    return paper(
      "PAYSLIP",
      "Payroll · Morgan Corp",
      "#4f46e5",
      [
        ["Employee", name],
        ["Pay period", fmt(doc.docDate || doc.addedAt)],
        ["Gross pay", money(8450)],
        ["Deductions", money(2110)],
        ["Net pay", money(6340)],
      ],
      `<div style="margin-top:12px;background:#f3f4f6;border-radius:8px;padding:10px 12px;font-size:12px;color:#374151">Direct deposit to account ••${seededId("", doc.id, 2)}</div>`,
    );
  if (dt === "Employment Offer")
    return paper("EMPLOYMENT OFFER", "Morgan Corp · People Ops", "#4f46e5", [
      ["Candidate", name],
      ["Position", "Senior Analyst"],
      ["Annual salary", money(148000)],
      ["Start date", fmt(doc.addedAt)],
      ["Status", "Signed"],
    ]);
  if (dt === "ITR Acknowledgement" || dt === "Tax Return")
    return paper("ITR-V ACKNOWLEDGEMENT", "Income Tax Department, Govt. of India", "#166534", [
      ["Filer", name],
      ["Tax year", "2025"],
      ["Total income", money(162400)],
      ["Tax paid", money(31890)],
      ["Refund", money(1240)],
    ]);
  if (dt === "Bank Statement")
    return paper("BANK STATEMENT", "Meridian Bank", "#0f766e", [
      ["Account holder", name],
      ["Account", "••••" + seededId("", doc.id, 4)],
      ["Period", fmt(doc.addedAt)],
      ["Opening balance", money(24310)],
      ["Closing balance", money(31775)],
    ]);
  if (dt === "Investment Statement")
    return paper("INVESTMENT STATEMENT", "Beacon Wealth", "#a16207", [
      ["Holder", name],
      ["Portfolio value", money(doc.value || 4200000)],
      ["Nominee", doc.nominee ? "On file" : "Not set"],
      ["As of", fmt(doc.addedAt)],
    ]);
  if (dt === "Health Insurance")
    return paper("HEALTH INSURANCE CARD", "Aegis Health", "#2FB68A", [
      ["Member", name],
      ["Policy no.", seededId("H", doc.id)],
      ["Plan", "Family Floater"],
      ["Valid to", fmt(doc.expiry)],
      ["Sum insured", money(500000)],
    ]);
  if (dt === "Life Insurance")
    return paper("LIFE INSURANCE POLICY", "Aegis Life", "#7c3aed", [
      ["Insured", name],
      ["Policy no.", seededId("L", doc.id)],
      ["Cover", money(doc.value || 10000000)],
      ["Nominee", doc.nominee ? "On file" : "NOT SET"],
      ["Premium", money(14500) + "/yr"],
    ]);
  if (dt === "Auto Insurance")
    return paper("AUTO INSURANCE", "Aegis Motor", "#0369a1", [
      ["Policyholder", name],
      ["Policy no.", seededId("A", doc.id)],
      ["Vehicle", "Sedan"],
      ["Valid to", fmt(doc.expiry)],
    ]);
  if (dt === "Property Deed")
    return paper("PROPERTY DEED", "Registrar of Titles", "#9d174d", [
      ["Owner", name],
      ["Title no.", seededId("T", doc.id)],
      ["Assessed value", money(doc.value || 18500000)],
      ["Nominee", doc.nominee ? "On file" : "Not set"],
    ]);
  if (dt === "Property Tax")
    return paper("PROPERTY TAX RECEIPT", "Municipal Authority", "#9d174d", [
      ["Owner", name],
      ["Assessment", seededId("PT", doc.id)],
      ["Amount paid", money(4820)],
      ["Paid on", fmt(doc.addedAt)],
    ]);

  if (dt === "Prescription") {
    const meds = medsFor(owner.id);
    const rx = meds.length
      ? meds
          .map(
            (m: any) =>
              `<div style="padding:9px 0;border-top:1px solid #e5e7eb"><b style="font-size:14px">${m.name} ${m.dose}</b><div style="color:#6b7280;font-size:12.5px">${m.freq}</div></div>`,
          )
          .join("")
      : `<div style="color:#9ca3af;font-size:13px;padding:8px 0">No medications on file</div>`;
    return paper(
      "PRESCRIPTION",
      store.care[owner.id]?.doctor || "Attending physician",
      "#a78bfa",
      [
        ["Patient", name],
        ["Date", fmt(doc.docDate || doc.addedAt)],
        ["DOB", fmt(owner.dob)],
      ],
      `<div style="margin-top:12px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px">Rx</div>${rx}`,
    );
  }

  if (dt === "Lab Report") {
    const labs = labsFor(owner.id);
    const bounds: Record<string, string> = {
      HbA1c: "< 5.7 %",
      LDL: "< 100 mg/dL",
      "Blood Pressure": "< 130/85",
      TSH: "0.4–4.0",
      "Fasting Glucose": "< 100",
    };
    const latest: Record<string, any> = {};
    labs.forEach((l: any) => {
      if (!latest[l.metric] || l.date > latest[l.metric].date) latest[l.metric] = l;
    });
    const rows =
      Object.values(latest)
        .map(
          (l: any) =>
            `<tr><td style="padding:7px 10px;font-size:13px">${l.metric}</td><td style="padding:7px 10px;font-weight:700;font-size:13px">${l.value2 ? `${l.value}/${l.value2}` : l.value} ${l.unit}</td><td style="padding:7px 10px;color:#6b7280;font-size:12.5px">${bounds[l.metric] || "—"}</td><td style="padding:7px 10px;color:#6b7280;font-size:12px">${fmt(l.date)}</td></tr>`,
        )
        .join("") || `<tr><td colspan="4" style="padding:8px 10px;color:#9ca3af">No results on file</td></tr>`;
    return paper(
      "LABORATORY REPORT",
      "Meridian Diagnostics",
      "#ec4899",
      [
        ["Patient", name],
        ["Collected", fmt(doc.docDate || doc.addedAt)],
        ["Report id", seededId("LR", doc.id)],
      ],
      `<table style="width:100%;border-collapse:collapse;margin-top:12px"><tr style="background:#f3f4f6"><th style="text-align:left;padding:6px 10px;font-size:11px;color:#6b7280">Test</th><th style="text-align:left;padding:6px 10px;font-size:11px;color:#6b7280">Result</th><th style="text-align:left;padding:6px 10px;font-size:11px;color:#6b7280">Reference</th><th style="text-align:left;padding:6px 10px;font-size:11px;color:#6b7280">Date</th></tr>${rows}</table>`,
    );
  }

  if (dt === "Discharge Summary")
    return paper("DISCHARGE SUMMARY", "Meridian Hospital", "#2FB68A", [
      ["Patient", name],
      ["Admitted", fmt(doc.docDate || doc.addedAt)],
      ["Discharged", fmt(doc.addedAt)],
      ["Condition on discharge", "Stable"],
    ]);
  if (dt === "Vaccination Record")
    return paper("VACCINATION RECORD", "Public Health", "#4FCB95", [
      ["Name", name],
      ["DOB", fmt(owner.dob)],
      ["Last dose", fmt(doc.docDate || doc.addedAt)],
      ["Status", "Up to date"],
    ]);

  return paper(dt.toUpperCase(), doc.source, "#64748b", [
    ["Belongs to", name],
    ["Category", doc.category],
    ["Source", doc.source],
    ["Added", fmt(doc.addedAt)],
  ]);
}

export default function DocViewer({ doc, store, onClose }: { doc: Doc; store: any; onClose: () => void }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"loading" | "image" | "pdf" | "template">("loading");

  useEffect(() => {
    let u: string | undefined;
    let alive = true;
    (async () => {
      if (doc.fileKey && doc.fileKey !== "seed") {
        try {
          const b = doc.enc && doc.iv && doc.wrappedKeys
            ? await getDecrypted(doc.fileKey, doc.iv, doc.wrappedKeys, "you", doc.mime)
            : await getBlob(doc.fileKey);
          if (b && alive) {
            u = URL.createObjectURL(b);
            setBlobUrl(u);
            setMode(doc.mime.startsWith("image") ? "image" : doc.mime.includes("pdf") ? "pdf" : "template");
            return;
          }
        } catch {}
      }
      if (alive) setMode("template");
    })();
    return () => {
      alive = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [doc]);

  const html = docHTML(doc, store);

  const download = () => {
    if (blobUrl) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = doc.name;
      a.click();
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(4,6,15,.66)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px,100%)",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          background: "#111524",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 34,
              height: 34,
              borderRadius: 9,
              background: "rgba(216,178,90,0.16)",
            }}
          >
            <FileText size={17} color="#D8B25A" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "#EAEDF7" }}>{doc.docType}</div>
            <div style={{ fontSize: 12, color: "rgba(234,237,247,0.5)" }}>
              {doc.source} · {doc.category}
              {doc.expiry ? ` · valid to ${fmt(doc.expiry)}` : ""}
            </div>
          </div>
          {blobUrl && (
            <button
              onClick={download}
              title="Download"
              style={{
                display: "grid",
                placeItems: "center",
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
                color: "#EAEDF7",
                cursor: "pointer",
              }}
            >
              <Download size={15} />
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              display: "grid",
              placeItems: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "#EAEDF7",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto", background: "#0b0e18", padding: 16 }}>
          {mode === "loading" && (
            <div style={{ color: "rgba(234,237,247,0.5)", fontSize: 13, padding: 20, textAlign: "center" }}>
              Opening…
            </div>
          )}
          {mode === "image" && blobUrl && (
            <img
              src={blobUrl}
              alt={doc.name}
              style={{ maxWidth: "100%", borderRadius: 8, display: "block", margin: "0 auto" }}
            />
          )}
          {mode === "pdf" && blobUrl && (
            <iframe
              title={doc.name}
              src={blobUrl}
              style={{ width: "100%", height: "62vh", border: "none", borderRadius: 8, background: "#fff" }}
            />
          )}
          {mode === "template" && (
            <div
              style={{ background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "10px 16px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(234,237,247,0.5)",
            fontSize: 12,
          }}
        >
          <ShieldCheck size={13} color="#2FB68A" /> Stored on your device.
          {doc.fileKey === "seed" ? " Sample preview." : ""}
        </div>
      </div>
    </div>
  );
}
