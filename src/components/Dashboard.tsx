import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Clock, AlertTriangle, ChevronRight, UploadCloud } from "lucide-react";
import { useStore } from "../lib/store";
import { CATEGORIES } from "../lib/classify";
import { EVENTS, evalEvent, type LifeEvent } from "../lib/events";
import { PackageModal } from "./Events";
import { CAT_META, EVENT_ICONS, Ring, Card, Pill, SectionHead, SubHead, Dropzone, fmtDate } from "./ui";

const EXPECTED: Record<string, string[]> = {
  Identity: ["Passport", "Aadhaar", "PAN", "Driving Licence"],
  Employment: ["Offer Letter", "Payslip", "Relieving Letter", "Experience Letter"],
  Finance: ["Form 16", "Bank Statement", "ITR", "Investment Statement"],
  Insurance: ["Health Insurance", "Vehicle Insurance", "Life Insurance"],
  Property: ["Sale Deed", "Property Tax Receipt", "Rental Agreement"],
  Medical: ["Prescription", "Lab Report"],
};

export default function Dashboard({ toast }: { toast: (m: string) => void }) {
  const { docs, addFiles } = useStore();
  const [prompt, setPrompt] = useState("");
  const [open, setOpen] = useState<LifeEvent | null>(null);

  const expiring = useMemo(() => docs.filter((d) => d.expiry)
    .map((d) => ({ d, days: Math.ceil((+new Date(d.expiry!) - Date.now()) / 86400000) }))
    .sort((a, b) => a.days - b.days).slice(0, 5), [docs]);

  const gaps = useMemo(() => {
    const g: { name: string; detail: string; tone: "warn" | "bad" }[] = [];
    CATEGORIES.forEach((c) => { if (!docs.some((d) => d.category === c)) g.push({ name: `No ${c.toLowerCase()} documents`, detail: `Add your ${c.toLowerCase()} records to stay ready`, tone: "warn" }); });
    expiring.filter((e) => e.days < 0).forEach((e) => g.push({ name: `${e.d.docType} expired`, detail: e.d.name, tone: "bad" }));
    return g.slice(0, 4);
  }, [docs, expiring]);

  const startPrompt = () => {
    const q = prompt.toLowerCase();
    const ev = EVENTS.find((e) => q.includes(e.name.toLowerCase().split(" ")[0])) || EVENTS[0];
    setOpen(ev);
  };

  return (
    <>
      <SectionHead title="Good morning, Ravi" sub="Your document graph and what needs attention." />

      {docs.length === 0 && (
        <Card className="p-5 mb-6 flex items-center gap-4">
          <span className="grid place-items-center rounded-xl shrink-0" style={{ width: 44, height: 44, background: "#0B0E2412" }}><UploadCloud size={20} className="text-brand" /></span>
          <div className="flex-1"><div className="font-semibold text-ink">Your vault is empty</div><div className="text-[13px] text-[#69728A]">Add a few documents to see readiness scores light up.</div></div>
          <div className="w-[260px]"><Dropzone compact onFiles={(f) => addFiles(f)} /></div>
        </Card>
      )}

      {/* event generator */}
      <div className="rounded-2xl p-6 mb-7 relative overflow-hidden" style={{ background: "#0B0E24" }}>
        <div className="absolute -right-10 -top-10 w-52 h-52" style={{ background: "radial-gradient(circle,rgba(138,107,244,.45),transparent 70%)" }} />
        <div className="relative">
          <div className="flex items-center gap-2 text-[#C9CEF0] text-[13px] font-semibold mb-2.5"><Sparkles size={15} /> Life Event Generator</div>
          <h2 className="font-display text-white text-[21px] font-bold mb-4 tracking-tight">What would you like to prepare for?</h2>
          <div className="flex gap-2.5 items-center rounded-xl pl-4 pr-1.5 py-1.5" style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.14)" }}>
            <input value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && startPrompt()}
              placeholder="e.g. Prepare my Schengen visa package" className="flex-1 bg-transparent outline-none text-white text-[15px] placeholder:text-white/40" />
            <button onClick={startPrompt} className="flex items-center gap-1.5 text-white rounded-lg px-4 py-2.5 text-[14px] font-semibold" style={{ background: "#0B0E24" }}>Generate <ArrowRight size={15} /></button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3.5">
            {EVENTS.map((e) => { const Ic = EVENT_ICONS[e.icon]; return (
              <button key={e.id} onClick={() => setOpen(e)} className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium" style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", color: "#E6E9F8" }}>
                <Ic size={14} /> {e.name}</button>); })}
          </div>
        </div>
      </div>

      {/* readiness */}
      <SubHead>Readiness center</SubHead>
      <div className="grid gap-3.5 mb-7" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
        {EVENTS.slice(0, 4).map((e) => {
          const { score, rows } = evalEvent(e, docs);
          const tone = score >= 90 ? "#2FB68A" : score >= 70 ? "#D8B25A" : "#E04A4F";
          const Ic = EVENT_ICONS[e.icon];
          return (
            <button key={e.id} onClick={() => setOpen(e)} className="text-left">
              <Card className="p-4 flex items-center gap-3.5 hover:shadow-lg2 transition">
                <Ring value={score} size={56} stroke={5} color={tone} />
                <div>
                  <div className="text-[14px] font-semibold text-ink flex items-center gap-1.5"><Ic size={14} className="text-[#69728A]" /> {e.name}</div>
                  <div className="text-[12px] text-[#98A1B5] mt-0.5">{score >= 90 ? "Ready to submit" : `${rows.filter((r) => !r.have).length} items missing`}</div>
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      {/* document graph */}
      <SubHead>Your document graph</SubHead>
      <div className="grid gap-3.5 mb-7" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))" }}>
        {CATEGORIES.map((cat) => {
          const items = docs.filter((d) => d.category === cat);
          const exp = EXPECTED[cat];
          const have = exp.filter((t) => items.some((d) => d.docType.includes(t) || t.includes(d.docType))).length;
          const comp = Math.round((have / exp.length) * 100);
          const latest = items.map((d) => d.addedAt).sort().slice(-1)[0];
          const Ic = CAT_META[cat].icon;
          return (
            <Card key={cat} className="p-[18px]">
              <div className="flex items-center justify-between">
                <span className="grid place-items-center rounded-xl" style={{ width: 38, height: 38, background: CAT_META[cat].color + "16" }}><Ic size={18} color={CAT_META[cat].color} /></span>
                <Ring value={comp} size={42} stroke={4} color={comp >= 85 ? "#2FB68A" : comp >= 50 ? "#D8B25A" : "#E04A4F"} />
              </div>
              <div className="text-[15px] font-semibold text-ink mt-3.5">{cat}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="font-mono text-[13px] text-[#69728A]">{items.length} docs</span>
                <span className="text-[#E7EAF3]">·</span>
                <span className="text-[12.5px] text-[#98A1B5]">{latest ? `updated ${fmtDate(latest)}` : "empty"}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* expiring + gaps */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        <Card className="p-[18px]">
          <div className="flex items-center gap-2 mb-3.5"><Clock size={17} className="text-[#69728A]" /><span className="font-bold text-ink text-[14.5px]">Expiring soon</span></div>
          {expiring.length === 0 ? <p className="text-[13px] text-[#98A1B5]">No expiry dates set. Open a document to add one.</p> :
            expiring.map((e, i) => (
              <div key={e.d.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: i ? "1px solid #EEF1F8" : "none" }}>
                <div className="flex-1 min-w-0"><div className="text-[14px] font-semibold text-ink truncate">{e.d.docType}</div><div className="text-[12px] text-[#98A1B5] truncate">{fmtDate(e.d.expiry)}</div></div>
                <Pill tone={e.days < 0 ? "bad" : e.days < 30 ? "warn" : "muted"}>{e.days < 0 ? "Expired" : `${e.days}d`}</Pill>
              </div>
            ))}
        </Card>
        <Card className="p-[18px]">
          <div className="flex items-center gap-2 mb-3.5"><AlertTriangle size={17} className="text-[#69728A]" /><span className="font-bold text-ink text-[14.5px]">Gaps & attention</span></div>
          {gaps.length === 0 ? <p className="text-[13px] text-[#98A1B5]">No gaps detected. Nice and tidy.</p> :
            gaps.map((g, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderTop: i ? "1px solid #EEF1F8" : "none" }}>
                <span className="grid place-items-center rounded-lg shrink-0" style={{ width: 32, height: 32, background: g.tone === "bad" ? "#FBEBEC" : "#FBF1E0" }}><AlertTriangle size={15} color={g.tone === "bad" ? "#E04A4F" : "#D8B25A"} /></span>
                <div className="flex-1 min-w-0"><div className="text-[14px] font-semibold text-ink">{g.name}</div><div className="text-[12px] text-[#98A1B5] truncate">{g.detail}</div></div>
              </div>
            ))}
        </Card>
      </div>

      <AnimatePresence>{open && <PackageModal ev={open} onClose={() => setOpen(null)} toast={toast} />}</AnimatePresence>
    </>
  );
}
