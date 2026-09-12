import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Download,
  Printer,
  Users,
  Pill as PillIcon,
  FlaskConical,
  Stethoscope,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Bell,
  ShieldCheck,
  Syringe,
  CalendarClock,
  RefreshCw,
  UserPlus,
  Info,
  Trash2,
  Edit3,
  Activity,
  HeartPulse,
  Camera,
  Image as ImageIcon,
  Upload,
  ClipboardList,
  AlertTriangle,
  Check,
  IdCard,
  ChevronDown,
} from "lucide-react";
import { useStore, selectVisitDocs } from "../lib/store";
import { buildZip } from "../lib/zip";
import DocViewer from "./DocViewer";
import type { Doc, Member, LabLog, Medication, ReminderKind } from "../lib/types";

/* ── theme ── */
const C = {
  panel: "rgba(255,255,255,0.035)",
  panel2: "rgba(255,255,255,0.055)",
  border: "rgba(255,255,255,0.08)",
  text: "#EAEDF7",
  sub: "rgba(234,237,247,0.62)",
  faint: "rgba(234,237,247,0.40)",
  gold: "#D8B25A",
  emerald: "#2FB68A",
  red: "#F26D6D",
  violet: "#A78BFA",
  pink: "#F472B6",
  cyan: "#6E8BFF",
};
const rel = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (s?: string) =>
  s ? new Date(s).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const mon = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", year: "numeric" });
const daysTo = (s: string) => Math.ceil((+new Date(s) - Date.now()) / 86400000);
const age = (dob?: string) => (dob ? Math.floor((Date.now() - +new Date(dob)) / (365.25 * 86400000)) : null);

/* ── reference ranges (standard published values) ── */
export type Status = "in" | "watch" | "out" | "none";
export const METRICS: Record<
  string,
  { unit: string; bp?: boolean; ref: string; band?: [number, number]; status: (a: number, b?: number) => Status }
> = {
  HbA1c: {
    unit: "%",
    ref: "under 5.7% normal, 6.5%+ high",
    band: [4, 5.7],
    status: (v) => (v < 5.7 ? "in" : v < 6.5 ? "watch" : "out"),
  },
  LDL: {
    unit: "mg/dL",
    ref: "under 100 optimal, 130+ high",
    band: [40, 100],
    status: (v) => (v < 100 ? "in" : v < 130 ? "watch" : "out"),
  },
  "Fasting Glucose": {
    unit: "mg/dL",
    ref: "under 100 normal, 126+ high",
    band: [70, 100],
    status: (v) => (v < 100 ? "in" : v < 126 ? "watch" : "out"),
  },
  "Blood Pressure": {
    unit: "mmHg",
    bp: true,
    ref: "under 130/85 in range",
    band: [90, 130],
    status: (s, d = 0) => (s < 130 && d < 85 ? "in" : s < 140 && d < 90 ? "watch" : "out"),
  },
  TSH: {
    unit: "mIU/L",
    ref: "0.4 to 4.0 normal",
    band: [0.4, 4],
    status: (v) => (v >= 0.4 && v <= 4 ? "in" : v <= 6 ? "watch" : "out"),
  },
  Weight: { unit: "kg", ref: "tracked", status: () => "none" },
};
function focusFor(label: string): string[] {
  const l = (label || "").toLowerCase();
  if (/endocrin|diabet|thyroid|sugar|glucose/.test(l)) return ["HbA1c", "Fasting Glucose", "TSH", "LDL"];
  if (/cardio|heart|hypertens|pressure|\bbp\b/.test(l)) return ["Blood Pressure", "LDL"];
  return [];
}
const SM: Record<Status, { label: string; c: string }> = {
  in: { label: "in range", c: C.emerald },
  watch: { label: "watch", c: C.gold },
  out: { label: "out of range", c: C.red },
  none: { label: "tracked", c: C.faint },
};
const KIND: Record<string, { icon: any; c: string; label: string }> = {
  reading: { icon: Activity, c: C.cyan, label: "Reading" },
  prescription: { icon: PillIcon, c: C.violet, label: "Prescription" },
  lab_report: { icon: FlaskConical, c: C.pink, label: "Lab report" },
  discharge: { icon: Stethoscope, c: C.emerald, label: "Consultation" },
  scan: { icon: ClipboardList, c: C.gold, label: "Scan" },
  other: { icon: ClipboardList, c: C.faint, label: "Record" },
};
export const sortR = (a: LabLog, b: LabLog) => a.date.localeCompare(b.date);
export const statusOf = (metric: string, r: LabLog[]): Status => {
  if (!r.length) return "none";
  const l = r[r.length - 1];
  return METRICS[metric].status(l.value, l.value2);
};

/* intent-based record types: people think "I have a blood report", not "upload" */
const RECORD_TYPES: { label: string; short: string; icon: any; c: string; override: Partial<Doc> }[] = [
  {
    label: "Add prescription",
    short: "Prescription",
    icon: PillIcon,
    c: C.violet,
    override: { category: "Medical", docType: "Prescription", medType: "prescription" },
  },
  {
    label: "Add blood report",
    short: "Blood report",
    icon: FlaskConical,
    c: C.pink,
    override: { category: "Medical", docType: "Lab Report", medType: "lab_report" },
  },
  {
    label: "Add scan",
    short: "Scan",
    icon: ClipboardList,
    c: C.gold,
    override: { category: "Medical", docType: "Scan / Imaging", medType: "scan" },
  },
  {
    label: "Add vaccine record",
    short: "Vaccine record",
    icon: Syringe,
    c: C.emerald,
    override: { category: "Medical", docType: "Vaccination Record", medType: "other" },
  },
  {
    label: "Add discharge",
    short: "Discharge summary",
    icon: Stethoscope,
    c: C.cyan,
    override: { category: "Medical", docType: "Discharge Summary", medType: "discharge" },
  },
];

export default function Healthcare({ toast: extToast }: { toast?: (m: string) => void }) {
  const s = useStore();
  const [localToast, setLocalToast] = useState<string | null>(null);
  const toast = (m: string) => {
    if (extToast) extToast(m);
    else {
      setLocalToast(m);
      window.clearTimeout((toast as any)._t);
      (toast as any)._t = window.setTimeout(() => setLocalToast(null), 2200);
    }
  };

  const [sel, setSel] = useState(s.members[0]?.id || "you");
  const [tab, setTab] = useState<"overview" | "timeline" | "meds" | "records">("overview");
  const [modal, setModal] = useState<
    null | "reading" | "member" | "med" | "reminder" | "profile" | "emergency" | "visit"
  >(null);
  const [printHTML, setPrintHTML] = useState("");
  const [insightOpen, setInsightOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<Doc | null>(null);
  const recRef = useRef<HTMLInputElement>(null);
  const pendingRec = useRef<{ override: Partial<Doc>; label: string } | null>(null);

  const m = s.members.find((x) => x.id === sel) || s.members[0];
  const care = s.care[sel] || {
    conditions: [],
    medications: [],
    allergies: "None recorded",
    doctor: "",
    emergency: "",
  };
  const meds = s.meds.filter((x) => x.memberId === sel);
  const reminders = s.reminders.filter((x) => x.memberId === sel && !x.done).sort((a, b) => a.due.localeCompare(b.due));
  const records = useMemo(
    () =>
      s.docs
        .filter((d) => d.category === "Medical" && d.memberId === sel)
        .sort((a, b) => (b.docDate || b.addedAt).localeCompare(a.docDate || a.addedAt)),
    [s.docs, sel],
  );
  const vitals = useMemo(() => {
    const map: Record<string, LabLog[]> = {};
    s.labs
      .filter((l) => l.memberId === sel && METRICS[l.metric])
      .forEach((l) => {
        (map[l.metric] ||= []).push(l);
      });
    Object.values(map).forEach((a) => a.sort(sortR));
    return map;
  }, [s.labs, sel]);

  const timeline = useMemo(() => {
    const ev: { date: string; kind: string; title: string; detail: string }[] = [];
    s.labs
      .filter((l) => l.memberId === sel)
      .forEach((l) =>
        ev.push({
          date: l.date,
          kind: "reading",
          title: `${l.metric} ${METRICS[l.metric]?.bp ? `${l.value}/${l.value2}` : l.value}${METRICS[l.metric] ? " " + METRICS[l.metric].unit : ""}`,
          detail: "Reading logged",
        }),
      );
    records.forEach((d) =>
      ev.push({
        date: (d.docDate || d.addedAt).slice(0, 10),
        kind: d.medType || "other",
        title: d.docType,
        detail: d.name,
      }),
    );
    return ev.sort((a, b) => b.date.localeCompare(a.date));
  }, [s.labs, records, sel]);

  const outMetricsOf = (mid: string) => {
    const by: Record<string, LabLog[]> = {};
    s.labs.filter((l) => l.memberId === mid && METRICS[l.metric]).forEach((l) => (by[l.metric] ||= []).push(l));
    const outs: { k: string; last: LabLog }[] = [];
    Object.keys(by).forEach((k) => {
      by[k].sort(sortR);
      if (statusOf(k, by[k]) === "out") outs.push({ k, last: by[k][by[k].length - 1] });
    });
    return outs;
  };
  const memberStatus = (mid: string) => {
    const nextAppt = s.reminders
      .filter((r) => r.memberId === mid && !r.done && r.kind === "appointment" && daysTo(r.due) >= 0)
      .sort((a, b) => a.due.localeCompare(b.due))[0];
    const due = s.reminders.filter((r) => r.memberId === mid && !r.done && daysTo(r.due) <= 30).length;
    const newDocs = s.docs.filter(
      (d) => d.category === "Medical" && d.memberId === mid && (Date.now() - +new Date(d.addedAt)) / 86400000 <= 7,
    ).length;
    if (nextAppt && daysTo(nextAppt.due) <= 30) return { txt: `Appointment in ${daysTo(nextAppt.due)}d`, c: C.gold };
    if (due) return { txt: `${due} due soon`, c: C.gold };
    if (newDocs) return { txt: `${newDocs} new document${newDocs === 1 ? "" : "s"}`, c: C.cyan };
    return { txt: "Up to date", c: C.emerald };
  };
  const familyActions = useMemo(() => {
    type Act = {
      mid: string;
      name: string;
      color: string;
      icon: any;
      iconC: string;
      label: string;
      when: string;
      urgency: number;
      kind: "reminder" | "reading";
      rid?: string;
    };
    const acts: Act[] = [];
    const RIC: any = {
      refill: RefreshCw,
      appointment: CalendarClock,
      insurance: ShieldCheck,
      vaccination: Syringe,
      other: Bell,
    };
    s.members.forEach((mm) => {
      const first = mm.name.split(" ")[0];
      s.reminders
        .filter((r) => r.memberId === mm.id && !r.done && daysTo(r.due) <= 45)
        .forEach((r) => {
          const dd = daysTo(r.due);
          acts.push({
            mid: mm.id,
            name: first,
            color: mm.color,
            icon: RIC[r.kind] || Bell,
            iconC: dd < 0 ? C.red : dd <= 7 ? C.gold : C.sub,
            label: r.title,
            when: dd < 0 ? `${-dd}d overdue` : dd === 0 ? "today" : `in ${dd}d`,
            urgency: dd < 0 ? -1000 + dd : dd,
            kind: "reminder",
            rid: r.id,
          });
        });
    });
    return acts.sort((a, b) => a.urgency - b.urgency);
  }, [s.members, s.reminders, s.labs]);

  const summary = useMemo(() => {
    let visits = 0,
      refills = 0,
      vaccinations = 0,
      renewals = 0,
      outRange = 0;
    const attn = new Set<string>();
    s.reminders.forEach((r) => {
      if (r.done) return;
      const dd = daysTo(r.due);
      if (r.kind === "appointment" && dd <= 45) {
        visits++;
        attn.add(r.memberId);
      } else if (r.kind === "refill" && dd <= 30) {
        refills++;
        attn.add(r.memberId);
      } else if (r.kind === "vaccination" && dd <= 60) {
        vaccinations++;
        attn.add(r.memberId);
      } else if (r.kind === "insurance" && dd <= 45) {
        renewals++;
        attn.add(r.memberId);
      }
    });
    s.members.forEach((mm) => {
      const by: Record<string, LabLog[]> = {};
      s.labs.filter((l) => l.memberId === mm.id && METRICS[l.metric]).forEach((l) => (by[l.metric] ||= []).push(l));
      Object.keys(by).forEach((k) => {
        by[k].sort(sortR);
        if (statusOf(k, by[k]) === "out") {
          outRange++;
          attn.add(mm.id);
        }
      });
    });
    return {
      actions: visits + refills + vaccinations + renewals + outRange,
      visits,
      refills,
      vaccinations,
      renewals,
      outRange,
      upToDate: s.members.length - attn.size,
      count: s.members.length,
    };
  }, [s.reminders, s.labs, s.members]);

  const nextVisit = useMemo(
    () =>
      s.reminders
        .filter((r) => r.memberId === sel && !r.done && r.kind === "appointment")
        .sort((a, b) => a.due.localeCompare(b.due))[0],
    [s.reminders, sel],
  );
  const lastRecord = records[0];
  const changedLine = useMemo(() => {
    const outs: string[] = [];
    Object.keys(vitals).forEach((k) => {
      const arr = vitals[k];
      if (arr.length < 2 || k === "Weight") return;
      const st = statusOf(k, arr);
      const l = arr[arr.length - 1],
        f = arr[0];
      if (st === "out" || st === "watch") {
        const dir = l.value > f.value ? "up" : "down";
        outs.push(`${k} ${dir} to ${METRICS[k].bp ? `${l.value}/${l.value2}` : l.value}`);
      }
    });
    return outs.length ? outs.slice(0, 2).join(", ") : "Readings holding in range";
  }, [vitals]);
  const shortInsight = useMemo(() => {
    const sts = Object.keys(vitals)
      .filter((k) => k !== "Weight")
      .map((k) => ({ k, st: statusOf(k, vitals[k]) }));
    if (!sts.length) return "No readings tracked yet";
    const bad = sts.filter((x) => x.st === "out" || x.st === "watch").map((x) => x.k);
    const ok = sts.filter((x) => x.st === "in").map((x) => x.k);
    if (!bad.length) return "All tracked readings in range";
    return `${bad.join(", ")} to review${ok.length ? ` · ${ok.join(", ")} in range` : ""}`;
  }, [vitals]);

  const insight = useMemo(() => {
    const parts: string[] = [];
    Object.keys(vitals).forEach((k) => {
      const arr = vitals[k];
      if (arr.length < 2 || k === "Weight") return;
      const l = arr[arr.length - 1],
        f = arr[0];
      const st = statusOf(k, arr);
      const dir = l.value > f.value ? "risen" : l.value < f.value ? "eased" : "held steady";
      const val = METRICS[k].bp ? `${l.value}/${l.value2}` : `${l.value} ${METRICS[k].unit}`;
      const rng =
        st === "out"
          ? "above the standard reference range"
          : st === "watch"
            ? "near the upper edge of the standard range"
            : "within the standard range";
      parts.push(`${k} has ${dir} across ${m?.name.split(" ")[0]}'s last ${arr.length} readings to ${val}, ${rng}.`);
    });
    if (!parts.length)
      return `No tracked readings yet for ${m?.name.split(" ")[0]}. Use "Log a reading" to build a factual trend.`;
    return parts
      .sort((a) => (a.includes("above") ? -1 : 1))
      .slice(0, 3)
      .join(" ");
  }, [vitals, m]);

  const emergHTML = useMemo(() => buildEmergency(m, care, meds, s.docs), [m, care, meds, s.docs]);
  const doExport = (html: string, name: string) => {
    const b = new Blob([html], { type: "text/html" });
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
    URL.revokeObjectURL(u);
  };
  const doPrint = (html: string) => {
    setPrintHTML(html);
    setTimeout(() => window.print(), 60);
  };

  if (!m)
    return (
      <div className="lh-root">
        <style>{CSS}</style>
        <p style={{ color: C.sub }}>No family members yet.</p>
      </div>
    );

  return (
    <div className="lh-root">
      <style>{CSS}</style>
      <div className="lh-head">
        <div className="lh-headrow">
          <h1 className="lh-h1">Health</h1>
          <span className="lh-famsum" style={{ color: familyActions.length ? C.gold : C.emerald }}>
            <Users size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            {familyActions.length
              ? `${familyActions.length} thing${familyActions.length === 1 ? "" : "s"} need attention`
              : "Everyone is up to date"}
          </span>
        </div>
        <p style={{ color: C.sub, fontSize: 14, marginTop: 3 }}>
          Keep the whole family visit-ready. ReadiNes organizes and surfaces your records. It never diagnoses.
        </p>
      </div>

      {/* member switcher — status cards, not bare pills */}
      <div className="lh-famgrid">
        {s.members.map((mm) => {
          const st = memberStatus(mm.id);
          const on = sel === mm.id;
          return (
            <button
              key={mm.id}
              className={"lh-famcard" + (on ? " on" : "")}
              onClick={() => {
                setSel(mm.id);
                setTab("overview");
              }}
            >
              <span
                className="lh-famav"
                style={{ background: mm.color + "26", color: mm.color, border: `1.5px solid ${mm.color}55` }}
              >
                {mm.name[0]}
              </span>
              <span style={{ minWidth: 0 }}>
                <span className="lh-famnm">{mm.name.split(" ")[0]}</span>
                <span className="lh-famst" style={{ color: st.c }}>
                  {st.txt}
                </span>
              </span>
            </button>
          );
        })}
        <button
          className="lh-famcard"
          style={{ borderStyle: "dashed", justifyContent: "center" }}
          onClick={() => setModal("member")}
        >
          <UserPlus size={15} color={C.gold} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>Add</span>
        </button>
      </div>

      {/* selected member — slim identity bar; actions live with their context */}
      <div className="lh-pbar">
        <span className="lh-av" style={{ background: m.color + "26", color: m.color, borderColor: m.color + "55" }}>
          {m.name[0]}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="lh-h2" style={{ fontSize: 18 }}>
            {m.name}
          </h2>
          <div style={{ fontSize: 12.5, color: C.sub, display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
            <span>{m.relation}</span>
            {age(m.dob) != null && <span>· {age(m.dob)}</span>}
            {m.bloodGroup && <span>· {m.bloodGroup}</span>}
            {care.doctor && <span>· {care.doctor}</span>}
          </div>
        </div>
        <button className="lh-btn-g" onClick={() => setModal("emergency")}>
          <IdCard size={15} /> Emergency card
        </button>
        <button className="lh-btn-g" onClick={() => setModal("reading")}>
          <Plus size={15} /> Log reading
        </button>
      </div>

      {/* tabs */}
      <div className="lh-tabs">
        {(
          [
            ["overview", "Overview", HeartPulse],
            ["timeline", "Timeline", CalendarClock],
            ["meds", "Medications", PillIcon],
            ["records", "Records", Stethoscope],
          ] as const
        ).map(([k, label, Ic]) => (
          <button key={k} className={"lh-tab" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>
            <Ic size={15} /> {label}
            {k === "meds" && meds.length > 0 && <span className="lh-tc">{meds.length}</span>}
            {k === "records" && records.length > 0 && <span className="lh-tc">{records.length}</span>}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div className="lh-pane">
          <div
            className="lh-card"
            style={{
              padding: "14px 16px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <CalendarClock size={16} color={C.gold} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                {nextVisit
                  ? `${nextVisit.title} · in ${daysTo(nextVisit.due)} days · ${fmt(nextVisit.due)}`
                  : "No visit scheduled"}
              </div>
              <div style={{ fontSize: 12.5, color: C.sub, marginTop: 2 }}>
                Bring {meds.length} medication{meds.length !== 1 ? "s" : ""},{" "}
                {records.filter((r) => r.medType === "lab_report").length} recent report
                {records.filter((r) => r.medType === "lab_report").length !== 1 ? "s" : ""}
                {insuranceOf(m, s.docs) ? ", insurance card" : ""} · {changedLine}
              </div>
            </div>
            <button className="lh-btn" onClick={() => setModal("visit")}>
              <ClipboardList size={15} /> Prepare for visit
            </button>
          </div>
          <button className="lh-infobar" onClick={() => setInsightOpen((o) => !o)}>
            <Info size={15} color={C.gold} />
            <span className="lh-infoshort">{shortInsight}</span>
            <ChevronDown
              size={15}
              color={C.sub}
              style={{ transform: insightOpen ? "rotate(180deg)" : "none", transition: ".15s", flexShrink: 0 }}
            />
          </button>
          {insightOpen && (
            <div className="lh-card" style={{ padding: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: C.text, margin: 0 }}>{insight}</p>
              <p style={{ fontSize: 12, color: C.faint, marginTop: 10 }}>
                Restates your own logged numbers against standard published reference ranges. Not medical advice or a
                diagnosis.
              </p>
            </div>
          )}
          <div className="lh-vitals" style={{ marginBottom: 16 }}>
            {Object.keys(vitals).length === 0 && (
              <div className="lh-card" style={{ padding: 20, color: C.faint, fontSize: 13.5 }}>
                No readings tracked yet.
              </div>
            )}
            {Object.keys(vitals).map((k) => {
              const arr = vitals[k];
              const l = arr[arr.length - 1];
              const st = statusOf(k, arr);
              const prev = arr.length > 1 ? arr[arr.length - 2] : null;
              const delta = prev ? l.value - prev.value : 0;
              const Tr = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
              const srcDoc = records
                .filter((r) => r.medType === "lab_report" && (r.docDate || r.addedAt).slice(0, 10) <= l.date)
                .sort((a, b) => (b.docDate || b.addedAt).localeCompare(a.docDate || a.addedAt))[0];
              return (
                <div key={k} className="lh-card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13.5, color: C.sub }}>
                      {k}
                      {METRICS[k].bp ? " · systolic trend" : ""}
                    </span>
                    <StatusPill s={st} />
                  </div>
                  <div
                    className="lh-h2"
                    style={{ fontSize: 25, margin: "6px 0 4px", display: "flex", alignItems: "baseline", gap: 8 }}
                  >
                    {METRICS[k].bp ? `${l.value}/${l.value2}` : l.value}
                    <span style={{ fontSize: 13, color: C.sub, fontWeight: 500 }}>{METRICS[k].unit}</span>
                    <Tr size={14} color={delta === 0 ? C.faint : delta > 0 ? C.red : C.emerald} />
                  </div>
                  <MiniChart arr={arr} metric={k} color={SM[st].c === C.faint ? C.cyan : SM[st].c} />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 10,
                      fontSize: 11.5,
                      color: C.faint,
                    }}
                  >
                    <FlaskConical size={12} color={C.faint} />
                    {srcDoc ? (
                      <>
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Source: {srcDoc.name} · {fmt(srcDoc.docDate || srcDoc.addedAt)}
                        </span>
                        <button className="lh-lnk" style={{ fontSize: 11.5 }} onClick={() => setViewDoc(srcDoc)}>
                          View report
                        </button>
                      </>
                    ) : (
                      <span>Manually logged · {fmt(l.date)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="lh-grid-2-1">
            <div className="lh-card" style={{ padding: 20 }}>
              <div className="lh-sechead">
                <Bell size={16} color={C.sub} /> Reminders{" "}
                <button className="lh-mini" onClick={() => setModal("reminder")}>
                  <Plus size={13} /> Add
                </button>
              </div>
              {reminders.length === 0 ? (
                <Empty t="Nothing due." />
              ) : (
                reminders.map((r) => {
                  const Ic =
                    (
                      {
                        refill: RefreshCw,
                        appointment: CalendarClock,
                        insurance: ShieldCheck,
                        vaccination: Syringe,
                        other: Bell,
                      } as any
                    )[r.kind] || CalendarClock;
                  const dd = daysTo(r.due);
                  return (
                    <div key={r.id} className="lh-row">
                      <span className="lh-ic" style={{ background: C.gold + "1f" }}>
                        <Ic size={15} color={C.gold} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{r.title}</div>
                        <div style={{ fontSize: 12, color: dd < 7 ? C.gold : C.faint }}>
                          {dd < 0 ? "overdue" : dd === 0 ? "today" : `in ${dd} days`}
                        </div>
                      </div>
                      <button
                        className="lh-ib"
                        onClick={() => {
                          s.completeReminder(r.id);
                          toast("Marked done");
                        }}
                      >
                        <CheckCircle2 size={16} color={C.emerald} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <div className="lh-card" style={{ padding: 20 }}>
              <div className="lh-sechead">
                <ShieldCheck size={16} color={C.sub} /> Medical readiness{" "}
                <button className="lh-mini" onClick={() => setModal("profile")}>
                  <Edit3 size={12} /> Edit
                </button>
              </div>
              {(() => {
                const items: [string, boolean][] = [
                  ["Blood group", !!m.bloodGroup],
                  ["Allergies recorded", !!care.allergies && care.allergies !== ""],
                  ["Emergency contact", !!care.emergency],
                  ["Primary doctor", !!care.doctor],
                  ["Insurance on file", !!insuranceOf(m, s.docs)],
                  ["Prescription on file", records.some((r) => r.medType === "prescription")],
                ];
                const done = items.filter(([, ok]) => ok).length;
                const pct = Math.round((done / items.length) * 100);
                const pc = pct >= 80 ? C.emerald : pct >= 50 ? C.gold : C.red;
                return (
                  <>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span
                        style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 800, color: pc }}
                      >
                        {pct}%
                      </span>
                      <span style={{ fontSize: 12, color: C.faint }}>document completeness, not a health score</span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 9,
                        background: "rgba(255,255,255,.07)",
                        margin: "9px 0 11px",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ width: `${pct}%`, height: "100%", background: pc, borderRadius: 9 }} />
                    </div>
                    {items.map(([label, ok]) => (
                      <div
                        key={label}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 12.5 }}
                      >
                        <span style={{ color: ok ? C.emerald : C.red, fontWeight: 700, width: 14 }}>
                          {ok ? "✓" : "✗"}
                        </span>
                        <span style={{ color: ok ? C.text : C.sub }}>{label}</span>
                      </div>
                    ))}
                  </>
                );
              })()}
              <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 10, paddingTop: 8 }}>
                <Info2 label="Conditions" val={care.conditions.length ? care.conditions.join(", ") : "None recorded"} />
                <Info2
                  label="Allergies"
                  val={care.allergies || "None recorded"}
                  warn={!!care.allergies && care.allergies !== "None recorded"}
                />
                <Info2 label="Emergency" val={care.emergency || "—"} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TIMELINE ── */}
      {tab === "timeline" && (
        <div className="lh-pane">
          <div className="lh-card" style={{ padding: 22 }}>
            <div className="lh-sechead">
              <CalendarClock size={16} color={C.sub} /> Health timeline
            </div>
            {timeline.length === 0 ? (
              <Empty t="No history yet. Logged readings and uploaded records appear here as a story." />
            ) : (
              <div className="lh-tl">
                {timeline.map((e, i) => {
                  const K = KIND[e.kind] || KIND.other;
                  const Ic = K.icon;
                  const showMon = i === 0 || mon(e.date) !== mon(timeline[i - 1].date);
                  return (
                    <div key={i}>
                      {showMon && <div className="lh-tlmon">{mon(e.date)}</div>}
                      <div className="lh-tlrow">
                        <span className="lh-tldot" style={{ background: K.c, boxShadow: `0 0 7px ${K.c}` }} />
                        <span className="lh-ic" style={{ background: K.c + "22" }}>
                          <Ic size={15} color={K.c} />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{e.title}</div>
                          <div style={{ fontSize: 12, color: C.faint }}>
                            {K.label} · {e.detail}
                          </div>
                        </div>
                        <span style={{ fontSize: 12, color: C.faint, whiteSpace: "nowrap" }}>{fmt(e.date)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MEDICATIONS (document-derived, not an adherence tracker) ── */}
      {tab === "meds" && (
        <div className="lh-pane">
          <div className="lh-card" style={{ padding: 20 }}>
            <div className="lh-sechead">
              <PillIcon size={16} color={C.sub} /> Current medications{" "}
              <button className="lh-mini" onClick={() => setModal("med")}>
                <Plus size={13} /> Add
              </button>
            </div>
            <div style={{ fontSize: 12, color: C.faint, marginBottom: 8 }}>
              What the latest prescriptions say, not a pill tracker. Refill dates come from the prescription.
            </div>
            {meds.length === 0 ? (
              <Empty t="No medications recorded." />
            ) : (
              meds.map((med) => {
                const rf = daysTo(med.refillBy);
                const latestRx = records
                  .filter((r) => r.medType === "prescription")
                  .sort((a, b) => (b.docDate || b.addedAt).localeCompare(a.docDate || a.addedAt))[0];
                return (
                  <div key={med.id} className="lh-med">
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <span className="lh-ic" style={{ background: C.violet + "22" }}>
                        <PillIcon size={16} color={C.violet} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 600, color: C.text }}>
                          {med.name} <span style={{ color: C.sub, fontWeight: 400 }}>{med.dose}</span>
                        </div>
                        <div style={{ fontSize: 12, color: C.faint }}>
                          {med.freq}
                          {latestRx
                            ? ` · source: ${latestRx.docType}, ${fmt(latestRx.docDate || latestRx.addedAt)}`
                            : ""}
                        </div>
                      </div>
                      {rf <= 14 && (
                        <span
                          className="lh-tag"
                          style={{
                            color: rf < 0 ? C.red : C.gold,
                            background: (rf < 0 ? C.red : C.gold) + "1f",
                          }}
                        >
                          {rf < 0 ? "refill overdue" : `refill due ${fmt(med.refillBy)}`}
                        </span>
                      )}
                      {latestRx && (
                        <button className="lh-lnk" onClick={() => setViewDoc(latestRx)}>
                          Latest prescription
                        </button>
                      )}
                      <button className="lh-ib" onClick={() => s.removeMed(med.id)}>
                        <Trash2 size={14} color={C.faint} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── RECORDS (upload / scan / gallery) ── */}
      {tab === "records" && (
        <div className="lh-pane">
          <div className="lh-card" style={{ padding: 20 }}>
            <div className="lh-sechead">
              <Stethoscope size={16} color={C.sub} /> Records
            </div>
            <div className="lh-uprow">
              <button
                className="lh-up"
                onClick={() => {
                  pendingRec.current = null;
                  recRef.current?.click();
                }}
              >
                <Upload size={16} color={C.gold} /> Upload medical record
              </button>
              <input
                ref={recRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files?.length) {
                    const pen = pendingRec.current;
                    s.addFiles(e.target.files, sel, pen?.override);
                    toast(`${pen?.label || "Record"} added`);
                  }
                  pendingRec.current = null;
                  e.currentTarget.value = "";
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: C.faint, marginBottom: 6 }}>
              Upload anything: ReadiNes identifies whether it is a prescription, lab report, scan, or discharge summary
              and files it. A copy lands in Documents too.
            </div>
            {records.length === 0 ? (
              <Empty t="No records yet. Upload, scan, or pick from gallery. Each one also lands in Documents." />
            ) : (
              <div style={{ position: "relative", paddingLeft: 18, marginTop: 6 }}>
                <div style={{ position: "absolute", left: 4, top: 6, bottom: 6, width: 1, background: C.border }} />
                {records.map((r) => {
                  const K = KIND[r.medType || "other"] || KIND.other;
                  const Ic = K.icon;
                  return (
                    <div key={r.id} className="lh-rec" onClick={() => setViewDoc(r)} style={{ cursor: "pointer" }}>
                      <span
                        style={{
                          position: "absolute",
                          left: -17,
                          top: 14,
                          width: 9,
                          height: 9,
                          borderRadius: 9,
                          background: K.c,
                          boxShadow: `0 0 7px ${K.c}`,
                        }}
                      />
                      <span className="lh-ic" style={{ background: K.c + "22" }}>
                        <Ic size={15} color={K.c} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: C.faint }}>
                          {r.docType} · {fmt(r.docDate || r.addedAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* modals */}
      <AnimatePresence>
        {modal === "reading" && (
          <LogReading
            member={m}
            vitals={vitals}
            onClose={() => setModal(null)}
            save={(k: string, r: Omit<LabLog, "id" | "memberId" | "metric">) => {
              s.addLab({ id: uid(), memberId: sel, metric: k, ...r });
              toast("Reading logged");
              setModal(null);
            }}
          />
        )}
        {modal === "member" && (
          <AddMember
            onClose={() => setModal(null)}
            save={(mm: Member) => {
              s.addMember(mm);
              s.updateCare(mm.id, {
                conditions: [],
                medications: [],
                allergies: "None recorded",
                doctor: "",
                emergency: "",
              });
              setSel(mm.id);
              toast("Member added");
              setModal(null);
            }}
          />
        )}
        {modal === "med" && (
          <AddMed
            onClose={() => setModal(null)}
            save={(md: Omit<Medication, "id" | "memberId">) => {
              s.addMed({ id: uid(), memberId: sel, ...md });
              toast("Medication added");
              setModal(null);
            }}
          />
        )}
        {modal === "reminder" && (
          <AddReminder
            onClose={() => setModal(null)}
            save={(r: { title: string; kind: ReminderKind; due: string }) => {
              s.addReminder({ id: uid(), memberId: sel, done: false, ...r });
              toast("Reminder added");
              setModal(null);
            }}
          />
        )}
        {modal === "profile" && (
          <EditProfile
            member={m}
            care={care}
            onClose={() => setModal(null)}
            save={(cp: any, mp: any) => {
              s.updateCare(sel, cp);
              if (mp) s.updateMember(sel, mp);
              toast("Profile updated");
              setModal(null);
            }}
          />
        )}
        {modal === "emergency" && (
          <SheetModal
            title="Emergency card"
            onClose={() => setModal(null)}
            html={emergHTML}
            onExport={() => {
              doExport(emergHTML, `EmergencyCard_${m.name}.html`);
              toast("Emergency card exported");
            }}
            onPrint={() => doPrint(emergHTML)}
          />
        )}
        {modal === "visit" && (
          <VisitPrep
            appts={s.reminders
              .filter((r) => r.memberId === sel && !r.done && r.kind === "appointment")
              .sort((a, b) => a.due.localeCompare(b.due))}
            doctor={care.doctor}
            member={m}
            care={care}
            meds={meds}
            vitals={vitals}
            records={records}
            docs={s.docs}
            onView={(d: Doc) => setViewDoc(d)}
            toast={toast}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>

      {!extToast && (
        <AnimatePresence>
          {localToast && (
            <motion.div
              className="lh-toast"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
            >
              <CheckCircle2 size={17} color={C.emerald} /> {localToast}
            </motion.div>
          )}
        </AnimatePresence>
      )}
      {viewDoc && <DocViewer doc={viewDoc} store={s} onClose={() => setViewDoc(null)} />}
      <div id="lh-print" dangerouslySetInnerHTML={{ __html: printHTML }} />
    </div>
  );
}

/* ── small components ── */
const Empty = ({ t }: any) => <div style={{ fontSize: 13, color: C.faint, padding: "10px 0" }}>{t}</div>;
const Stat = ({ n, label, c }: any) => (
  <div className="lh-stat">
    <span className="lh-statn" style={{ color: c }}>
      {n}
    </span>
    <span className="lh-statl">{label}</span>
  </div>
);
const Info2 = ({ label, val, warn }: any) => (
  <div className="lh-info">
    <span style={{ fontSize: 13, color: C.faint }}>{label}</span>
    <span style={{ fontSize: 13.5, color: warn ? C.red : C.text, fontWeight: warn ? 600 : 500, textAlign: "right" }}>
      {val}
    </span>
  </div>
);
function Spark({ arr, c }: { arr: LabLog[]; c: string }) {
  if (!arr || arr.length < 2) return <div style={{ height: 30 }} />;
  const vs = arr.map((x) => x.value),
    max = Math.max(...vs),
    min = Math.min(...vs),
    w = 100,
    h = 30,
    step = w / (arr.length - 1);
  const pts = arr
    .map((x, i) => `${i * step},${h - 3 - (max === min ? h / 2 : ((x.value - min) / (max - min)) * (h - 6))}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 30 }} preserveAspectRatio="none">
      <polyline
        points={pts}
        fill="none"
        stroke={c}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${c}88)` }}
      />
    </svg>
  );
}
function MiniChart({ arr, metric, color }: { arr: LabLog[]; metric: string; color: string }) {
  const M = METRICS[metric];
  const vals = arr.map((x) => x.value);
  const band = M.band;
  let min = Math.min(...vals, ...(band ? [band[0]] : []));
  let max = Math.max(...vals, ...(band ? [band[1]] : []));
  const pad = (max - min) * 0.18 || 1;
  min -= pad;
  max += pad;
  const W = 300,
    H = 96,
    pl = 40,
    pr = 12,
    pt = 10,
    pb = 22;
  const X = (i: number) => pl + (arr.length <= 1 ? 0.5 : i / (arr.length - 1)) * (W - pl - pr);
  const Y = (v: number) => pt + (1 - (v - min) / (max - min || 1)) * (H - pt - pb);
  const pts = arr.map((pp, i) => `${X(i)},${Y(pp.value)}`).join(" ");
  const shortD = (ss: string) => new Date(ss).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const last = arr[arr.length - 1];
  const bandTop = band ? Math.max(pt, Y(band[1])) : 0;
  const bandBot = band ? Math.min(H - pb, Y(band[0])) : 0;
  const mono = "'JetBrains Mono',monospace";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 96 }}>
      {band && bandBot > bandTop && (
        <rect x={pl} y={bandTop} width={W - pl - pr} height={bandBot - bandTop} fill={C.emerald} opacity={0.1} />
      )}
      {band && Y(band[1]) > pt && Y(band[1]) < H - pb && (
        <line
          x1={pl}
          x2={W - pr}
          y1={Y(band[1])}
          y2={Y(band[1])}
          stroke={C.emerald}
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.55}
        />
      )}
      <line x1={pl} x2={pl} y1={pt} y2={H - pb} stroke={C.border} strokeWidth={1} />
      <line x1={pl} x2={W - pr} y1={H - pb} y2={H - pb} stroke={C.border} strokeWidth={1} />
      <text x={pl - 6} y={pt + 4} textAnchor="end" fontSize="9" fill={C.faint} fontFamily={mono}>
        {Math.round(max)}
      </text>
      <text x={pl - 6} y={H - pb} textAnchor="end" fontSize="9" fill={C.faint} fontFamily={mono}>
        {Math.round(min)}
      </text>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {arr.map((pp, i) => (
        <circle key={i} cx={X(i)} cy={Y(pp.value)} r={i === arr.length - 1 ? 3.5 : 2} fill={color} />
      ))}
      <text x={pl} y={H - 6} textAnchor="start" fontSize="9" fill={C.faint} fontFamily={mono}>
        {shortD(arr[0].date)}
      </text>
      <text x={W - pr} y={H - 6} textAnchor="end" fontSize="9" fill={C.faint} fontFamily={mono}>
        {shortD(last.date)}
      </text>
      {band && Y(band[1]) > pt + 10 && (
        <text x={W - pr - 2} y={Y(band[1]) - 4} textAnchor="end" fontSize="8.5" fill={C.emerald} fontFamily={mono}>
          normal ≤ {band[1]}
        </text>
      )}
    </svg>
  );
}
const StatusPill = ({ s }: { s: Status }) => (
  <span
    style={{
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: 11,
      fontWeight: 600,
      color: SM[s].c,
      background: SM[s].c + "20",
      border: `1px solid ${SM[s].c}33`,
      padding: "3px 9px",
      borderRadius: 20,
    }}
  >
    {SM[s].label}
  </span>
);
function Modal({ title, onClose, children }: any) {
  return (
    <div className="lh-overlay" onClick={onClose}>
      <motion.div
        className="lh-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 className="lh-h2" style={{ fontSize: 18 }}>
            {title}
          </h3>
          <button className="lh-x" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
const Lbl = ({ children }: any) => <div className="lh-lbl">{children}</div>;

function SheetModal({ title, onClose, html, onExport, onPrint, primary }: any) {
  return (
    <div className="lh-overlay" onClick={onClose}>
      <motion.div
        className="lh-modal"
        style={{ width: "min(640px,100%)", maxHeight: "88vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div className="lh-eyebrow" style={{ marginBottom: 4 }}>
              One tap · assembled from your archive
            </div>
            <h3 className="lh-h2" style={{ fontSize: 19 }}>
              {title}
            </h3>
          </div>
          <button className="lh-x" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="lh-preview" style={{ flex: 1, overflow: "auto" }} dangerouslySetInnerHTML={{ __html: html }} />
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            className={primary ? "lh-btn" : "lh-btn-g"}
            style={{ flex: 1, justifyContent: "center" }}
            onClick={onPrint}
          >
            <Printer size={16} /> Save as PDF
          </button>
          <button className="lh-btn-g" style={{ flex: 1, justifyContent: "center" }} onClick={onExport}>
            <Download size={16} /> Export
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── forms ── */
function LogReading({ member, vitals, onClose, save }: any) {
  const keys = Object.keys(METRICS);
  const [k, setK] = useState(Object.keys(vitals)[0] || "HbA1c");
  const [v, setV] = useState("");
  const [d, setD] = useState("");
  const [date, setDate] = useState(today());
  const isBP = METRICS[k].bp;
  return (
    <Modal title={`Log a reading for ${member.name.split(" ")[0]}`} onClose={onClose}>
      <Lbl>Metric</Lbl>
      <div className="lh-pick">
        {keys.map((kk) => (
          <button key={kk} className={"lh-pk" + (k === kk ? " on" : "")} onClick={() => setK(kk)}>
            {kk}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <div style={{ flex: 1 }}>
          <Lbl>
            {isBP ? "Systolic" : "Value"} ({METRICS[k].unit})
          </Lbl>
          <input className="lh-in" type="number" value={v} onChange={(e) => setV(e.target.value)} placeholder="0" />
        </div>
        {isBP && (
          <div style={{ flex: 1 }}>
            <Lbl>Diastolic</Lbl>
            <input className="lh-in" type="number" value={d} onChange={(e) => setD(e.target.value)} placeholder="0" />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <Lbl>Date</Lbl>
          <input className="lh-in" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div style={{ fontSize: 12, color: C.faint, marginTop: 10 }}>Reference: {METRICS[k].ref}.</div>
      <button
        className="lh-btn"
        style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
        disabled={!v}
        onClick={() => {
          const val = parseFloat(v);
          if (isNaN(val)) return;
          save(k, { value: val, unit: METRICS[k].unit, date, ...(isBP ? { value2: parseFloat(d) || 0 } : {}) });
        }}
      >
        Save reading
      </button>
    </Modal>
  );
}
function AddMember({ onClose, save }: any) {
  const [f, setF] = useState({ name: "", relation: "Parent", dob: "1960-01-01", bloodGroup: "O+" });
  const colors = [C.cyan, C.emerald, C.pink, C.violet, C.gold];
  return (
    <Modal title="Add a family member" onClose={onClose}>
      <Lbl>Name</Lbl>
      <input
        className="lh-in"
        value={f.name}
        onChange={(e) => setF({ ...f, name: e.target.value })}
        placeholder="e.g. Taylor Morgan"
      />
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <Lbl>Relation</Lbl>
          <select className="lh-in" value={f.relation} onChange={(e) => setF({ ...f, relation: e.target.value })}>
            {["Spouse", "Father", "Mother", "Son", "Daughter", "Sibling", "Parent", "Other"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <Lbl>Blood group</Lbl>
          <select className="lh-in" value={f.bloodGroup} onChange={(e) => setF({ ...f, bloodGroup: e.target.value })}>
            {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <Lbl>Date of birth</Lbl>
        <input className="lh-in" type="date" value={f.dob} onChange={(e) => setF({ ...f, dob: e.target.value })} />
      </div>
      <button
        className="lh-btn"
        style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
        disabled={!f.name}
        onClick={() =>
          save({
            id:
              f.name
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "")
                .slice(0, 8) + uid().slice(0, 3),
            name: f.name,
            relation: f.relation,
            color: colors[Math.floor(Math.random() * colors.length)],
            dob: f.dob,
            bloodGroup: f.bloodGroup,
            access: "View only",
          })
        }
      >
        Create profile
      </button>
    </Modal>
  );
}
function AddMed({ onClose, save }: any) {
  const [f, setF] = useState({ name: "", dose: "", freq: "Once daily", refillBy: rel(30), remaining: 30 });
  return (
    <Modal title="Add medication" onClose={onClose}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 2 }}>
          <Lbl>Name</Lbl>
          <input
            className="lh-in"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            placeholder="e.g. Metformin"
          />
        </div>
        <div style={{ flex: 1 }}>
          <Lbl>Dose</Lbl>
          <input
            className="lh-in"
            value={f.dose}
            onChange={(e) => setF({ ...f, dose: e.target.value })}
            placeholder="500 mg"
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <Lbl>Frequency</Lbl>
          <input className="lh-in" value={f.freq} onChange={(e) => setF({ ...f, freq: e.target.value })} />
        </div>
        <div style={{ flex: 1 }}>
          <Lbl>Tablets</Lbl>
          <input
            className="lh-in"
            type="number"
            value={f.remaining}
            onChange={(e) => setF({ ...f, remaining: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Lbl>Refill by</Lbl>
          <input
            className="lh-in"
            type="date"
            value={f.refillBy}
            onChange={(e) => setF({ ...f, refillBy: e.target.value })}
          />
        </div>
      </div>
      <button
        className="lh-btn"
        style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
        disabled={!f.name}
        onClick={() => save(f)}
      >
        Add medication
      </button>
    </Modal>
  );
}
function AddReminder({ onClose, save }: any) {
  const [f, setF] = useState<{ title: string; kind: ReminderKind; due: string }>({
    title: "",
    kind: "appointment",
    due: rel(14),
  });
  return (
    <Modal title="Add reminder" onClose={onClose}>
      <Lbl>Title</Lbl>
      <input
        className="lh-in"
        value={f.title}
        onChange={(e) => setF({ ...f, title: e.target.value })}
        placeholder="e.g. Cardiology follow-up"
      />
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <Lbl>Type</Lbl>
          <select
            className="lh-in"
            value={f.kind}
            onChange={(e) => setF({ ...f, kind: e.target.value as ReminderKind })}
          >
            {["appointment", "refill", "vaccination", "insurance", "other"].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <Lbl>Due</Lbl>
          <input className="lh-in" type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} />
        </div>
      </div>
      <button
        className="lh-btn"
        style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
        disabled={!f.title}
        onClick={() => save(f)}
      >
        Add reminder
      </button>
    </Modal>
  );
}
function EditProfile({ member, care, onClose, save }: any) {
  const [cond, setCond] = useState<string[]>(care.conditions);
  const [ci, setCi] = useState("");
  const [allergies, setAll] = useState(care.allergies || "");
  const [doctor, setDoc] = useState(care.doctor || "");
  const [hospital, setHosp] = useState(care.hospital || "");
  const [emergency, setEm] = useState(care.emergency || "");
  const [blood, setBlood] = useState(member.bloodGroup || "");
  return (
    <Modal title={`Edit ${member.name.split(" ")[0]}'s care profile`} onClose={onClose}>
      <Lbl>Conditions</Lbl>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0" }}>
        {cond.map((c, i) => (
          <span key={i} className="lh-cond">
            {c}
            <button onClick={() => setCond(cond.filter((_, j) => j !== i))}>
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="lh-in"
          value={ci}
          onChange={(e) => setCi(e.target.value)}
          placeholder="Add condition"
          onKeyDown={(e) => {
            if (e.key === "Enter" && ci.trim()) {
              setCond([...cond, ci.trim()]);
              setCi("");
            }
          }}
        />
        <button
          className="lh-btn-g"
          onClick={() => {
            if (ci.trim()) {
              setCond([...cond, ci.trim()]);
              setCi("");
            }
          }}
        >
          <Plus size={15} />
        </button>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <div style={{ flex: 2 }}>
          <Lbl>Allergies</Lbl>
          <input className="lh-in" value={allergies} onChange={(e) => setAll(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <Lbl>Blood</Lbl>
          <select className="lh-in" value={blood} onChange={(e) => setBlood(e.target.value)}>
            <option value="">—</option>
            {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <Lbl>Primary doctor</Lbl>
        <input
          className="lh-in"
          value={doctor}
          onChange={(e) => setDoc(e.target.value)}
          placeholder="Dr. name, speciality"
        />
      </div>
      <div style={{ marginTop: 12 }}>
        <Lbl>Preferred hospital</Lbl>
        <input
          className="lh-in"
          value={hospital}
          onChange={(e) => setHosp(e.target.value)}
          placeholder="e.g. Apollo, Greams Road"
        />
      </div>
      <div style={{ marginTop: 12 }}>
        <Lbl>Emergency contact</Lbl>
        <input
          className="lh-in"
          value={emergency}
          onChange={(e) => setEm(e.target.value)}
          placeholder="Name (relation)"
        />
      </div>
      <button
        className="lh-btn"
        style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
        onClick={() =>
          save({ conditions: cond, allergies, doctor, hospital, emergency }, { bloodGroup: blood || undefined })
        }
      >
        Save profile
      </button>
    </Modal>
  );
}

function buildVisitCover(
  m: Member,
  care: any,
  meds: Medication[],
  vitals: Record<string, LabLog[]>,
  records: Doc[],
  included: Doc[],
  visitLabel: string,
) {
  const a = age(m.dob);
  const srcFor = (date: string) =>
    records
      .filter((r) => r.medType === "lab_report" && (r.docDate || r.addedAt).slice(0, 10) <= date)
      .sort((x, y) => (y.docDate || y.addedAt).localeCompare(x.docDate || x.addedAt))[0];
  const readingRows = Object.keys(vitals)
    .map((k) => {
      const l = vitals[k][vitals[k].length - 1];
      const val = METRICS[k].bp ? `${l.value}/${l.value2}` : `${l.value}`;
      const src = srcFor(l.date);
      return `<tr><td style="padding:5px 10px">${k}</td><td style="padding:5px 10px;font-weight:700">${val} ${METRICS[k].unit}</td><td style="padding:5px 10px;color:#6b7280">${fmt(l.date)}</td><td style="padding:5px 10px;color:#6b7280">${src ? src.name : "manually logged"}</td></tr>`;
    })
    .join("");
  const sec = (t: string, body: string) =>
    `<h3 style="margin:16px 0 6px;font-size:13.5px;color:#111827">${t}</h3>${body}`;
  return `<div style="font-family:Inter,Arial,sans-serif;color:#111827;background:#fff;padding:24px;max-width:680px;margin:0 auto">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #D8B25A;padding-bottom:10px">
    <div><div style="font-weight:800;font-size:18px">ReadiNes · Visit Pack</div><div style="color:#6b7280;font-size:12.5px">${visitLabel}</div></div>
    <div style="text-align:right"><div style="font-weight:800;font-size:15px">${m.name}</div><div style="color:#6b7280;font-size:12px">${m.relation}${a != null ? ` · ${a}y` : ""}${m.bloodGroup ? ` · ${m.bloodGroup}` : ""}</div></div>
  </div>
  ${sec("Critical", `<div style="font-size:13px;line-height:1.7"><b style="color:#b91c1c">Allergies:</b> ${care.allergies || "None recorded"}<br/><b>Conditions:</b> ${(care.conditions || []).join(", ") || "None recorded"}<br/><b>Primary physician:</b> ${care.doctor || "—"}${care.hospital ? `<br/><b>Preferred hospital:</b> ${care.hospital}` : ""}</div>`)}
  ${sec("Current medications", meds.length ? `<ul style="margin:0;padding-left:18px;line-height:1.7;font-size:13px">${meds.map((x) => `<li>${x.name} ${x.dose} · ${x.freq} · refill by ${fmt(x.refillBy)}</li>`).join("")}</ul>` : `<div style="color:#9ca3af;font-size:13px">None recorded</div>`)}
  ${sec("Latest readings (with source document)", readingRows ? `<table style="width:100%;border-collapse:collapse;font-size:12.5px"><tr style="background:#f3f4f6"><th style="text-align:left;padding:5px 10px;font-size:11px;color:#6b7280">Metric</th><th style="text-align:left;padding:5px 10px;font-size:11px;color:#6b7280">Value</th><th style="text-align:left;padding:5px 10px;font-size:11px;color:#6b7280">Date</th><th style="text-align:left;padding:5px 10px;font-size:11px;color:#6b7280">Source</th></tr>${readingRows}</table>` : `<div style="color:#9ca3af;font-size:13px">No readings tracked</div>`)}
  ${sec(`Documents in this pack (${included.length})`, included.length ? `<ol style="margin:0;padding-left:18px;line-height:1.7;font-size:13px">${included.map((d) => `<li>${d.docType} · ${d.name} · ${fmt(d.docDate || d.addedAt)}</li>`).join("")}</ol>` : `<div style="color:#9ca3af;font-size:13px">None selected</div>`)}
  <p style="margin-top:20px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:9px">Assembled from ${m.name.split(" ")[0]}'s own records on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}. Facts only — no diagnosis, no medical advice.</p>
  </div>`;
}

function VisitPrep({ appts, doctor, member, care, meds, vitals, records, docs, onView, toast, onClose }: any) {
  const opts = [
    ...appts.map((a: any) => ({ id: a.id, label: a.title, sub: `in ${daysTo(a.due)} days · ${fmt(a.due)}` })),
    ...(doctor ? [{ id: "doc", label: doctor, sub: "primary doctor" }] : []),
    { id: "general", label: "General checkup", sub: "everything recent" },
  ];
  const [chosen, setChosen] = useState(opts[0]?.id);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const cur = opts.find((o: any) => o.id === chosen) || opts[opts.length - 1];
  const visitLabel = cur.id === "general" ? undefined : cur.label;
  const packDocs: Doc[] = useMemo(() => selectVisitDocs(docs, member.id, visitLabel), [docs, member.id, visitLabel]);
  const included = packDocs.filter((d) => !excluded.has(d.id));
  const foc = focusFor(cur.label);
  const toggle = (id: string) =>
    setExcluded((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const pick = (id: string) => {
    setChosen(id);
    setExcluded(new Set());
  };
  const coverHTML = () => buildVisitCover(member, care, meds, vitals, records, included, cur.label);
  const previewCover = () => {
    const b = new Blob([coverHTML()], { type: "text/html" });
    window.open(URL.createObjectURL(b), "_blank");
  };
  const download = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await buildZip(`VisitPack_${member.name.split(" ")[0]}_${cur.label}`, included, [
        { name: "00_Visit_Cover_Sheet.html", content: coverHTML() },
      ]);
      toast(`Visit pack downloaded: cover sheet + ${included.length} document${included.length === 1 ? "" : "s"}`);
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="lh-overlay" onClick={onClose}>
      <motion.div
        className="lh-modal"
        style={{ width: "min(600px,100%)", maxHeight: "88vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div className="lh-eyebrow" style={{ marginBottom: 4 }}>
              Your real documents · filtered for this visit
            </div>
            <h3 className="lh-h2" style={{ fontSize: 19 }}>
              Prepare for visit
            </h3>
          </div>
          <button className="lh-x" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="lh-lbl">Preparing for which visit?</div>
        <div className="lh-pick" style={{ marginBottom: 6 }}>
          {opts.map((o: any) => (
            <button key={o.id} className={"lh-pk" + (chosen === o.id ? " on" : "")} onClick={() => pick(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: C.faint, marginBottom: 12 }}>
          {cur.sub}
          {foc.length ? ` · prioritizes ${foc.join(", ")}` : ""}
          {` · ${packDocs.length} matching document${packDocs.length === 1 ? "" : "s"}`}
        </div>
        <div style={{ flex: 1, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 12 }}>
          {packDocs.length === 0 ? (
            <div style={{ padding: 20, fontSize: 13.5, color: C.faint, lineHeight: 1.6 }}>
              {member.name.split(" ")[0]} has no matching medical records on file yet. The cover sheet still carries
              allergies, conditions, medications, readings, and physician details, so the pack is useful on its own. Add
              prescriptions or reports under Records and they will be picked up here.
            </div>
          ) : (
            packDocs.map((d, i) => {
              const K = KIND[d.medType || "other"] || KIND.other;
              const Ic = d.docType === "Health Insurance" ? ShieldCheck : K.icon;
              const c = d.docType === "Health Insurance" ? C.emerald : K.c;
              const on = !excluded.has(d.id);
              return (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "10px 13px",
                    borderTop: i ? `1px solid ${C.border}` : "none",
                    opacity: on ? 1 : 0.45,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(d.id)}
                    style={{ accentColor: C.gold, cursor: "pointer", flexShrink: 0 }}
                  />
                  <span className="lh-ic" style={{ background: c + "22" }}>
                    <Ic size={15} color={c} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{d.docType}</div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: C.faint,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.name} · {fmt(d.docDate || d.addedAt)}
                    </div>
                  </div>
                  <button className="lh-lnk" onClick={() => onView(d)}>
                    View
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginTop: 12,
            padding: "10px 13px",
            borderRadius: 11,
            border: `1px solid ${C.border}`,
            background: "rgba(216,178,90,.06)",
            fontSize: 12.5,
            color: C.sub,
          }}
        >
          <ClipboardList size={14} color={C.gold} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>
            The pack opens with a cover sheet: {member.name.split(" ")[0]}'s allergies, conditions, medications, latest
            readings with sources, and the document list · then the {included.length} selected file
            {included.length === 1 ? "" : "s"}.
          </span>
          <button className="lh-lnk" style={{ flexShrink: 0 }} onClick={previewCover}>
            Preview cover
          </button>
        </div>
        <button
          className="lh-btn"
          style={{ width: "100%", justifyContent: "center", marginTop: 12, opacity: busy ? 0.45 : 1 }}
          disabled={busy}
          onClick={download}
        >
          <Download size={16} /> {busy ? "Packing…" : `Download visit pack (cover + ${included.length})`}
        </button>
      </motion.div>
    </div>
  );
}

/* ── printable docs (assembled from the archive) ── */
function insuranceOf(member: Member | undefined, docs: Doc[]) {
  return docs.find((d) => d.docType === "Health Insurance" && (d.memberId === member?.id || d.memberId === "you"));
}
function buildEmergency(m: Member | undefined, care: any, meds: Medication[], docs: Doc[]) {
  if (!m) return "";
  const ins = insuranceOf(m, docs);
  const medDocs = docs.filter((d) => d.category === "Medical" && d.memberId === m.id).length;
  const row = (a: string, b: string, warn?: boolean) =>
    `<tr><td style="padding:7px 12px;color:#6b7280;font-size:12px;width:140px">${a}</td><td style="padding:7px 12px;font-weight:700;font-size:14px;color:${warn ? "#b91c1c" : "#111827"}">${b}</td></tr>`;
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:460px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#b91c1c;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
    <div style="font-weight:800;font-size:15px;letter-spacing:1px">EMERGENCY INFO</div><div style="font-size:12px;opacity:.9">ReadiNes</div>
  </div>
  <div style="padding:6px 4px"><table style="width:100%;border-collapse:collapse">
    ${row("Name", m.name)}
    ${row("Blood group", m.bloodGroup || "—")}
    ${row("Critical allergies", care.allergies || "None recorded", care.allergies && care.allergies !== "None recorded")}
    ${row("Conditions", (care.conditions || []).join(", ") || "None recorded")}
    ${row("Current meds", meds.map((x) => `${x.name} ${x.dose}`).join(", ") || "None")}
    ${row("Primary physician", care.doctor || "—")}
    ${row("Preferred hospital", care.hospital || "—")}
    ${row("Emergency contact", care.emergency || "—")}
    ${row("Insurance", ins ? ins.name : "—")}
    ${row("Medical documents", `${medDocs} on file in ReadiNes`)}
  </table></div>
  <div style="padding:10px 16px;background:#f9fafb;color:#9ca3af;font-size:11px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between"><span>Assembled facts only · no diagnosis.</span><span>Generated ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div>
  </div>`;
}

/* ── styles ── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
.lh-root{font-family:'Inter',system-ui,sans-serif;color:${C.text}}
.lh-root *{box-sizing:border-box}
.lh-head{margin-bottom:18px}
.lh-eyebrow{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:${C.gold};margin-bottom:8px}
.lh-h1{font-family:'Space Grotesk';font-weight:700;font-size:27px;letter-spacing:-.5px;margin:0;color:${C.text}}
.lh-h2{font-family:'Space Grotesk';font-weight:700;margin:0;color:${C.text}}
.lh-card{background:${C.panel};border:1px solid ${C.border};border-radius:16px}
.lh-insight{background:linear-gradient(180deg,rgba(216,178,90,.06),${C.panel})}
.lh-switch{display:flex;align-items:center;gap:16px;overflow-x:auto;padding:2px 2px 16px}
.lh-mm{display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:0;cursor:pointer;flex-shrink:0;padding:0}
.lh-av{position:relative;width:42px;height:42px;border-radius:13px;display:grid;place-items:center;font-weight:700;font-size:18px;border:2px solid transparent;font-family:'Space Grotesk';transition:.15s}
.lh-mm.on .lh-av{transform:translateY(-1px)}
.lh-av.lg{width:52px;height:52px;font-size:22px}
.lh-dot{position:absolute;top:-2px;right:-2px;width:11px;height:11px;border-radius:9px;border:2px solid #10131f}
.lh-nm{font-size:12.5px;font-weight:600;white-space:nowrap}
.lh-addm .lh-av{background:${C.panel2}}
.lh-famline{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:0 2px;margin-bottom:2px}
.lh-famtitle{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:${C.text}}
.lh-famsum{font-family:'JetBrains Mono';font-size:12.5px;color:${C.sub};white-space:nowrap}
.lh-hero{background:linear-gradient(180deg,rgba(216,178,90,.05),${C.panel});border:1px solid ${C.border};border-radius:16px;padding:18px;margin-bottom:20px}
.lh-herotop{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.lh-heronext{display:flex;align-items:center;gap:9px;margin-top:16px;padding-top:14px;border-top:1px solid ${C.border}}
.lh-herometa{font-size:13px;color:${C.sub};margin-top:8px;line-height:1.5}
.lh-headrow{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.lh-pillm{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:${C.sub};background:${C.panel2};border:1px solid ${C.border};border-radius:20px;padding:7px 14px;cursor:pointer;font-family:inherit;flex-shrink:0}
.lh-pillm.on{color:${C.text};border-color:${C.gold}66;background:${C.gold}14}
.lh-cdot{width:8px;height:8px;border-radius:9px;flex-shrink:0}
.lh-attndot{width:6px;height:6px;border-radius:9px;background:${C.gold}}
.lh-addpill{border-style:dashed}
.lh-infobar{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:linear-gradient(180deg,rgba(216,178,90,.06),${C.panel});border:1px solid ${C.border};border-radius:12px;padding:12px 14px;cursor:pointer;font-family:inherit;margin-bottom:16px}
.lh-infoshort{flex:1;font-size:14px;color:${C.text}}
.lh-vitals{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
.lh-attnrow{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}
.lh-chip{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:${C.sub};background:${C.panel2};border:1px solid ${C.border};border-radius:20px;padding:6px 12px;cursor:pointer;font-family:inherit}
.lh-chip:hover{background:rgba(255,255,255,.08)}
.lh-mhead{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:16px}
.lh-btn{display:inline-flex;align-items:center;gap:7px;background:${C.gold};color:#0B0E24;font-weight:600;font-size:14px;border:0;border-radius:11px;padding:10px 16px;cursor:pointer;font-family:inherit;transition:.15s}
.lh-btn:hover{filter:brightness(1.06)}.lh-btn:disabled{opacity:.4;cursor:not-allowed}
.lh-btn-g{display:inline-flex;align-items:center;gap:7px;background:${C.panel2};color:${C.text};font-weight:600;font-size:14px;border:1px solid ${C.border};border-radius:11px;padding:10px 14px;cursor:pointer;font-family:inherit}
.lh-btn-g:hover{background:rgba(255,255,255,.09)}
.lh-tabs{display:flex;gap:6px;border-bottom:1px solid ${C.border};margin-bottom:18px;overflow-x:auto}
.lh-tab{display:inline-flex;align-items:center;gap:7px;background:none;border:0;border-bottom:2px solid transparent;color:${C.sub};font-size:14px;font-weight:600;padding:10px 12px;cursor:pointer;font-family:inherit;white-space:nowrap;margin-bottom:-1px}
.lh-tab.on{color:${C.text};border-bottom-color:${C.gold}}
.lh-tc{font-family:'JetBrains Mono';font-size:11px;background:${C.panel2};border-radius:9px;padding:1px 6px;color:${C.sub}}
.lh-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.lh-grid-2-1{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px}
.lh-sechead{display:flex;align-items:center;gap:8px;font-size:14.5px;font-weight:700;color:${C.text};margin-bottom:12px}
.lh-mini{margin-left:auto;display:inline-flex;align-items:center;gap:4px;font-size:12.5px;font-weight:600;color:${C.gold};background:${C.gold}18;border:1px solid ${C.gold}33;border-radius:8px;padding:4px 9px;cursor:pointer;font-family:inherit}
.lh-row{display:flex;align-items:center;gap:11px;padding:9px 0;border-top:1px solid ${C.border}}
.lh-row:first-of-type{border-top:0}
.lh-ic{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;flex-shrink:0}
.lh-ib{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;border:1px solid ${C.border};background:transparent;cursor:pointer;flex-shrink:0}
.lh-ib:hover{background:rgba(255,255,255,.06)}
.lh-tag{font-family:'JetBrains Mono';font-size:11px;font-weight:600;padding:2px 7px;border-radius:20px}
.lh-info{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid ${C.border}}
.lh-info:first-of-type{border-top:0}
.lh-med{padding:12px 0;border-top:1px solid ${C.border}}
.lh-med:first-of-type{border-top:0}
.lh-adhere{display:flex;align-items:center;gap:12px;margin-top:9px;padding-left:43px;flex-wrap:wrap}
.lh-take{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600;color:${C.emerald};background:${C.emerald}18;border:1px solid ${C.emerald}33;border-radius:8px;padding:5px 10px;cursor:pointer;font-family:inherit}
.lh-taken{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600;color:${C.emerald}}
.lh-lnk{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;color:${C.sub};background:none;border:0;cursor:pointer;font-family:inherit}
.lh-lnk:hover{color:${C.text}}
.lh-uprow{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.lh-up{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:${C.text};background:${C.panel2};border:1px solid ${C.border};border-radius:11px;padding:11px 15px;cursor:pointer;font-family:inherit}
.lh-up:hover{background:rgba(255,255,255,.09);border-color:${C.gold}55}
.lh-rec{position:relative;display:flex;align-items:center;gap:11px;padding:9px 0;border-top:1px solid ${C.border}}
.lh-rec:first-of-type{border-top:0}
.lh-tl{position:relative;padding-left:20px}
.lh-tl:before{content:"";position:absolute;left:5px;top:24px;bottom:8px;width:1px;background:${C.border}}
.lh-tlmon{font-family:'JetBrains Mono';font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${C.gold};margin:14px 0 6px}
.lh-tlrow{position:relative;display:flex;align-items:center;gap:11px;padding:8px 0}
.lh-tldot{position:absolute;left:-15px;top:18px;width:9px;height:9px;border-radius:9px}
.lh-lbl{font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:${C.faint};font-family:'JetBrains Mono';margin-bottom:5px}
.lh-in{width:100%;background:${C.panel2};border:1px solid ${C.border};border-radius:10px;padding:9px 11px;color:${C.text};font-size:14px;outline:none;font-family:inherit}
.lh-in:focus{border-color:${C.gold}}
.lh-overlay{position:fixed;inset:0;z-index:60;background:rgba(4,6,15,.62);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:18px}
.lh-modal{background:#111524;border:1px solid ${C.border};border-radius:18px;width:min(460px,100%);padding:22px;max-height:90vh;overflow:auto}
.lh-preview{background:#f3f4f6;border-radius:10px;padding:10px}
.lh-x{width:32px;height:32px;border-radius:9px;border:1px solid ${C.border};background:${C.panel2};color:${C.text};cursor:pointer;display:grid;place-items:center}
.lh-pick{display:flex;flex-wrap:wrap;gap:6px}
.lh-pk{font-size:12.5px;font-weight:600;color:${C.sub};background:${C.panel2};border:1px solid ${C.border};border-radius:8px;padding:6px 10px;cursor:pointer;font-family:inherit}
.lh-pk.on{color:#0B0E24;background:${C.gold};border-color:${C.gold}}
.lh-cond{display:inline-flex;align-items:center;gap:5px;font-size:13px;color:${C.text};background:${C.panel2};border:1px solid ${C.border};border-radius:20px;padding:4px 10px}
.lh-cond button{background:0;border:0;color:${C.faint};cursor:pointer;display:inline-flex}
.lh-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:80;background:#111524;border:1px solid ${C.border};color:${C.text};padding:12px 20px;border-radius:12px;font-size:14px;font-weight:500;display:flex;align-items:center;gap:10px;box-shadow:0 16px 50px rgba(0,0,0,.5)}
.lh-pbar{display:flex;align-items:center;gap:13px;flex-wrap:wrap;margin-bottom:14px;padding:2px}
.lh-actcard{margin-bottom:16px;padding:0}
.lh-actrow{display:flex;align-items:center;gap:11px;border-top:1px solid ${C.border};padding:10px 16px;cursor:pointer}
.lh-actrow:hover{background:rgba(255,255,255,.04)}
.lh-famgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:10px;margin-bottom:18px}
.lh-famcard{display:flex;align-items:center;gap:10px;text-align:left;background:${C.panel};border:1px solid ${C.border};border-radius:13px;padding:11px 12px;cursor:pointer;font-family:inherit;transition:.15s}
.lh-famcard:hover{background:${C.panel2}}
.lh-famcard.on{border-color:${C.gold}77;background:linear-gradient(180deg,rgba(216,178,90,.08),${C.panel})}
.lh-famav{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;font-weight:700;font-size:15px;font-family:'Space Grotesk';flex-shrink:0}
.lh-famnm{display:block;font-size:13.5px;font-weight:700;color:${C.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lh-famst{display:block;font-size:11.5px;font-weight:600;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#lh-print{display:none}
@media(max-width:900px){.lh-grid3{grid-template-columns:1fr}.lh-grid-2-1{grid-template-columns:1fr}.lh-vgrid{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
@media print{body *{visibility:hidden}#lh-print,#lh-print *{visibility:visible}#lh-print{display:block;position:absolute;inset:0}}
`;
