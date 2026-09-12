import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Fingerprint, Briefcase, Landmark, Shield, Home, HeartPulse, Plane, FileText,
  ShieldCheck, UploadCloud,
} from "lucide-react";
import type { Category } from "../lib/types";
import { BrandMark } from "./BrandLogo";

export const CAT_META: Record<Category, { icon: any; color: string }> = {
  Identity:   { icon: Fingerprint, color: "#0B0E24" },
  Employment: { icon: Briefcase,   color: "#6E8BFF" },
  Finance:    { icon: Landmark,    color: "#2FB68A" },
  Insurance:  { icon: Shield,      color: "#D8B25A" },
  Property:   { icon: Home,        color: "#E04A4F" },
  Medical:    { icon: HeartPulse,  color: "#E0508F" },
};

export const EVENT_ICONS: Record<string, any> = {
  Plane, Landmark, ShieldCheck, HeartPulse, FileText, Home,
};

export const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export function Ring({ value, size = 54, stroke = 5, color = "#0B0E24", track = "#EAEDF6", label }:
  { value: number; size?: number; stroke?: number; color?: string; track?: string; label?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c - (value / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: off }}
          transition={{ duration: 1, ease: "easeOut" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-mono font-semibold text-ink"
        style={{ fontSize: size > 60 ? 17 : 12 }}>{label ?? `${value}%`}</div>
    </div>
  );
}

export function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "ok" | "warn" | "bad" }) {
  const map: any = {
    muted: ["#69728A", "#EEF1F8"], ok: ["#2FB68A", "#E7F7EF"],
    warn: ["#D8B25A", "#FBF1E0"], bad: ["#E04A4F", "#FBEBEC"],
  };
  const [c, bg] = map[tone];
  return <span className="font-mono font-semibold" style={{ fontSize: 11, color: c, background: bg, padding: "3px 8px", borderRadius: 20 }}>{children}</span>;
}

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...p }) => (
  <div className={`bg-white border border-[#E7EAF3] rounded-2xl shadow-soft ${className}`} {...p} />
);

export function Brand({ large }: { large?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid place-items-center rounded-xl shadow-soft"
        style={{ width: large ? 40 : 32, height: large ? 40 : 32, background: "#1E242B" }}>
        <BrandMark size={large ? 24 : 19} color="#D9A441" carve="#1E242B" />
      </span>
      <span className="font-display font-bold text-ink tracking-tight" style={{ fontSize: large ? 22 : 17 }}>
        Readi<span className="text-seal">N</span>es
      </span>
    </div>
  );
}

export function Dropzone({ onFiles, compact }: { onFiles: (f: FileList) => void; compact?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files); }}
      onClick={() => ref.current?.click()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed grid place-items-center text-center transition
        ${over ? "border-brand bg-brand/5" : "border-[#D5DAEA] bg-white hover:border-brand/60"}`}
      style={{ padding: compact ? "20px" : "40px 24px" }}>
      <input ref={ref} type="file" multiple hidden
        onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.currentTarget.value = ""; }} />
      <UploadCloud size={compact ? 24 : 32} className="text-seal mb-2" />
      <div className="font-semibold text-ink" style={{ fontSize: compact ? 14 : 16 }}>
        Drop files or click to upload
      </div>
      <div className="text-[#98A1B5] text-[13px] mt-1">PDF, JPG, PNG · classified automatically on upload</div>
    </div>
  );
}

export const SectionHead = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="mb-5">
    <h1 className="font-display text-[25px] font-bold text-ink tracking-tight m-0">{title}</h1>
    {sub && <p className="text-[#69728A] text-[14.5px] mt-1.5">{sub}</p>}
  </div>
);
export const SubHead = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[12px] font-mono font-semibold text-seal uppercase tracking-[.18em] mb-3">{children}</h3>
);
