import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Trash2, Download } from "lucide-react";
import { getBlob } from "../lib/idb";
import { getDecrypted } from "../lib/secure-idb";
import { CATEGORIES } from "../lib/classify";
import { useStore } from "../lib/store";
import type { Doc } from "../lib/types";
import { fmtDate } from "./ui";

export default function Viewer({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const { members, updateDoc, removeDoc } = useStore();
  const [url, setUrl] = useState<string>("");
  const [blobMime, setBlobMime] = useState(doc.mime);

  useEffect(() => {
    let u = "";
    const load = doc.enc && doc.iv && doc.wrappedKeys
      ? getDecrypted(doc.fileKey, doc.iv, doc.wrappedKeys, "you", doc.mime)
      : getBlob(doc.fileKey);
    load.then((b) => { if (b) { u = URL.createObjectURL(b); setUrl(u); setBlobMime(b.type || doc.mime); } });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [doc.fileKey, doc.mime]);

  const isImg = blobMime.startsWith("image/");
  const isPdf = blobMime.includes("pdf");

  const field = "w-full mt-1 rounded-lg border border-[#E7EAF3] px-3 py-2 text-[14px] text-ink outline-none focus:border-brand";
  const label = "text-[12px] font-semibold text-[#98A1B5] uppercase tracking-wide";

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-sm flex items-center justify-center p-4 no-print">
      <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: .96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-[#F5F2EA] rounded-2xl shadow-lg2 w-full max-w-[960px] max-h-[88vh] overflow-hidden flex flex-col md:flex-row">
        {/* preview */}
        <div className="flex-1 bg-[#0B0E24] grid place-items-center min-h-[280px] overflow-auto">
          {url && isImg && <img src={url} alt={doc.name} className="max-w-full max-h-[88vh] object-contain" />}
          {url && isPdf && <iframe src={url} title={doc.name} className="w-full h-[88vh] border-0" />}
          {url && !isImg && !isPdf && (
            <div className="text-center text-white/70 p-8">
              <p className="font-semibold">{doc.name}</p>
              <p className="text-[13px] mt-2">Preview not available for this type. Use download.</p>
              <a href={url} download={doc.name} className="inline-flex items-center gap-2 mt-4 bg-brand text-white px-4 py-2 rounded-lg text-[14px]">
                <Download size={15} /> Download</a>
            </div>
          )}
          {!url && <div className="text-white/50">Loading…</div>}
        </div>
        {/* meta panel */}
        <div className="w-full md:w-[320px] p-5 overflow-auto bg-white border-l border-[#E7EAF3]">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-ink text-[16px] leading-snug">{doc.name}</h3>
            <button onClick={onClose} className="shrink-0 w-8 h-8 grid place-items-center rounded-lg border border-[#E7EAF3]"><X size={16} /></button>
          </div>
          <p className="text-[12px] text-[#98A1B5] mt-1 font-mono">{doc.sizeKB} KB · added {fmtDate(doc.addedAt)}</p>

          <div className="mt-4 grid gap-3">
            <div>
              <div className={label}>Category</div>
              <select className={field} value={doc.category} onChange={(e) => updateDoc(doc.id, { category: e.target.value as any })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div className={label}>Document type</div>
              <input className={field} value={doc.docType} onChange={(e) => updateDoc(doc.id, { docType: e.target.value })} />
            </div>
            <div>
              <div className={label}>Belongs to</div>
              <select className={field} value={doc.memberId || ""} onChange={(e) => updateDoc(doc.id, { memberId: e.target.value || undefined })}>
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className={label}>Doc date</div>
                <input type="date" className={field} value={doc.docDate?.slice(0, 10) || ""}
                  onChange={(e) => updateDoc(doc.id, { docDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
              </div>
              <div>
                <div className={label}>Expiry</div>
                <input type="date" className={field} value={doc.expiry?.slice(0, 10) || ""}
                  onChange={(e) => updateDoc(doc.id, { expiry: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
              </div>
            </div>
            <div>
              <div className={label}>Notes</div>
              <textarea className={field} rows={2} value={doc.notes || ""} onChange={(e) => updateDoc(doc.id, { notes: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            {url && <a href={url} download={doc.name} className="flex-1 inline-flex items-center justify-center gap-2 bg-brand text-white rounded-lg py-2.5 text-[14px] font-semibold"><Download size={15} /> Download</a>}
            <button onClick={() => { removeDoc(doc.id); onClose(); }} className="w-11 grid place-items-center rounded-lg border border-[#FBEBEC] text-bad"><Trash2 size={16} /></button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
