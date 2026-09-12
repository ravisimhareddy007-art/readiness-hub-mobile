import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { useStore } from "../lib/store";
import { CATEGORIES } from "../lib/classify";
import { CAT_META, Card, Pill, Dropzone, SectionHead, fmtDate } from "./ui";
import Viewer from "./Viewer";
import type { Doc } from "../lib/types";

export default function Documents() {
  const { docs, addFiles } = useStore();
  const [active, setActive] = useState<string>("All");
  const [open, setOpen] = useState<Doc | null>(null);
  const tabs = ["All", ...CATEGORIES];
  const list = useMemo(() => active === "All" ? docs : docs.filter((d) => d.category === active), [docs, active]);

  return (
    <>
      <SectionHead title="Documents" sub={`${docs.length} documents in your vault. Click any to view, re-tag, or download.`} />
      <div className="mb-5"><Dropzone compact onFiles={(f) => addFiles(f)} /></div>

      <div className="flex gap-2 flex-wrap mb-4">
        {tabs.map((c) => (
          <button key={c} onClick={() => setActive(c)}
            className="px-3.5 py-2 rounded-full text-[13px] font-semibold transition"
            style={{ border: `1px solid ${active === c ? "#0B0E24" : "#E7EAF3"}`, background: active === c ? "rgba(11,14,36,.06)" : "#fff", color: active === c ? "#0B0E24" : "#69728A" }}>
            {c}{c !== "All" && <span className="ml-1.5 font-mono text-[11px] opacity-60">{docs.filter((d) => d.category === c).length}</span>}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Card className="p-10 text-center text-[#98A1B5]">
          <FileText className="mx-auto mb-3 text-[#C9CEE0]" size={32} />
          <p className="font-semibold text-ink">Nothing here yet</p>
          <p className="text-[13px] mt-1">Upload documents above and they'll be classified automatically.</p>
        </Card>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
          {list.map((d, i) => {
            const Ic = CAT_META[d.category].icon;
            return (
              <motion.button key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                onClick={() => setOpen(d)} className="text-left">
                <Card className="p-4 hover:shadow-lg2 transition h-full">
                  <div className="flex items-start gap-3">
                    <span className="grid place-items-center rounded-xl shrink-0" style={{ width: 38, height: 38, background: CAT_META[d.category].color + "16" }}>
                      <Ic size={18} color={CAT_META[d.category].color} /></span>
                    <div className="min-w-0">
                      <div className="font-semibold text-ink text-[14px] truncate">{d.name}</div>
                      <div className="text-[12px] text-[#98A1B5] mt-0.5">{d.docType}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Pill>{d.category}</Pill>
                    {d.expiry && <Pill tone={new Date(d.expiry) < new Date() ? "bad" : "warn"}>exp {fmtDate(d.expiry)}</Pill>}
                    <span className="ml-auto font-mono text-[11px] text-[#C0C6D8]">{d.source}</span>
                  </div>
                </Card>
              </motion.button>
            );
          })}
        </div>
      )}
      {open && <Viewer doc={open} onClose={() => setOpen(null)} />}
    </>
  );
}
