import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Plus, Download, Share2, Mail, ListChecks, AlertTriangle, CheckCircle2, ArrowRight, Lock } from "lucide-react";
import { EVENTS, evalEvent, type LifeEvent } from "../lib/events";
import { useStore } from "../lib/store";
import { buildZip } from "../lib/zip";
import { Ring, Card, EVENT_ICONS, SectionHead } from "./ui";
import { Stamp } from "lucide-react";

export function PackageModal({ ev, onClose, toast }: { ev: LifeEvent; onClose: () => void; toast: (m: string) => void }) {
  const { docs } = useStore();
  const { rows, score, haveDocs } = evalEvent(ev, docs);
  const [building, setBuilding] = useState(true);
  React.useEffect(() => { const t = setTimeout(() => setBuilding(false), 900); return () => clearTimeout(t); }, []);
  const Ic = EVENT_ICONS[ev.icon];
  const tone = score >= 90 ? "#2FB68A" : score >= 70 ? "#D8B25A" : "#E04A4F";
  const have = rows.filter((r) => r.have), miss = rows.filter((r) => !r.have);

  const onZip = async () => {
    if (!haveDocs.length) { toast("No matching files yet — upload documents first"); return; }
    toast(`Zipping ${haveDocs.length} files…`);
    await buildZip(`${ev.name} Package`, haveDocs);
    toast("Package downloaded");
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-sm flex justify-end no-print">
      <motion.div onClick={(e) => e.stopPropagation()} initial={{ x: 40, opacity: .4 }} animate={{ x: 0, opacity: 1 }}
        className="w-[min(480px,100%)] h-full overflow-y-auto bg-[#F5F2EA] shadow-lg2">
        <div className="bg-ink p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 grid place-items-center rounded-lg bg-white/10"><X size={18} color="#fff" /></button>
          <div className="flex items-center gap-3">
            <span className="grid place-items-center rounded-xl" style={{ width: 46, height: 46, background: "#0B0E24" }}><Ic size={22} color="#fff" /></span>
            <div><div className="font-display text-white text-[19px] font-bold">{ev.name} package</div><div className="text-[#AEB6D8] text-[13px]">{ev.blurb}</div></div>
          </div>
          <div className="flex items-center gap-4 mt-5">
            <div className="relative"><Ring value={building ? 0 : score} size={72} stroke={6} color={tone} track="rgba(255,255,255,.14)" />{!building && score >= 90 && <span className="absolute -right-2 -top-1 flex items-center gap-1 border-2 border-verified text-verified font-mono text-[10px] font-bold uppercase rounded px-1.5 py-0.5 rotate-[-8deg] bg-ink"><Stamp size={10}/>Ready</span>}</div>
            <div>
              <div className="text-white text-[14px] font-semibold">{building ? "Assembling from your vault…" : "Readiness score"}</div>
              <div className="text-[#AEB6D8] text-[13px] mt-0.5 font-mono">{building ? "matching your documents" : `${have.length} of ${rows.length} ready`}</div>
            </div>
          </div>
        </div>

        <div className="p-5">
          <Card className="p-0 mb-3.5">
            <div className="flex items-center gap-2 px-4.5 py-3.5 px-[18px]"><CheckCircle2 size={17} className="text-[#69728A]" /><span className="font-bold text-ink text-[14.5px]">Included ({have.length})</span></div>
            {have.map((r) => (
              <div key={r.label} className="flex items-center gap-3 px-[18px] py-2.5 border-t border-[#EEF1F8]">
                <span className="w-5.5 h-5.5 grid place-items-center rounded-md bg-[#E7F7EF]" style={{ width: 22, height: 22 }}><Check size={13} className="text-ok" /></span>
                <span className="text-[14px] text-ink flex-1">{r.label}</span>
                <span className="font-mono text-[11px] text-[#98A1B5] truncate max-w-[110px]">{r.doc?.name}</span>
              </div>
            ))}
            {have.length === 0 && <div className="px-[18px] py-4 text-[13px] text-[#98A1B5] border-t border-[#EEF1F8]">Nothing matched yet. Upload documents and they'll appear here.</div>}
          </Card>

          {miss.length > 0 && (
            <Card className="p-0 mb-4">
              <div className="flex items-center gap-2 px-[18px] py-3.5"><AlertTriangle size={17} className="text-[#69728A]" /><span className="font-bold text-ink text-[14.5px]">Still needed ({miss.length})</span></div>
              {miss.map((r) => (
                <div key={r.label} className="flex items-center gap-3 px-[18px] py-2.5 border-t border-[#EEF1F8]">
                  <span className="grid place-items-center rounded-md bg-[#FBF1E0]" style={{ width: 22, height: 22 }}><X size={13} className="text-warn" /></span>
                  <span className="text-[14px] text-ink flex-1">{r.label}</span>
                  <span className="font-mono text-[11px] text-[#C0C6D8]">add</span>
                </div>
              ))}
            </Card>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={onZip} className="flex items-center justify-center gap-2 py-3 rounded-xl text-white text-[14px] font-semibold" style={{ background: "#0B0E24", boxShadow: "0 8px 20px rgba(11,14,36,.20)" }}><Download size={16} /> Download ZIP</button>
            <button onClick={() => toast("Secure link copied · expires in 7 days")} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-[#E7EAF3] text-ink text-[14px] font-semibold"><Share2 size={16} /> Share link</button>
            <button onClick={() => toast("Package emailed to you")} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-[#E7EAF3] text-ink text-[14px] font-semibold"><Mail size={16} /> Email</button>
            <button onClick={() => toast(`Checklist created · ${miss.length} to-dos`)} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-[#E7EAF3] text-ink text-[14px] font-semibold"><ListChecks size={16} /> Checklist</button>
          </div>
          <p className="text-[12px] text-[#98A1B5] text-center mt-4 flex items-center justify-center gap-1.5"><Lock size={12} /> Files stay on your device until you export.</p>
        </div>
      </motion.div>
    </div>
  );
}

export default function Events({ toast }: { toast: (m: string) => void }) {
  const { docs } = useStore();
  const [open, setOpen] = useState<LifeEvent | null>(null);
  return (
    <>
      <SectionHead title="Life events" sub="Pick an event. ReadiNes assembles the package from your vault in seconds." />
      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
        {EVENTS.map((ev, i) => {
          const { score, rows } = evalEvent(ev, docs);
          const tone = score >= 90 ? "#2FB68A" : score >= 70 ? "#D8B25A" : "#E04A4F";
          const Ic = EVENT_ICONS[ev.icon];
          return (
            <motion.button key={ev.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              onClick={() => setOpen(ev)} className="text-left">
              <Card className="p-4.5 p-[18px] hover:shadow-lg2 transition h-full">
                <div className="flex justify-between items-start">
                  <span className="grid place-items-center rounded-xl" style={{ width: 42, height: 42, background: "#0B0E24" }}><Ic size={20} color="#fff" /></span>
                  <Ring value={score} size={48} stroke={4} color={tone} />
                </div>
                <div className="text-[16px] font-semibold text-ink mt-3.5">{ev.name}</div>
                <div className="text-[13px] text-[#98A1B5] mt-0.5">{ev.blurb}</div>
                <div className="mt-3.5 text-[13px] font-semibold text-brand flex items-center gap-1.5">Prepare package <ArrowRight size={14} /></div>
              </Card>
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence>{open && <PackageModal ev={open} onClose={() => setOpen(null)} toast={toast} />}</AnimatePresence>
    </>
  );
}
