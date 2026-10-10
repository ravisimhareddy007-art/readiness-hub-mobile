import { toneFor } from "../App";
import { Fab } from "@/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MNav } from "./MobileNav";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Plus,
  X,
  Download,
  Printer,
  Users,
  Pencil,
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
import { useStore, selectVisitDocs, visitTargets, targetLabel, type VisitTarget } from "../lib/store";
import { buildZip } from "../lib/zip";
import { normaliseTestName } from "../lib/extract-medical";
import DocViewer from "./DocViewer";
import type { Doc, Member, LabLog, Medication, ReminderKind, ReminderRepeat } from "../lib/types";

/* ── theme ──
   Every value resolves through src/styles/tokens.css (ReadiNes DS 1.0). C holds CSS variable
   references only; light and dark are both authored in tokens.css and switched by data-theme. */
const C = {
  panel: "var(--color-surface-default)",
  panel2: "var(--color-surface-secondary)",
  border: "var(--color-border-subtle)",
  text: "var(--color-text-primary)",
  sub: "var(--color-text-secondary)",
  faint: "var(--color-text-tertiary)",
  heading: "var(--color-text-heading)",
  gold: "var(--color-text-interactive)",
  action: "var(--color-action-primary-default)",
  onAction: "var(--color-text-on-brand)",
  warning: "var(--color-status-warning-icon)",
  emerald: "var(--color-status-success-icon)",
  red: "var(--color-status-danger-icon)",
  violet: "var(--color-icon-interactive)",
  pink: "var(--color-icon-interactive)",
  cyan: "var(--color-status-info-icon)",
  chart1: "var(--color-chart-line)",
  chart2: "var(--color-chart-line-alt)",
};
/* Tinted fill from a token: al(C.action, 0.12) → 12% of the colour over transparent. */
const al = (c: string, a: number) => `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;
let _cTheme = "";
export const inkOf = (c: string) => c;
function applyC(theme: string) {
  _cTheme = theme;
}
/* Sheets rise on a phone, boxes scale on a desktop. */
const isMobileView = () => typeof window !== "undefined" && window.matchMedia("(max-width:767px)").matches;
const rel = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (s?: string) =>
  s ? new Date(s).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";
const mon = (s: string) => new Date(s).toLocaleDateString(undefined, { month: "short", year: "numeric" });
const daysTo = (s: string) => Math.ceil((+new Date(s) - Date.now()) / 86400000);
const age = (dob?: string) => (dob ? Math.floor((Date.now() - +new Date(dob)) / (365.25 * 86400000)) : null);

/* ── reference ranges (standard published values) ── */
export type Status = "in" | "watch" | "out" | "none";
/* Display metadata only. Reference ranges are never supplied by ReadiNes:
   a reading is judged against the range printed on the report it came from, or not at all. */
/* No table of tests. A series describes itself from its own readings: the name and unit as the
   report printed them, and whether it is the one paired value. */
export const isPaired = (l?: LabLog) => (l?.unit || "").toLowerCase() === "mmhg";
export const seriesName = (arr: LabLog[]) => arr[arr.length - 1]?.metric || "";
export const seriesUnit = (arr: LabLog[]) => arr[arr.length - 1]?.unit || "";
/** The value as printed, keeping a sub-threshold marker: PSA <0.01 must never read as 0.01. */
export const readingText = (l?: LabLog) =>
  !l ? "" : isPaired(l) ? `${l.value}/${l.value2}` : `${l.qualifier || ""}${l.value}`;
const SM: Record<Status, { label: string; c: string }> = {
  in: { label: "within printed range", c: C.emerald },
  watch: { label: "within printed range", c: C.emerald },
  out: { label: "outside printed range", c: C.red },
  none: { label: "no range on file", c: C.faint },
};
const KIND: Record<string, { icon: any; c: string; label: string }> = {
  reading: { icon: Activity, c: C.cyan, label: "Reading" },
  prescription: { icon: PillIcon, c: C.violet, label: "Prescription" },
  lab_report: { icon: FlaskConical, c: C.pink, label: "Lab report" },
  discharge: { icon: Stethoscope, c: C.emerald, label: "Consultation" },
  scan: { icon: ClipboardList, c: C.violet, label: "Scan" },
  other: { icon: ClipboardList, c: C.faint, label: "Record" },
};
export const sortR = (a: LabLog, b: LabLog) => a.date.localeCompare(b.date);
/* A reading is in or out of the range printed on its own report. With no printed range
   there is no status: ReadiNes reports what the document says and never sets a range itself. */
export const statusOfReading = (l?: LabLog): Status => {
  if (!l || (l.refLow === undefined && l.refHigh === undefined)) return "none";
  const over = l.refHigh !== undefined && l.value > l.refHigh;
  const under = l.refLow !== undefined && l.value < l.refLow;
  return over || under ? "out" : "in";
};
export const statusOf = (_metric: string, r: LabLog[]): Status => statusOfReading(r[r.length - 1]);
export const rangeText = (l?: LabLog): string =>
  l?.refText ? `range on this report: ${l.refText}` : "no range printed on the report";

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

/** Name and number as one readable line, or nothing when the contact is not recorded. */
/** Whole days since a date. */
/** "1-0-1" is how a prescription writes it; this is how a person reads it. */
const scheduleText = (freq: string) => {
  const parts = (freq || "").split("-");
  if (parts.length !== 3) return freq;
  const when = ["Morning", "Afternoon", "Night"].filter((_, i) => parts[i] && parts[i] !== "0");
  if (when.length === 0) return "As needed";
  if (when.length === 3) return "Morning, afternoon and night";
  return when.join(" and ");
};

const daysSince = (iso: string) => (Date.now() - +new Date(iso)) / 86400000;

const emergencyLine = (c: { emergencyName?: string; emergencyPhone?: string }) =>
  c.emergencyName?.trim() ? `${c.emergencyName.trim()}${c.emergencyPhone ? ` · ${c.emergencyPhone}` : ""}` : "";

export default function Healthcare({ toast: extToast }: { toast?: (m: string) => void }) {
  const s = useStore();
  applyC(s.theme);
  const css = useMemo(() => CSS(), [s.theme]);
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
  const isMobile = useIsMobile();
  /* Health opens on a person: the family is a switcher in the header, not a screen to get past.
     "family" is now the manage-family view, reached deliberately. */
  const [mView, setMView] = useState<"family" | "person">("person");
  const [confirmDel, setConfirmDel] = useState<Member | null>(null);
  const [editRec, setEditRec] = useState<Doc | null>(null);
  const [shownSeries, setShownSeries] = useState<Set<string> | null>(null);
  const [pickSeries, setPickSeries] = useState(false);
  const [addSheet, setAddSheet] = useState(false);
  const [tab, setTab] = useState<"overview" | "timeline" | "meds" | "records">("overview");
  const [modal, setModal] = useState<
    null | "reading" | "member" | "med" | "reminder" | "profile" | "emergency" | "visit"
  >(null);
  const [printHTML, setPrintHTML] = useState("");
  const [showWhy, setShowWhy] = useState(false);
  /* Arriving from a Home row: open on the person that row was about. */
  useEffect(() => {
    const intent = s.takeHealthIntent?.();
    if (intent?.memberId && s.members.some((m2: Member) => m2.id === intent.memberId)) setSel(intent.memberId);
  }, []);
  const [stopping, setStopping] = useState<Medication | null>(null);
  const [stopNote, setStopNote] = useState("");
  const [viewDoc, setViewDoc] = useState<Doc | null>(null);
  const recRef = useRef<HTMLInputElement>(null);
  const pendingRec = useRef<{ override: Partial<Doc>; label: string } | null>(null);

  const m = s.members.find((x) => x.id === sel) || s.members[0];
  const care = s.care[sel] || {
    conditions: [],
    medications: [],
    allergies: "",
    doctor: "",
    emergency: "",
  };
  const meds = s.meds.filter((x) => x.memberId === sel);
  /* Only what is still being taken leaves this screen: a stopped medicine on an emergency card or
     in a visit pack is a wrong answer to the only question that matters. */
  const taking = meds.filter((x) => x.status !== "stopped");
  const reminders = s.reminders.filter((x) => x.memberId === sel && !x.done).sort((a, b) => a.due.localeCompare(b.due));
  const records = useMemo(
    () =>
      s.docs
        .filter((d) => d.category === "Medical" && d.memberId === sel)
        .sort((a, b) => (b.docDate || b.addedAt).localeCompare(a.docDate || a.addedAt)),
    [s.docs, sel],
  );
  /* Which series are charted. A full panel can carry forty tests, so the screen opens on the ones
     with something to say and the rest are one tap away. The user's choice wins once made. */
  /* Every test the reports printed, grouped into series. A series is one test in one unit:
     Free PSA never joins Total PSA, and a lab that changed units starts a new line rather than
     drawing a cliff. Keyed off what the documents said, never off a condition. */
  const vitals = useMemo(() => {
    const map: Record<string, LabLog[]> = {};
    s.labs
      .filter((l) => l.memberId === sel)
      .forEach((l) => {
        (map[l.seriesKey || l.metric.toLowerCase() + "|" + (l.unit || "").toLowerCase()] ||= []).push(l);
      });
    Object.values(map).forEach((a) => a.sort(sortR));
    return map;
  }, [s.labs, sel]);
  const seriesOrder = useMemo(() => {
    const keys = Object.keys(vitals);
    const score = (k: string) => {
      const arr = vitals[k];
      const out = statusOfReading(arr[arr.length - 1]) === "out" ? 1000 : 0;
      return out + arr.length * 10;
    };
    return keys.sort((a, b) => score(b) - score(a));
  }, [vitals]);
  const visibleSeries = useMemo(
    () => (shownSeries ? seriesOrder.filter((k) => shownSeries.has(k)) : seriesOrder.slice(0, 4)),
    [seriesOrder, shownSeries],
  );

  const timeline = useMemo(() => {
    const ev: { date: string; kind: string; title: string; detail: string }[] = [];
    s.labs
      .filter((l) => l.memberId === sel)
      .forEach((l) =>
        ev.push({
          date: l.date,
          kind: "reading",
          title: `${l.metric} ${readingText(l)}${l.unit ? " " + l.unit : ""}`,
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
    s.labs.filter((l) => l.memberId === mid).forEach((l) => (by[l.seriesKey || l.metric] ||= []).push(l));
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
    if (nextAppt && daysTo(nextAppt.due) <= 30) return { txt: `Appointment in ${daysTo(nextAppt.due)}d`, c: C.sub };
    if (due) return { txt: `${due} due soon`, c: C.warning };
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
            color: inkOf(mm.color),
            icon: RIC[r.kind] || Bell,
            iconC: dd < 0 ? C.red : dd <= 7 ? C.warning : C.sub,
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
      } else if (r.kind === "medication" && dd <= 1) {
        refills++;
        attn.add(r.memberId);
      }
    });
    s.members.forEach((mm) => {
      const by: Record<string, LabLog[]> = {};
      s.labs.filter((l) => l.memberId === mm.id).forEach((l) => (by[l.seriesKey || l.metric] ||= []).push(l));
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


  const emergHTML = useMemo(() => buildEmergency(m, care, taking, s.docs), [m, care, taking, s.docs]);
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
        <style>{css}</style>
        {isMobile && <MNav title="Health" aria-label="Health" />}
        <div className="lh-card" style={{ padding: 24, textAlign: "center", marginTop: 12 }}>
          <Users size={22} color={C.sub} />
          <h2 className="lh-h2" style={{ fontSize: "var(--text-body-lg-size)", margin: "12px 0 8px" }}>
            Add the first person
          </h2>
          <p style={{ color: C.sub, fontSize: "var(--text-body-md-size)", lineHeight: 1.6, margin: "0 0 16px" }}>
            Health keeps records, readings, medicines, and an emergency card for each person in your family. Start with
            yourself or whoever you look after.
          </p>
          <button className="lh-btn" style={{ margin: "0 auto" }} onClick={() => setModal("member")}>
            <UserPlus size={15} /> Add a family member
          </button>
        </div>
        <AnimatePresence>
          {modal === "member" && (
            <AddMember
              onClose={() => setModal(null)}
              save={(mm: Member) => {
                s.addMember(mm);
                s.updateCare(mm.id, { conditions: [], medications: [], allergies: "", doctor: "", emergencyName: "", emergencyPhone: "" });
                setSel(mm.id);
                toast(`${mm.name.split(" ")[0]} added`);
                setModal(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    );

  const upcomingAppts = s.reminders
    .filter((r) => !r.done && r.kind === "appointment" && daysTo(r.due) >= 0)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 3);
  const openPerson = (mid: string) => {
    setSel(mid);
    setTab("overview");
    setMView("person");
  };
  if (isMobile && mView === "family") {
    return (
      <div className="lh-root">
        <style>{css}</style>
        <MNav
          left={
            <button
              onClick={() => setMView("person")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "none",
                border: "none",
                color: C.sub,
                fontSize: "var(--text-body-md-size)",
                fontWeight: 400,
                cursor: "pointer",
                padding: "8px 8px 8px 0",
              }}
            >
              <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} /> Health
            </button>
          }
        />
        <h1 className="lh-h1" style={{ marginBottom: 4 }}>
          Family
        </h1>
        <p style={{ color: C.sub, fontSize: "var(--text-body-md-size)", margin: "0 0 16px", lineHeight: 1.5 }}>
          Everyone whose health records you keep. Tap a person to edit their details, conditions, allergies, and doctor.
        </p>
        <div className="lh-card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          {s.members.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <p style={{ fontSize: "var(--text-body-md-size)", color: C.sub, lineHeight: 1.6, margin: "0 0 16px" }}>
                Add the people whose health records you keep. Each one gets their own records, readings, medicines, and
                emergency information.
              </p>
              <button className="lh-btn" style={{ margin: "0 auto" }} onClick={() => setModal("member")}>
                <UserPlus size={15} /> Add a family member
              </button>
            </div>
          )}
          {s.members.map((mm, i) => {
            const c = s.care[mm.id] || {};
            const bits = [mm.relation, age(mm.dob) != null ? `${age(mm.dob)}` : null, mm.bloodGroup, c.doctor].filter(Boolean);
            return (
              <div
                key={mm.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderTop: i ? `1px solid ${C.border}` : "none",
                }}
              >
                <button
                  onClick={() => {
                    setSel(mm.id);
                    setModal("profile");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flex: 1,
                    minWidth: 0,
                    minHeight: 44,
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    className="lh-famav"
                    style={{ background: al(mm.color, 0.15), color: inkOf(mm.color), border: `1.5px solid ${al(mm.color, 0.33)}` }}
                  >
                    {mm.name[0]}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: "var(--text-body-lg-size)", fontWeight: 700, color: C.text }}>{mm.name}</span>
                    <span
                      style={{
                        display: "block",
                        fontSize: "var(--text-caption-md-size)",
                        marginTop: 4,
                        color: C.sub,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {bits.join(" · ") || "No details yet"}
                    </span>
                  </span>
                </button>
                {mm.id !== "you" && (
                  <button
                    onClick={() => setConfirmDel(mm)}
                    className="lh-x"
                    style={{ color: C.red, borderColor: al(C.red, 0.33), flexShrink: 0 }}
                    title={`Remove ${mm.name.split(" ")[0]}`} aria-label={`Remove ${mm.name.split(" ")[0]}`}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {s.members.length > 0 && (
          <button className="lh-btn-g" style={{ width: "100%", justifyContent: "center" }} onClick={() => setModal("member")}>
            <UserPlus size={15} /> Add a family member
          </button>
        )}
        <AnimatePresence>
          {modal === "member" && (
            <AddMember
              onClose={() => setModal(null)}
              save={(mm: Member) => {
                s.addMember(mm);
                s.updateCare(mm.id, { conditions: [], medications: [], allergies: "", doctor: "", emergencyName: "", emergencyPhone: "" });
                setSel(mm.id);
                toast(`${mm.name.split(" ")[0]} added`);
                setModal(null);
              }}
            />
          )}
          {modal === "profile" && m && (
            <EditProfile
              member={m}
              care={care}
              family={s.members}
              onMemberPhone={(id: string, phone: string) => s.updateMember(id, { phone })}
              onClose={() => setModal(null)}
              save={(cp: any, mp: any) => {
                s.updateCare(sel, cp);
                if (mp) s.updateMember(sel, mp);
                toast("Details updated");
                setModal(null);
              }}
            />
          )}
          {confirmDel && (
            <ConfirmRemove
              member={confirmDel}
              onClose={() => setConfirmDel(null)}
              onYes={() => {
                const nm = confirmDel.name.split(" ")[0];
                if (sel === confirmDel.id) setSel("you");
                s.removeMember(confirmDel.id);
                setConfirmDel(null);
                toast(`${nm} removed`);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="lh-root">
      <style>{css}</style>
      {isMobile && (
        <>
          <MNav title="Health" aria-label="Health" />
          {/* Reachable on a large phone: the top-right corner is not, and adding is the most
              frequent action in this module. */}
          <Fab onPress={() => setAddSheet(true)} label="Add" />
          {/* Who you are looking at, always on screen. Tapping switches without leaving Health. */}
          <div className="lh-swrail">
            {s.members.map((mm) => {
              const on = mm.id === sel;
              return (
                <button
                  key={mm.id}
                  onClick={() => {
                    setSel(mm.id);
                    setTab("overview");
                  }}
                  className={"lh-sw" + (on ? " on" : "")}
                  aria-current={on ? "true" : undefined}
                  title={mm.name} aria-label={mm.name}
                >
                  <span
                    className="lh-swav"
                    style={{
                      background: mm.color + (on ? "33" : "1C"),
                      color: inkOf(mm.color),
                      borderColor: on ? mm.color : "transparent",
                    }}
                  >
                    {mm.name[0]}
                  </span>
                  <span className="lh-swnm" style={{ color: on ? C.text : C.sub }}>
                    {mm.name.split(" ")[0]}
                  </span>
                </button>
              );
            })}
            <button
              className="lh-sw"
              onClick={() => setMView("family")}
              title="Manage family" aria-label="Manage family"
              style={{ opacity: 0.85 }}
            >
              <span className="lh-swav" style={{ background: C.panel2, color: C.sub, border: `1px dashed ${C.border}`, display: "grid", placeItems: "center" }}>
                <Users size={16} />
              </span>
              <span className="lh-swname">Manage</span>
            </button>
          </div>
        </>
      )}
      {!isMobile && (
      <div className="lh-head">
        <div className="lh-headrow">
          <h1 className="lh-h1">Health</h1>
          <span className="lh-famsum" style={{ color: familyActions.length ? C.warning : C.emerald }}>
            <Users size={13} style={{ verticalAlign: "-2px", marginRight: 8 }} />
            {familyActions.length
              ? `${familyActions.length} thing${familyActions.length === 1 ? "" : "s"} need attention`
              : "Everyone is up to date"}
          </span>
        </div>
        <p style={{ color: C.sub, fontSize: "var(--text-body-md-size)", marginTop: 4 }}>
          Keep the whole family visit-ready. ReadiNes reads your records to organize and surface them. It reports what
          they say and never diagnoses.
        </p>
      </div>

      )}
      {/* member switcher — status cards, not bare pills */}
      {!isMobile && (
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
                style={{ background: al(mm.color, 0.15), color: inkOf(mm.color), border: `1.5px solid ${al(mm.color, 0.33)}` }}
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
      </div>
      )}

      {/* selected member — slim identity bar; actions live with their context */}
      <div className="lh-pbar">
        <span className="lh-av" style={{ background: al(m.color, 0.15), color: inkOf(m.color), borderColor: al(m.color, 0.33) }}>
          {m.name[0]}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="lh-h2" style={{ fontSize: "var(--text-heading-md-size)" }}>
            {m.name}
          </h2>
          <div style={{ fontSize: "var(--text-caption-md-size)", color: C.sub, display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <span>{m.relation}</span>
            {age(m.dob) != null && <span>· {age(m.dob)}</span>}
            {m.bloodGroup && <span>· {m.bloodGroup}</span>}
          </div>
        </div>
      </div>

      {/* Everything Health does for this person, in one row. Prepare for a visit leads because it
          is the only one that produces something to hand over. */}
      <div className="lh-actions">
        <button className="lh-act lh-act-on lh-act-wide" onClick={() => setModal("visit")}>
          <ClipboardList size={17} />
          <span>Prepare for a visit</span>
        </button>
        <button className="lh-act" onClick={() => setModal("emergency")}>
          <IdCard size={17} />
          <span>Emergency info</span>
        </button>
        <button
          className="lh-act"
          onClick={() => {
            const ins = insuranceOf(m, s.docs);
            if (ins) setViewDoc(ins);
            else {
              setTab("records");
              toast(`No insurance card on file for ${m.name.split(" ")[0]}`);
            }
          }}
        >
          <ShieldCheck size={17} />
          <span>Insurance card</span>
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
            {k === "meds" && taking.length > 0 && <span className="lh-tc">{taking.length}</span>}
            {k === "records" && records.length > 0 && <span className="lh-tc">{records.length}</span>}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div className="lh-pane">
          {seriesOrder.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: "var(--text-caption-md-size)", color: C.sub }}>
                Showing {visibleSeries.length} of {seriesOrder.length} tracked test
                {seriesOrder.length === 1 ? "" : "s"}
              </span>
              <button
                className="lh-lnk"
                style={{ fontSize: "var(--text-body-lg-size)", fontWeight: 700, marginLeft: "auto" }}
                onClick={() => setPickSeries(true)}
              >
                Choose tests
              </button>
              {seriesOrder.length > visibleSeries.length && (
                <button
                  className="lh-lnk"
                  style={{ fontSize: "var(--text-body-lg-size)", fontWeight: 700 }}
                  onClick={() => setShownSeries(new Set(seriesOrder))}
                >
                  Show all
                </button>
              )}
            </div>
          )}
          <div className="lh-vitals" style={{ marginBottom: 16 }}>
            {Object.keys(vitals).length === 0 && (
              <div className="lh-card" style={{ padding: 20, textAlign: "center" }}>
                <p style={{ color: C.sub, fontSize: "var(--text-body-md-size)", lineHeight: 1.6, margin: "0 0 16px" }}>
                  Upload a lab report and its values arrive here with the ranges printed beside them, or log a reading
                  yourself.
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  <button className="lh-btn" onClick={() => setTab("records")}>
                    <Upload size={15} /> Add a lab report
                  </button>
                  <button className="lh-btn-g" onClick={() => setModal("reading")}>
                    <Plus size={15} /> Log a reading
                  </button>
                </div>
              </div>
            )}
            {visibleSeries.map((k) => {
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
                    <span style={{ fontSize: "var(--text-body-md-size)", color: C.sub }}>
                      {k}
                      {isPaired(l) ? " · systolic trend" : ""}
                    </span>
                    <StatusPill s={st} />
                  </div>
                  <div
                    className="lh-h2"
                    style={{ fontSize: "var(--text-display-md-size)", margin: "8px 0 4px", display: "flex", alignItems: "baseline", gap: 8 }}
                  >
                    {readingText(l)}
                    <span style={{ fontSize: "var(--text-body-md-size)", color: C.sub, fontWeight: 400 }}>{seriesUnit(arr)}</span>
                    <span style={{ display: "block", fontSize: "var(--text-caption-md-size)", color: C.faint, fontWeight: 400, marginTop: 4 }}>
                      {rangeText(l)}
                    </span>
                    <Tr size={14} color={delta === 0 ? C.faint : delta > 0 ? C.red : C.emerald} />
                  </div>
                  <MiniChart arr={arr} metric={k} color={SM[st].c === C.faint ? C.cyan : SM[st].c} />
                  <button
                    className="lh-lnk"
                    style={{ fontSize: "var(--text-caption-md-size)", marginTop: 8 }}
                    onClick={() => {
                      const last = arr[arr.length - 1];
                      if (!last) return;
                      s.removeLab(last.id);
                      toast(`Latest ${k} reading removed`);
                    }}
                  >
                    Remove latest reading
                  </button>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 12,
                      fontSize: "var(--text-caption-md-size)",
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
                        <button className="lh-lnk" style={{ fontSize: "var(--text-caption-md-size)" }} onClick={() => setViewDoc(srcDoc)}>
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
                  ["Conditions answered", (care.conditions || []).length > 0 || !!care.noConditions],
                  ["Allergies answered", !!care.allergies?.trim() || !!care.noKnownAllergies],
                  ["Emergency contact", !!care.emergencyName?.trim() && !!care.emergencyPhone?.trim()],
                  ["Primary doctor", !!care.doctor],
                  ["Insurance on file", !!insuranceOf(m, s.docs)],
                  ["Prescription on file", records.some((r) => r.medType === "prescription")],
                ];
                const done = items.filter(([, ok]) => ok).length;
                const pct = Math.round((done / items.length) * 100);
                const pc = toneFor(pct);
                return (
                  <>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span
                        style={{ fontVariantNumeric: "tabular-nums", fontSize: "var(--text-display-md-size)", fontWeight: 700, color: pc }}
                      >
                        {pct}%
                      </span>
                      <span style={{ fontSize: "var(--text-caption-md-size)", color: C.faint }}>document completeness, not a health score</span>
                      <button
                        onClick={() => setShowWhy((v) => !v)}
                        style={{
                          marginLeft: "auto",
                          minHeight: 34,
                          padding: "8px 12px",
                          borderRadius: "var(--surface-radius)",
                          border: `1px solid ${C.border}`,
                          background: C.panel2,
                          color: C.sub,
                          fontSize: "var(--text-caption-md-size)",
                          fontWeight: 500,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {showWhy ? "Hide" : "How?"}
                      </button>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: "var(--surface-radius)",
                        background: "var(--lpv-raised)",
                        margin: "12px 0 12px",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ width: `${pct}%`, height: "100%", background: pc, borderRadius: "var(--surface-radius)", transition: "width 600ms cubic-bezier(.22,.9,.3,1)" }} />
                    </div>
                    {/* Closed, the missing ones still speak: a complete profile needs no list. */}
                    {!showWhy && done < items.length && (
                      <div style={{ fontSize: "var(--text-caption-md-size)", color: C.sub, marginBottom: 4 }}>
                        Still needed: {items.filter(([, ok]) => !ok).map(([label]) => label.replace(/ (answered|on file)$/, "")).join(", ")}
                      </div>
                    )}
                    {showWhy &&
                      items.map(([label, ok]) => (
                      <div
                        key={label}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", fontSize: "var(--text-caption-md-size)" }}
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
              <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 12, paddingTop: 8 }}>
                <Info2
                  label="Conditions"
                  val={
                    care.conditions.length
                      ? care.conditions.join(", ")
                      : care.noConditions
                        ? "None"
                        : "Not answered yet"
                  }
                />
                <Info2
                  label="Allergies"
                  val={care.allergies?.trim() || (care.noKnownAllergies ? "No known allergies" : "Not answered yet")}
                  warn={!!care.allergies?.trim()}
                />
                <Info2
                  label="Emergency"
                  val={
                    care.emergencyName?.trim()
                      ? `${care.emergencyName}${care.emergencyPhone ? ` · ${care.emergencyPhone}` : ""}`
                      : "Not answered yet"
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TIMELINE ── */}
      {tab === "timeline" && (
        <div className="lh-pane">


          <div className="lh-card" style={{ padding: 24 }}>
            <div className="lh-sechead lh-sechead-tab">
              <CalendarClock size={16} color={C.sub} /> Health timeline
            </div>
            {reminders.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: "var(--text-caption-md-size)",
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    color: C.faint,
                    marginBottom: 8,
                  }}
                >
                  Coming up
                </div>
                {reminders.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      minHeight: 48,
                      padding: "8px 0",
                      borderTop: `1px solid ${C.border}`,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "var(--text-body-lg-size)", fontWeight: 500, color: C.text }}>{r.title}</div>
                      <div style={{ fontSize: "var(--text-caption-md-size)", color: C.sub }}>
                        {[fmt(r.due), r.time, r.repeat && r.repeat !== "once" ? r.repeat : ""].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <button
                      className="lh-ib"
                      onClick={() => s.completeReminder(r.id)}
                      title="Mark done" aria-label="Mark done"
                      style={{ minWidth: 44, minHeight: 44 }}
                    >
                      <Check size={14} color={C.emerald} />
                    </button>
                    <button
                      className="lh-ib"
                      onClick={() => s.removeReminder(r.id)}
                      title="Remove" aria-label="Remove"
                      style={{ minWidth: 44, minHeight: 44 }}
                    >
                      <Trash2 size={14} color={C.faint} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {timeline.length === 0 ? (
              <div style={{ padding: "20px 4px", textAlign: "center" }}>
                <p style={{ color: C.sub, fontSize: "var(--text-body-md-size)", lineHeight: 1.6, margin: "0 0 12px" }}>
                  No history yet. Records you add and readings you log appear here in order, newest first.
                </p>
                <button
                  className="lh-btn"
                  style={{ margin: "0 auto" }}
                  onClick={() => {
                    setTab("records");
                    pendingRec.current = null;
                    setTimeout(() => recRef.current?.click(), 60);
                  }}
                >
                  <Upload size={15} /> Add a record
                </button>
              </div>
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
                        <span className="lh-ic" style={{ background: al(K.c, 0.13) }}>
                          <Ic size={15} color={K.c} />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "var(--text-body-lg-size)", fontWeight: 500, color: C.text }}>{e.title}</div>
                          <div style={{ fontSize: "var(--text-caption-md-size)", color: C.faint }}>
                            {K.label} · {e.detail}
                          </div>
                        </div>
                        <span style={{ fontSize: "var(--text-caption-md-size)", color: C.faint, whiteSpace: "nowrap" }}>{fmt(e.date)}</span>
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
            {meds.length === 0 ? (
              <div style={{ padding: "16px 4px", textAlign: "center" }}>
                <p style={{ color: C.sub, fontSize: "var(--text-body-md-size)", lineHeight: 1.6, margin: "0 0 12px" }}>
                  No medicines recorded. Upload a prescription and they are read from it.
                </p>
                <button className="lh-btn-g" style={{ margin: "0 auto" }} onClick={() => setModal("med")}>
                  <Plus size={15} /> Add one by hand
                </button>
              </div>
            ) : (
              meds
                .slice()
                .sort((a, b) => (a.status === "stopped" ? 1 : 0) - (b.status === "stopped" ? 1 : 0))
                .map((med) => {
                  const stopped = med.status === "stopped";
                  const rf = med.refillBy && !stopped ? daysTo(med.refillBy) : null;
                  /* How long since anyone said this was still being taken. A list nobody has
                     confirmed in months is not a current medication list. */
                  const since = med.confirmedOn ? Math.floor(daysSince(med.confirmedOn)) : null;
                  const stale = !stopped && (since === null || since > 90);
                  const latestRx = records
                    .filter((r) => r.medType === "prescription")
                    .sort((a, b) => (b.docDate || b.addedAt).localeCompare(a.docDate || a.addedAt))[0];
                  return (
                    <div key={med.id} className="lh-med" style={{ opacity: stopped ? 0.6 : 1 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <span className="lh-ic" style={{ background: al(stopped ? C.faint : C.violet, 0.13), flexShrink: 0 }}>
                          <PillIcon size={16} color={stopped ? C.faint : C.violet} />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "var(--text-body-md-size)",
                              fontWeight: 500,
                              color: C.text,
                              lineHeight: 1.35,
                              textDecoration: stopped ? "line-through" : "none",
                            }}
                          >
                            {med.name}
                            {med.dose && <span style={{ color: C.sub, fontWeight: 400 }}> {med.dose}</span>}
                          </div>
                          <div style={{ fontSize: "var(--text-caption-md-size)", color: C.sub, marginTop: 4 }}>
                            {stopped
                              ? `Stopped ${med.stoppedOn ? fmt(med.stoppedOn) : ""}${med.stoppedNote ? ` · ${med.stoppedNote}` : ""}`
                              : [scheduleText(med.freq), med.timing].filter(Boolean).join(" · ")}
                          </div>
                          {!stopped && (
                            <div
                              style={{
                                fontSize: "var(--text-caption-md-size)",
                                color: stale ? C.warning : C.faint,
                                marginTop: 4,
                              }}
                            >
                              {[
                                since === null
                                  ? "Not confirmed"
                                  : since === 0
                                    ? "Confirmed today"
                                    : `Confirmed ${since} day${since === 1 ? "" : "s"} ago`,
                                rf !== null && rf <= 14
                                  ? rf < 0
                                    ? "repeat overdue"
                                    : `repeat due ${fmt(med.refillBy)}`
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          )}
                          {!stopped && (
                            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                              <button
                                className="lh-btn-g"
                                style={{ padding: "8px 12px", fontSize: "var(--text-caption-md-size)", minHeight: 40 }}
                                onClick={() => {
                                  s.confirmMed(med.id);
                                  toast(`${med.name} confirmed`);
                                }}
                              >
                                <Check size={13} /> Still taking
                              </button>
                              <button
                                className="lh-btn-g"
                                style={{ padding: "8px 12px", fontSize: "var(--text-caption-md-size)", minHeight: 40, color: C.sub }}
                                onClick={() => setStopping(med)}
                              >
                                Stopped
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          className="lh-ib"
                          onClick={() => s.removeMed(med.id)}
                          title="Remove this medicine" aria-label="Remove this medicine"
                          style={{ flexShrink: 0, minWidth: 44, minHeight: 44 }}
                        >
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
            <div className="lh-sechead lh-sechead-tab">
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
                <Upload size={16} color={C.action} /> Upload medical record
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
                    /* Uploaded from a person's Records tab: it is a medical record for that person,
                       whatever the classifier makes of the file name or the scan quality. */
                    s.addFiles(e.target.files, sel, { category: "Medical", memberId: sel, ...(pen?.override || {}) });
                    toast(`${pen?.label || "Record"} added`);
                  }
                  pendingRec.current = null;
                  e.currentTarget.value = "";
                }}
              />
            </div>
            {records.length === 0 ? (
              <div style={{ padding: "20px 4px", textAlign: "center" }}>
                <p style={{ color: C.sub, fontSize: "var(--text-body-md-size)", lineHeight: 1.6, margin: "0 0 12px" }}>
                  No records yet. Add a prescription or lab report and it is filed here automatically. and
                  ranges printed on it, and notes the doctor and hospital. A copy lands in Documents too.
                </p>
                <button
                  className="lh-btn"
                  style={{ margin: "0 auto" }}
                  onClick={() => {
                    pendingRec.current = null;
                    recRef.current?.click();
                  }}
                >
                  <Upload size={15} /> Add a record
                </button>
              </div>
            ) : (
              <div style={{ position: "relative", paddingLeft: 20, marginTop: 8 }}>
                <div style={{ position: "absolute", left: 4, top: 6, bottom: 6, width: 1, background: C.border }} />
                {records.map((r) => {
                  const K = KIND[r.medType || "other"] || KIND.other;
                  const Ic = K.icon;
                  return (
                    <div key={r.id} className="lh-rec" style={{ position: "relative" }}>
                      <div onClick={() => setViewDoc(r)} style={{ cursor: "pointer", display: "contents" }}>
                      <span
                        style={{
                          position: "absolute",
                          left: -17,
                          top: 14,
                          width: 9,
                          height: 9,
                          borderRadius: "var(--surface-radius)",
                          background: K.c,
                          boxShadow: `0 0 7px ${K.c}`,
                        }}
                      />
                      <span className="lh-ic" style={{ background: al(K.c, 0.13) }}>
                        <Ic size={15} color={K.c} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "var(--text-body-md-size)",
                            fontWeight: 500,
                            color: C.text,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.docType}
                        </div>
                        <div
                          style={{
                            fontSize: "var(--text-caption-md-size)",
                            color: C.faint,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {[fmt(r.docDate || r.addedAt), r.doctor].filter(Boolean).join(" · ")}
                        </div>
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
        {pickSeries && (
          <div className="lh-overlay" onClick={() => setPickSeries(false)}>
            <motion.div
              className="lh-modal"
              onClick={(e) => e.stopPropagation()}
              initial={isMobileView() ? { y: 40, opacity: 0 } : { scale: 0.96, opacity: 0 }}
              animate={isMobileView() ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
              transition={{ duration: 0.24, ease: [0.2, 0.9, 0.3, 1.08] }}
            >
              <h3 className="lh-h2" style={{ fontSize: "var(--text-heading-md-size)", marginBottom: 4 }}>
                Which tests to chart
              </h3>
              <p style={{ fontSize: "var(--text-body-md-size)", color: C.sub, margin: "0 0 16px" }}>
                Every test read from {m.name.split(" ")[0]}'s reports. Nothing is hidden, only unpinned from this screen.
              </p>
              <div style={{ maxHeight: "46vh", overflowY: "auto" }}>
                {seriesOrder.map((k) => {
                  const arr = vitals[k];
                  const on = shownSeries ? shownSeries.has(k) : visibleSeries.includes(k);
                  return (
                    <button
                      key={k}
                      onClick={() => {
                        const next = new Set(shownSeries || visibleSeries);
                        next.has(k) ? next.delete(k) : next.add(k);
                        setShownSeries(next);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        width: "100%",
                        minHeight: 48,
                        padding: "8px 4px",
                        background: "none",
                        border: "none",
                        borderTop: `1px solid ${C.border}`,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "var(--surface-radius)",
                          flexShrink: 0,
                          display: "grid",
                          placeItems: "center",
                          background: on ? C.action : "transparent",
                          border: `1.5px solid ${on ? C.action : C.border}`,
                          color: "var(--lpv-actionink)",
                        }}
                      >
                        {on ? <Check size={13} /> : null}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: "var(--text-body-lg-size)", fontWeight: 500, color: C.text }}>
                          {seriesName(arr)}
                        </span>
                        <span style={{ display: "block", fontSize: "var(--text-caption-md-size)", color: C.sub, marginTop: 4 }}>
                          {arr.length} reading{arr.length === 1 ? "" : "s"} · latest {readingText(arr[arr.length - 1])}{" "}
                          {seriesUnit(arr)}
                        </span>
                      </span>
                      {statusOfReading(arr[arr.length - 1]) === "out" && (
                        <span className="lh-chip" style={{ fontSize: "var(--text-caption-md-size)", color: C.red, whiteSpace: "nowrap" }}>
                          outside range
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button
                  className="lh-btn-g"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => {
                    setShownSeries(null);
                    setPickSeries(false);
                  }}
                >
                  Reset
                </button>
                <button className="lh-btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => setPickSeries(false)}>
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {editRec && (
          <EditRecord
            doc={editRec}
            labs={s.labs}
            onClose={() => setEditRec(null)}
            onRemoveReading={(lid: string) => {
              s.removeLab(lid);
              toast("Reading removed");
            }}
            onSave={(patch: Partial<Doc>) => {
              s.updateDoc(editRec.id, patch);
              toast("Record updated");
              setEditRec(null);
            }}
          />
        )}
        {addSheet && (
          <div className="lh-overlay" onClick={() => setAddSheet(false)}>
            <motion.div
              className="lh-modal"
              onClick={(e) => e.stopPropagation()}
              initial={isMobileView() ? { y: 40, opacity: 0 } : { scale: 0.96, opacity: 0 }}
              animate={isMobileView() ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
              transition={{ duration: 0.24, ease: [0.2, 0.9, 0.3, 1.08] }}
            >
              <h3 className="lh-h2" style={{ fontSize: "var(--text-heading-md-size)", marginBottom: 4 }}>
                Add to Health
              </h3>
              <p style={{ fontSize: "var(--text-body-md-size)", color: C.sub, margin: "0 0 16px" }}>For {m.name.split(" ")[0]}</p>
              {[
                {
                  icon: Upload,
                  label: "A record",
                  sub: "Prescription, lab report, scan, or discharge summary",
                  run: () => {
                    setTab("records");
                    pendingRec.current = null;
                    setTimeout(() => recRef.current?.click(), 60);
                  },
                },
                { icon: Plus, label: "A reading", sub: "Copy a value and its range from a report", run: () => setModal("reading") },
                { icon: Bell, label: "A reminder", sub: "Appointment, refill, or vaccination", run: () => setModal("reminder") },
                { icon: PillIcon, label: "A medicine", sub: "Name, dose, and how often", run: () => setModal("med") },
                {
                  icon: Users,
                  label: "A family member",
                  sub: "Someone else whose records you keep",
                  run: () => setModal("member"),
                },
              ].map((o) => (
                <button
                  key={o.label}
                  onClick={() => {
                    setAddSheet(false);
                    o.run();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    minHeight: 56,
                    padding: "12px 4px",
                    background: "none",
                    border: "none",
                    borderTop: `1px solid ${C.border}`,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <o.icon size={18} color={C.action} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: "var(--text-body-lg-size)", fontWeight: 500, color: C.text }}>{o.label}</span>
                    <span style={{ display: "block", fontSize: "var(--text-caption-md-size)", color: C.sub, marginTop: 4 }}>{o.sub}</span>
                  </span>
                  <ChevronRight size={15} color={C.faint} />
                </button>
              ))}
            </motion.div>
          </div>
        )}
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
                allergies: "",
                doctor: "",
                emergencyName: "",
                emergencyPhone: "",
              });
              setSel(mm.id);
              toast("Member added");
              setModal(null);
            }}
          />
        )}
        {stopping && (
          <Modal title={`Stopped ${stopping.name}?`} onClose={() => setStopping(null)}>
            <p style={{ fontSize: "var(--text-body-md-size)", color: C.sub, margin: "0 0 16px", lineHeight: 1.5 }}>
              It stays on file with the date, so a doctor can see what changed.
            </p>
            <Lbl>Why, if you know</Lbl>
            <input
              className="lh-in"
              autoFocus
              value={stopNote}
              onChange={(e) => setStopNote(e.target.value)}
              placeholder="Changed by Dr Rao"
            />
            <button
              className="lh-btn"
              style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
              onClick={() => {
                s.stopMed(stopping.id, stopNote.trim() || undefined);
                toast(`${stopping.name} marked stopped`);
                setStopping(null);
                setStopNote("");
              }}
            >
              Mark stopped
            </button>
          </Modal>
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
            save={(r: { title: string; kind: ReminderKind; due: string; repeat?: ReminderRepeat; time?: string }) => {
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
            family={s.members}
            onMemberPhone={(id: string, phone: string) => s.updateMember(id, { phone })}
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
            title="Emergency card" aria-label="Emergency card"
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
            member={m}
            care={care}
            meds={taking}
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
      {viewDoc && (
        <DocViewer
          doc={viewDoc}
          store={s}
          onCorrect={
            viewDoc.category === "Medical"
              ? () => {
                  setEditRec(viewDoc);
                  setViewDoc(null);
                }
              : undefined
          }
          onClose={() => setViewDoc(null)}
        />
      )}
      <div id="lh-print" dangerouslySetInnerHTML={{ __html: printHTML }} />
    </div>
  );
}

/* ── small components ── */
const Empty = ({ t }: any) => <div style={{ fontSize: "var(--text-body-md-size)", color: C.faint, padding: "12px 0" }}>{t}</div>;
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
    <span style={{ fontSize: "var(--text-body-md-size)", color: C.faint }}>{label}</span>
    <span style={{ fontSize: "var(--text-body-md-size)", color: warn ? C.red : C.text, fontWeight: warn ? 600 : 500, textAlign: "right" }}>
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
        style={{ filter: `drop-shadow(0 0 3px ${al(c, 0.53)})` }}
      />
    </svg>
  );
}
function MiniChart({ arr, metric, color }: { arr: LabLog[]; metric: string; color: string }) {
  const vals = arr.map((x) => x.value);
  const latest = arr[arr.length - 1];
  const band: [number, number] | undefined =
    latest && (latest.refLow !== undefined || latest.refHigh !== undefined)
      ? [latest.refLow ?? Math.min(...vals), latest.refHigh ?? Math.max(...vals)]
      : undefined;
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
  const shortD = (ss: string) => new Date(ss).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const last = arr[arr.length - 1];
  const bandTop = band ? Math.max(pt, Y(band[1])) : 0;
  const bandBot = band ? Math.min(H - pb, Y(band[0])) : 0;
  const mono = "inherit";
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
        <text x={W - pr - 2} y={Y(band[1]) - 4} textAnchor="end" fontSize="10" fill={C.emerald} fontFamily={mono}>
          printed range ≤ {band[1]}
        </text>
      )}
    </svg>
  );
}
const StatusPill = ({ s }: { s: Status }) => (
  <span
    style={{
      fontVariantNumeric: "tabular-nums",
      fontSize: "var(--text-caption-md-size)",
      fontWeight: 500,
      color: SM[s].c,
      background: al(SM[s].c, 0.13),
      border: `1px solid ${al(SM[s].c, 0.2)}`,
      padding: "4px 12px",
      borderRadius: "var(--surface-radius)",
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
        initial={isMobileView() ? { y: 40, opacity: 0 } : { scale: 0.96, opacity: 0 }}
        animate={isMobileView() ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.24, ease: [0.2, 0.9, 0.3, 1.08] }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 className="lh-h2" style={{ fontSize: "var(--text-heading-md-size)" }}>
            {title}
          </h3>
          <button className="lh-x" onClick={onClose} title="Close" aria-label="Close">
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
        initial={isMobileView() ? { y: 40, opacity: 0 } : { scale: 0.96, opacity: 0 }}
        animate={isMobileView() ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.24, ease: [0.2, 0.9, 0.3, 1.08] }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div className="lh-eyebrow" style={{ marginBottom: 4 }}>
              One tap · assembled from your archive
            </div>
            <h3 className="lh-h2" style={{ fontSize: "var(--text-heading-md-size)" }}>
              {title}
            </h3>
          </div>
          <button className="lh-x" onClick={onClose} title="Close" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="lh-preview" style={{ flex: 1, minHeight: 0, overflow: "auto" }} dangerouslySetInnerHTML={{ __html: html }} />
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
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
  /* Series already on file, so a second reading of the same test lands on the same line. */
  const existing = Object.keys(vitals).map((key) => ({
    key,
    name: seriesName(vitals[key]),
    unit: seriesUnit(vitals[key]),
  }));
  const [k, setK] = useState(existing[0]?.key || "");
  const [newTest, setNewTest] = useState(existing.length === 0);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [v, setV] = useState("");
  const [d, setD] = useState("");
  const [date, setDate] = useState(today());
  const [rl, setRl] = useState("");
  const [rh, setRh] = useState("");
  const isBP = newTest ? unit.toLowerCase() === "mmhg" : (vitals[k]?.[0]?.unit || "").toLowerCase() === "mmhg";
  const curUnit = newTest ? unit : seriesUnit(vitals[k] || []);
  const ready = (newTest ? name.trim() && unit.trim() : !!k) && v.trim() !== "";
  return (
    <Modal title={`Log a reading for ${member.name.split(" ")[0]}`} onClose={onClose}>
      <Lbl>Test</Lbl>
      {existing.length > 0 && !newTest && (
        <div className="lh-pick">
          {existing.map((e) => (
            <button key={e.key} className={"lh-pk" + (k === e.key ? " on" : "")} onClick={() => setK(e.key)}>
              {e.name}
            </button>
          ))}
        </div>
      )}
      {newTest && (
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 2 }}>
            <input
              className="lh-in"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name as printed, e.g. PSA Total"
            />
          </div>
          <div style={{ flex: 1 }}>
            <input className="lh-in" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" />
          </div>
        </div>
      )}
      <button className="lh-lnk" style={{ fontSize: "var(--text-caption-md-size)", marginTop: 8 }} onClick={() => setNewTest((x) => !x)}>
        {newTest && existing.length > 0 ? "Pick a test already on file" : "Add a test not listed"}
      </button>
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <div style={{ flex: 1 }}>
          <Lbl>
            {isBP ? "Systolic" : "Value"}
            {curUnit ? ` (${curUnit})` : ""}
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
      {!isBP && (
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <Lbl>Range low (optional)</Lbl>
            <input className="lh-in" type="number" value={rl} onChange={(e) => setRl(e.target.value)} placeholder="as printed" />
          </div>
          <div style={{ flex: 1 }}>
            <Lbl>Range high (optional)</Lbl>
            <input className="lh-in" type="number" value={rh} onChange={(e) => setRh(e.target.value)} placeholder="as printed" />
          </div>
        </div>
      )}
      <div style={{ fontSize: "var(--text-caption-md-size)", color: C.faint, marginTop: 12 }}>
        Copy the test name, value, unit, and reference range from your report. ReadiNes supplies none of them, so a
        reading with no range is recorded without a status.
      </div>
      <button
        className="lh-btn"
        style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
        disabled={!ready}
        onClick={() => {
          const val = parseFloat(v);
          if (isNaN(val)) return;
          const mName = newTest ? name.trim() : seriesName(vitals[k] || []);
          const mUnit = curUnit.trim();
          const lo = parseFloat(rl);
          const hi = parseFloat(rh);
          const hasRange = !isBP && (Number.isFinite(lo) || Number.isFinite(hi));
          save(mName, {
            seriesKey: newTest ? normaliseTestName(mName) + "|" + mUnit.toLowerCase() : k,
            value: val,
            unit: mUnit,
            date,
            ...(isBP ? { value2: parseFloat(d) || 0 } : {}),
            ...(hasRange
              ? {
                  refLow: Number.isFinite(lo) ? lo : undefined,
                  refHigh: Number.isFinite(hi) ? hi : undefined,
                  refText: Number.isFinite(lo) && Number.isFinite(hi) ? `${lo} to ${hi}` : Number.isFinite(hi) ? `under ${hi}` : `over ${lo}`,
                }
              : {}),
          });
        }}
      >
        Save reading
      </button>
    </Modal>
  );

}
function EditRecord({ doc, labs, onClose, onSave, onRemoveReading }: any) {
  const [f, setF] = useState({
    docType: doc.docType || "",
    doctor: doc.doctor || "",
    hospital: doc.hospital || "",
    specialisation: doc.specialisation || "",
    lab: doc.lab || "",
    docDate: (doc.docDate || doc.addedAt || "").slice(0, 10),
  });
  const mine = labs.filter((l: LabLog) => l.sourceDocId === doc.id);
  return (
    <Modal title="Correct this record" onClose={onClose}>
      <p style={{ fontSize: "var(--text-body-md-size)", color: C.sub, margin: "0 0 16px", lineHeight: 1.5 }}>
        {doc.readAt
          ? "These were read from the document. Fix anything that came out wrong: a visit is assembled from them."
          : "Nothing was read from this document. Fill in what it says so it can be found later."}
      </p>
      <Lbl>What it is</Lbl>
      <input className="lh-in" value={f.docType} onChange={(e) => setF({ ...f, docType: e.target.value })} placeholder="Prescription, Lab Report, Scan" />
      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <Lbl>Doctor</Lbl>
          <input className="lh-in" value={f.doctor} onChange={(e) => setF({ ...f, doctor: e.target.value })} placeholder="Dr Meera Krishnan" />
        </div>
        <div style={{ flex: 1 }}>
          <Lbl>Date on it</Lbl>
          <input className="lh-in" type="date" value={f.docDate} onChange={(e) => setF({ ...f, docDate: e.target.value })} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <Lbl>Hospital or clinic</Lbl>
          <input className="lh-in" value={f.hospital} onChange={(e) => setF({ ...f, hospital: e.target.value })} placeholder="Fortis Hospital" />
        </div>
        <div style={{ flex: 1 }}>
          <Lbl>Specialisation</Lbl>
          <input className="lh-in" value={f.specialisation} onChange={(e) => setF({ ...f, specialisation: e.target.value })} placeholder="Cardiology" />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <Lbl>Laboratory</Lbl>
        <input className="lh-in" value={f.lab} onChange={(e) => setF({ ...f, lab: e.target.value })} placeholder="Apollo Diagnostics" />
      </div>
      {mine.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <Lbl>Readings taken from this record</Lbl>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: "var(--surface-radius)", overflow: "hidden" }}>
            {mine.map((l: LabLog, i: number) => (
              <div
                key={l.id}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 12px", borderTop: i ? `1px solid ${C.border}` : "none" }}
              >
                <span style={{ flex: 1, minWidth: 0, fontSize: "var(--text-body-md-size)", color: C.text }}>
                  {l.metric}{" "}
                  <b>
                    {l.qualifier || ""}
                    {l.value}
                    {l.value2 ? `/${l.value2}` : ""}
                  </b>{" "}
                  <span style={{ color: C.sub }}>{l.unit}</span>
                </span>
                <button
                  className="lh-ib"
                  onClick={() => onRemoveReading(l.id)}
                  title="Remove this reading" aria-label="Remove this reading"
                  style={{ minWidth: 44, minHeight: 44 }}
                >
                  <Trash2 size={14} color={C.faint} />
                </button>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "var(--text-caption-md-size)", color: C.faint, marginTop: 8, lineHeight: 1.5 }}>
            A value that was misread should be removed here and logged by hand with the number printed on the report.
          </p>
        </div>
      )}
      <button
        className="lh-btn"
        style={{ width: "100%", justifyContent: "center", marginTop: 20 }}
        onClick={() =>
          onSave({
            docType: f.docType.trim() || doc.docType,
            doctor: f.doctor.trim() || undefined,
            hospital: f.hospital.trim() || undefined,
            specialisation: f.specialisation.trim() || undefined,
            lab: f.lab.trim() || undefined,
            docDate: f.docDate || undefined,
          })
        }
      >
        Save corrections
      </button>
    </Modal>
  );
}

function ConfirmRemove({ member, onClose, onYes }: any) {
  const first = member.name.split(" ")[0];
  return (
    <div className="lh-overlay" onClick={onClose}>
      <motion.div
        className="lh-modal"
        onClick={(e) => e.stopPropagation()}
        initial={isMobileView() ? { y: 40, opacity: 0 } : { scale: 0.96, opacity: 0 }}
        animate={isMobileView() ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.24, ease: [0.2, 0.9, 0.3, 1.08] }}
      >
        <h3 className="lh-h2" style={{ fontSize: "var(--text-heading-md-size)", marginBottom: 8 }}>
          Remove {first}?
        </h3>
        <p style={{ fontSize: "var(--text-body-md-size)", color: C.sub, lineHeight: 1.6, margin: "0 0 20px" }}>
          {first}'s readings, medicines, and reminders are removed with them. Their documents stay in your vault, no
          longer assigned to anyone, so nothing is lost.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="lh-btn-g" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>
            Keep
          </button>
          <button
            className="lh-btn-g"
            style={{ flex: 1, justifyContent: "center", color: C.red, borderColor: al(C.red, 0.33) }}
            onClick={onYes}
          >
            Remove
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AddMember({ onClose, save }: any) {
  const [f, setF] = useState({ name: "", relation: "Parent", dob: "1960-01-01", bloodGroup: "O+" });
  const colors = [C.chart1, C.chart2, C.emerald, C.warning, C.red];
  return (
    <Modal title="Add a family member" aria-label="Add a family member" onClose={onClose}>
      <Lbl>Name</Lbl>
      <input
        className="lh-in"
        value={f.name}
        onChange={(e) => setF({ ...f, name: e.target.value })}
        placeholder="e.g. Lakshmi Iyer"
      />
      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
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
  const [f, setF] = useState<{ name: string; dose: string; freq: string; timing: Medication["timing"]; refillBy: string }>({ name: "", dose: "", freq: "1-0-0", timing: "after food", refillBy: "" });
  return (
    <Modal title="Add medication" aria-label="Add medication" onClose={onClose}>
      <div style={{ display: "flex", gap: 12 }}>
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
      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <Lbl>When to take it</Lbl>
          {/* A prescription says morning, afternoon, night. Typing "Once daily" loses which one. */}
          <div style={{ display: "flex", gap: 8 }}>
            {(["Morning", "Afternoon", "Night"] as const).map((slot, i) => {
              const parts = (f.freq || "0-0-0").split("-");
              const on = parts[i] !== "0";
              return (
                <button
                  key={slot}
                  onClick={() => {
                    const next = [...parts];
                    next[i] = on ? "0" : "1";
                    setF({ ...f, freq: next.join("-") });
                  }}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    borderRadius: "var(--surface-radius)",
                    border: `1px solid ${on ? C.action : C.border}`,
                    background: on ? al(C.action, 0.12) : C.panel2,
                    color: on ? C.action : C.sub,
                    fontSize: "var(--text-caption-md-size)",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {slot.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <Lbl>Repeat runs out</Lbl>
          <input
            className="lh-in"
            type="date"
            value={f.refillBy}
            onChange={(e) => setF({ ...f, refillBy: e.target.value })}
          />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <Lbl>With meals</Lbl>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(["before food", "after food", "with food", "any time"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setF({ ...f, timing: t })}
              style={{
                minHeight: 44,
                padding: "0 12px",
                borderRadius: "var(--surface-radius)",
                border: `1px solid ${f.timing === t ? C.action : C.border}`,
                background: f.timing === t ? al(C.action, 0.12) : C.panel2,
                color: f.timing === t ? C.action : C.sub,
                fontSize: "var(--text-caption-md-size)",
                fontWeight: 500,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <p style={{ fontSize: "var(--text-caption-md-size)", color: C.faint, marginTop: 12 }}>Repeat date is optional.</p>
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
  const [f, setF] = useState<{ title: string; kind: ReminderKind; due: string; repeat: ReminderRepeat; time: string }>({
    title: "",
    kind: "appointment",
    due: rel(14),
    repeat: "once",
    time: "",
  });
  return (
    <Modal title="Add reminder" aria-label="Add reminder" onClose={onClose}>
      <Lbl>Title</Lbl>
      <input
        className="lh-in"
        value={f.title}
        onChange={(e) => setF({ ...f, title: e.target.value })}
        placeholder="e.g. Cardiology follow-up"
      />
      <div style={{ marginTop: 12 }}>
        <Lbl>What for</Lbl>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(
            [
              ["appointment", "Appointment"],
              ["medication", "Take a medicine"],
              ["refill", "Refill"],
              ["other", "Something else"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setF({ ...f, kind: k, repeat: k === "medication" ? "daily" : "once" })}
              style={{
                minHeight: 44,
                padding: "0 12px",
                borderRadius: "var(--surface-radius)",
                border: `1px solid ${f.kind === k ? C.action : C.border}`,
                background: f.kind === k ? al(C.action, 0.12) : C.panel2,
                color: f.kind === k ? C.action : C.sub,
                fontSize: "var(--text-caption-md-size)",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <Lbl>{f.repeat === "once" ? "Due" : "Starting"}</Lbl>
          <input className="lh-in" type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} />
        </div>
        {f.kind === "medication" && (
          <div style={{ flex: 1 }}>
            <Lbl>Time</Lbl>
            <input className="lh-in" type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
          </div>
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        <Lbl>How often</Lbl>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(
            [
              ["once", "Once"],
              ["daily", "Every day"],
              ["weekly", "Every week"],
              ["monthly", "Every month"],
            ] as const
          ).map(([r, label]) => (
            <button
              key={r}
              onClick={() => setF({ ...f, repeat: r })}
              style={{
                minHeight: 44,
                padding: "0 12px",
                borderRadius: "var(--surface-radius)",
                border: `1px solid ${f.repeat === r ? C.action : C.border}`,
                background: f.repeat === r ? al(C.action, 0.12) : C.panel2,
                color: f.repeat === r ? C.action : C.sub,
                fontSize: "var(--text-caption-md-size)",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
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
function EditProfile({ member, care, onClose, save, family = [], onMemberPhone }: any) {
  /* Everyone else in the family: the likeliest emergency contact is already recorded. */
  const others = (family as Member[]).filter((x) => x.id !== member.id);
  const [cond, setCond] = useState<string[]>(care.conditions);
  const [ci, setCi] = useState("");
  const [noAll, setNoAll] = useState(!!care.noKnownAllergies);
  const [noCond, setNoCond] = useState(!!care.noConditions);
  const [allergies, setAll] = useState(care.allergies || "");
  const [doctor, setDoc] = useState(care.doctor || "");
  const [hospital, setHosp] = useState(care.hospital || "");
  const [emName, setEmName] = useState(care.emergencyName || "");
  const [emPhone, setEmPhone] = useState(care.emergencyPhone || "");
  /* Which family member this contact is, when it is one: lets a new number be saved back to them. */
  const [emFrom, setEmFrom] = useState<string | null>(null);
  const [blood, setBlood] = useState(member.bloodGroup || "");
  return (
    <Modal title={`Edit ${member.name.split(" ")[0]}'s care profile`} onClose={onClose}>
      <Lbl>Conditions</Lbl>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0" }}>
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
      <label
        style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44, marginTop: 4, cursor: "pointer" }}
      >
        <input
          type="checkbox"
          checked={noCond}
          disabled={cond.length > 0}
          onChange={(e) => setNoCond(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: C.action }}
        />
        <span style={{ fontSize: "var(--text-body-md-size)", color: cond.length > 0 ? C.faint : C.text }}>No known conditions</span>
      </label>
      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <div style={{ flex: 2 }}>
          <Lbl>Allergies</Lbl>
          <input
            className="lh-in"
            value={allergies}
            disabled={noAll}
            onChange={(e) => setAll(e.target.value)}
            placeholder={noAll ? "No known allergies" : "Penicillin, sulfa drugs"}
            style={noAll ? { opacity: 0.5 } : undefined}
          />
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
      <label style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={noAll}
          disabled={!!allergies.trim()}
          onChange={(e) => setNoAll(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: C.action }}
        />
        <span style={{ fontSize: "var(--text-body-md-size)", color: allergies.trim() ? C.faint : C.text }}>No known allergies</span>
      </label>
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
        {/* Usually this is someone already in the family. Picking them fills both fields and, if
            their number is new, records it on them so the next profile can reuse it. */}
        {others.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {others.map((o: Member) => (
              <button
                key={o.id}
                onClick={() => {
                  setEmName(`${o.name} (${o.relation.toLowerCase()})`);
                  if (o.phone) setEmPhone(o.phone);
                  setEmFrom(o.id);
                }}
                style={{
                  minHeight: 36,
                  padding: "8px 12px",
                  borderRadius: "var(--surface-radius)",
                  border: `1px solid ${emFrom === o.id ? C.action : C.border}`,
                  background: emFrom === o.id ? al(C.action, 0.12) : C.panel2,
                  color: emFrom === o.id ? C.action : C.sub,
                  fontSize: "var(--text-caption-md-size)",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {o.name.split(" ")[0]}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 12 }}>
          <input
            className="lh-in"
            style={{ flex: 3 }}
            value={emName}
            onChange={(e) => {
              setEmName(e.target.value);
              setEmFrom(null);
            }}
            placeholder="Name (relation)"
          />
          <input
            className="lh-in"
            style={{ flex: 2 }}
            type="tel"
            inputMode="tel"
            value={emPhone}
            onChange={(e) => setEmPhone(e.target.value)}
            placeholder="Phone"
          />
        </div>
      </div>
      <button
        className="lh-btn"
        style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
        onClick={() => {
          if (emFrom && emPhone.trim()) onMemberPhone?.(emFrom, emPhone.trim());
          save({ conditions: cond, allergies, doctor, hospital, emergencyName: emName.trim(), emergencyPhone: emPhone.trim(), noKnownAllergies: noAll && !allergies.trim(), noConditions: noCond && cond.length === 0 }, { bloodGroup: blood || undefined });
        }}
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
  // Standalone printable document: it leaves the app, so it carries the light-theme values inline.
  const P = { ink: "#1B1626", muted: "#5D5869", danger: "#C62F38", band: "#EEEFF5", paper: "#FFFFFF", onDanger: "#FFFFFF" }; /* token-source */
  const F = { title: "18px", name: "15px", h3: "13.5px", body: "13px", table: "12.5px", note: "12px" };
  const a = age(m.dob);
  const srcFor = (date: string) =>
    records
      .filter((r) => r.medType === "lab_report" && (r.docDate || r.addedAt).slice(0, 10) <= date)
      .sort((x, y) => (y.docDate || y.addedAt).localeCompare(x.docDate || x.addedAt))[0];
  const readingRows = Object.keys(vitals)
    .map((k) => {
      const l = vitals[k][vitals[k].length - 1];
      const val = readingText(l);
      const src = srcFor(l.date);
      return `<tr><td style="padding:5px 10px">${seriesName(vitals[k])}</td><td style="padding:5px 10px;font-weight:700">${val} ${seriesUnit(vitals[k])}</td><td style="padding:5px 10px;color:${P.muted}">${fmt(l.date)}</td><td style="padding:5px 10px;color:${P.muted}">${src ? src.name : "manually logged"}</td></tr>`;
    })
    .join("");
  const sec = (t: string, body: string) =>
    `<h3 style="margin:16px 0 6px;font-size:${F.h3};color:${P.ink}">${t}</h3>${body}`;
  return `<div style="color:${P.ink};background:${P.paper};padding:24px;max-width:680px;margin:0 auto">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${P.ink};padding-bottom:10px">
    <div><div style="font-weight:700;font-size:${F.title}">ReadiNes · Visit Pack</div><div style="color:${P.muted};font-size:${F.table}">${visitLabel}</div></div>
    <div style="text-align:right"><div style="font-weight:700;font-size:${F.name}">${m.name}</div><div style="color:${P.muted};font-size:${F.note}">${m.relation}${a != null ? ` · ${a}y` : ""}${m.bloodGroup ? ` · ${m.bloodGroup}` : ""}</div></div>
  </div>
  ${sec("Critical", `<div style="font-size:${F.body};line-height:1.7"><b style="color:${P.danger}">Allergies:</b> ${care.allergies || "None recorded"}<br/><b>Conditions:</b> ${(care.conditions || []).join(", ") || "None recorded"}<br/><b>Primary physician:</b> ${care.doctor || "—"}${care.hospital ? `<br/><b>Preferred hospital:</b> ${care.hospital}` : ""}</div>`)}
  ${sec("Current medications", meds.length ? `<ul style="margin:0;padding-left:18px;line-height:1.7;font-size:${F.body}">${meds.map((x) => `<li>${[x.name, x.dose, x.freq].filter(Boolean).join(" · ")}${x.refillBy ? ` · refill by ${fmt(x.refillBy)}` : ""}</li>`).join("")}</ul>` : `<div style="color:${P.muted};font-size:${F.body}">None recorded</div>`)}
  ${sec("Latest readings (with source document)", readingRows ? `<table style="width:100%;border-collapse:collapse;font-size:${F.table}"><tr style="background:${P.band}"><th style="text-align:left;padding:5px 10px;font-size:${F.note};color:${P.muted}">Metric</th><th style="text-align:left;padding:5px 10px;font-size:${F.note};color:${P.muted}">Value</th><th style="text-align:left;padding:5px 10px;font-size:${F.note};color:${P.muted}">Date</th><th style="text-align:left;padding:5px 10px;font-size:${F.note};color:${P.muted}">Source</th></tr>${readingRows}</table>` : `<div style="color:${P.muted};font-size:${F.body}">No readings tracked</div>`)}
  ${sec(`Documents in this pack (${included.length})`, included.length ? `<ol style="margin:0;padding-left:18px;line-height:1.7;font-size:${F.body}">${included.map((d) => `<li>${d.docType} · ${d.name} · ${fmt(d.docDate || d.addedAt)}</li>`).join("")}</ol>` : `<div style="color:${P.muted};font-size:${F.body}">None selected</div>`)}
  <p style="margin-top:20px;font-size:${F.note};color:${P.muted};border-top:1px solid ${P.band};padding-top:9px">Assembled from ${m.name.split(" ")[0]}'s own records on ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}. Facts only — no diagnosis, no medical advice.</p>
  </div>`;
}

function VisitPrep({ appts, member, care, meds, vitals, records, docs, onView, toast, onClose }: any) {
  /* Every doctor, hospital and specialisation this member's own records name. */
  const targets: VisitTarget[] = useMemo(() => visitTargets(docs, member.id), [docs, member.id]);
  const nextAppt = appts[0];
  /* "I am seeing Dr Rao on Thursday" is how people think about a visit, so open on the doctor the
     next appointment names when it names one, and otherwise on the most recent doctor. */
  const [chosen, setChosen] = useState(() => {
    const title = (appts[0]?.title || "").toLowerCase();
    const named = targets.findIndex((t) => t.kind === "doctor" && title.includes((t.value || "").toLowerCase()));
    return named >= 0 ? named : 0;
  });
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [extra, setExtra] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState("");
  const cur = targets[chosen] || targets[targets.length - 1];
  const curLabel = targetLabel(cur);
  const suggested: Doc[] = useMemo(() => selectVisitDocs(docs, member.id, cur), [docs, member.id, cur]);
  /* Everything this person has, suggested first. A visit to someone new matches no filter, and
     the pack has to be buildable by hand. */
  const packDocs: Doc[] = useMemo(() => {
    const ids = new Set(suggested.map((d) => d.id));
    const rest = docs
      .filter((d: Doc) => d.memberId === member.id && d.category === "Medical" && !ids.has(d.id))
      .sort((a: Doc, b: Doc) => (b.docDate || b.addedAt).localeCompare(a.docDate || a.addedAt));
    return [...suggested, ...rest];
  }, [suggested, docs, member.id]);
  const suggestedIds = useMemo(() => new Set(suggested.map((d) => d.id)), [suggested]);
  /* Only the suggested ones start ticked; anything else is opt-in. */
  const included = packDocs.filter((d) => (suggestedIds.has(d.id) ? !excluded.has(d.id) : extra.has(d.id)));
  /* Which readings a visit cares about, taken from the specialisation on the matching records. */
  const GROUP_LABEL: Record<string, string> = {
    doctor: "Doctors",
    hospital: "Hospitals and labs",
    specialisation: "Specialisations",
    general: "Everything recent",
  };
  const toggle = (id: string) =>
    setExcluded((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const pick = (i: number) => {
    setChosen(i);
    setExcluded(new Set());
  };
  const coverHTML = () => buildVisitCover(member, care, meds, vitals, records, included, curLabel);
  const previewCover = () => {
    const b = new Blob([coverHTML()], { type: "text/html" });
    window.open(URL.createObjectURL(b), "_blank");
  };
  const download = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await buildZip(`Visit_${member.name.split(" ")[0]}_${curLabel.replace(/[^A-Za-z0-9]+/g, "_")}`, included, [
        { name: "99_ReadiNes_Cover_Sheet.html", content: coverHTML() },
      ]);
      /* The originals are the point of the download, so say exactly how many made it and never
         report success for a pack that carries none. */
      if (res.added === 0)
        toast(
          included.length
            ? "No document files could be read. The pack was not usable, so nothing was sent."
            : "Nothing to pack: no documents are selected.",
        );
      else if (res.missing.length)
        toast(`Downloaded ${res.added} document${res.added === 1 ? "" : "s"} · ${res.missing.length} could not be read`);
      else toast(`Downloaded ${res.added} original document${res.added === 1 ? "" : "s"}`);
      if (res.added > 0) onClose();
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
        initial={isMobileView() ? { y: 40, opacity: 0 } : { scale: 0.96, opacity: 0 }}
        animate={isMobileView() ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.24, ease: [0.2, 0.9, 0.3, 1.08] }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div className="lh-eyebrow" style={{ marginBottom: 4 }}>
              Your own records, filtered for this visit
            </div>
            <h3 className="lh-h2" style={{ fontSize: "var(--text-heading-md-size)" }}>
              Prepare for a visit
            </h3>
          </div>
          <button className="lh-x" onClick={onClose} title="Close" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {picking ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => setPicking(false)}
                className="lh-x"
                title="Back" aria-label="Back"
                style={{ flexShrink: 0 }}
              >
                <ChevronRight size={15} style={{ transform: "rotate(180deg)" }} />
              </button>
              <input
                className="lh-in"
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search doctors, specialisations, hospitals"
              />
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: "var(--surface-radius)" }}>
              {(["doctor", "specialisation", "hospital", "general"] as const).map((kind) => {
                const group = targets
                  .map((t, i) => ({ t, i }))
                  .filter(
                    ({ t }) =>
                      t.kind === kind && (!q.trim() || targetLabel(t).toLowerCase().includes(q.trim().toLowerCase())),
                  );
                if (!group.length) return null;
                return (
                  <div key={kind}>
                    <div
                      style={{
                        fontSize: "var(--text-caption-md-size)",
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                        color: C.faint,
                        padding: "12px 16px 8px",
                        background: C.panel2,
                      }}
                    >
                      {GROUP_LABEL[kind]}
                    </div>
                    {group.map(({ t, i }) => {
                      const count = selectVisitDocs(docs, member.id, t).length;
                      return (
                        <button
                          key={t.kind + (t.value || "")}
                          onClick={() => {
                            pick(i);
                            setPicking(false);
                            setQ("");
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            width: "100%",
                            minHeight: 48,
                            padding: "12px 16px",
                            background: "none",
                            border: "none",
                            borderTop: `1px solid ${C.border}`,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span style={{ flex: 1, minWidth: 0, fontSize: "var(--text-body-md-size)", color: C.text, fontWeight: chosen === i ? 700 : 500 }}>
                            {targetLabel(t)}
                          </span>
                          <span style={{ fontSize: "var(--text-caption-md-size)", color: C.sub, whiteSpace: "nowrap" }}>
                            {count} doc{count === 1 ? "" : "s"}
                          </span>
                          {chosen === i && <Check size={15} color={C.action} />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              {targets.filter((t) => !q.trim() || targetLabel(t).toLowerCase().includes(q.trim().toLowerCase())).length === 0 && (
                <div style={{ padding: 20, fontSize: "var(--text-body-md-size)", color: C.faint }}>Nothing matches that.</div>
              )}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setPicking(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                minHeight: 52,
                padding: "12px 16px",
                marginBottom: 12,
                borderRadius: "var(--surface-radius)",
                border: `1px solid ${C.border}`,
                background: C.panel2,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ flex: 1, minWidth: 0, fontSize: "var(--text-body-lg-size)", fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {curLabel}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  flexShrink: 0,
                  padding: "8px 12px",
                  borderRadius: "var(--surface-radius)",
                  background: al(C.action, 0.12),
                  color: C.action,
                  fontSize: "var(--text-body-md-size)",
                  fontWeight: 700,
                }}
              >
                Change <ChevronRight size={14} />
              </span>
            </button>
          </>
        )}
        {!picking && (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: "var(--surface-radius)" }}>
          {packDocs.length === 0 ? (
            <div style={{ padding: 20, fontSize: "var(--text-body-md-size)", color: C.faint }}>
              No records yet. The cover sheet still travels.
            </div>
          ) : (
            packDocs.map((d, i) => {
              const K = KIND[d.medType || "other"] || KIND.other;
              const Ic = d.docType === "Health Insurance" ? ShieldCheck : K.icon;
              const c = d.docType === "Health Insurance" ? C.emerald : K.c;
              const isSuggested = suggestedIds.has(d.id);
              const on = isSuggested ? !excluded.has(d.id) : extra.has(d.id);
              const firstOther = !isSuggested && suggestedIds.has(packDocs[i - 1]?.id);
              return (
                <div key={d.id}>
                {firstOther && (
                  <div
                    style={{
                      fontSize: "var(--text-caption-md-size)",
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                      color: C.faint,
                      padding: "12px 16px 8px",
                      borderTop: `1px solid ${C.border}`,
                      background: C.panel2,
                    }}
                  >
                    Anything else on file
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderTop: i && !firstOther ? `1px solid ${C.border}` : "none",
                    opacity: on ? 1 : 0.45,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      isSuggested
                        ? toggle(d.id)
                        : setExtra((prev) => {
                            const next = new Set(prev);
                            next.has(d.id) ? next.delete(d.id) : next.add(d.id);
                            return next;
                          })
                    }
                    style={{ accentColor: C.action, cursor: "pointer", flexShrink: 0 }}
                  />
                  <span className="lh-ic" style={{ background: al(c, 0.13) }}>
                    <Ic size={15} color={c} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "var(--text-body-lg-size)", fontWeight: 500, color: C.text }}>{d.docType}</div>
                    <div
                      style={{
                        fontSize: "var(--text-caption-md-size)",
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
                </div>
              );
            })
          )}
        </div>
        )}
        {!picking && (
        <button className="lh-lnk" style={{ marginTop: 12, fontSize: "var(--text-caption-md-size)" }} onClick={previewCover}>
          Preview cover sheet
        </button>
        )}
        {!picking && (
        <button
          className="lh-btn"
          style={{ width: "100%", justifyContent: "center", marginTop: 12, opacity: busy ? 0.45 : 1 }}
          disabled={busy}
          onClick={download}
        >
          <Download size={16} /> {busy ? "Preparing…" : "Download"}
        </button>
        )}
      </motion.div>
    </div>
  );
}

/* ── printable docs (assembled from the archive) ── */
function insuranceOf(member: Member | undefined, docs: Doc[]) {
  return docs.find((d) => d.docType === "Health Insurance" && (d.memberId === member?.id || d.memberId === "you"));
}
function buildEmergency(m: Member | undefined, care: any, meds: Medication[], docs: Doc[]) {
  // Standalone printable document: it leaves the app, so it carries the light-theme values inline.
  const P = { ink: "#1B1626", muted: "#5D5869", danger: "#C62F38", band: "#EEEFF5", paper: "#FFFFFF", onDanger: "#FFFFFF" }; /* token-source */
  const F = { title: "18px", name: "15px", h3: "13.5px", body: "13px", table: "12.5px", note: "12px" };
  if (!m) return "";
  const ins = insuranceOf(m, docs);
  const medDocs = docs.filter((d) => d.category === "Medical" && d.memberId === m.id).length;
  const row = (a: string, b: string, warn?: boolean) =>
    `<tr><td style="padding:7px 12px;color:${P.muted};font-size:${F.note};width:140px">${a}</td><td style="padding:7px 12px;font-weight:700;font-size:${F.h3};color:${warn ? "${P.danger}" : "${P.ink}"}">${b}</td></tr>`;
  return `<div style="max-width:460px;margin:0 auto;background:${P.paper};border-radius:${F.note};overflow:hidden;border:1px solid ${P.band}">
  <div style="background:${P.danger};color:${P.onDanger};padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
    <div style="font-weight:700;font-size:${F.name};letter-spacing:1px">EMERGENCY INFO</div><div style="font-size:${F.note};opacity:.9">ReadiNes</div>
  </div>
  <div style="padding:6px 4px"><table style="width:100%;border-collapse:collapse">
    ${row("Name", m.name)}
    ${row("Blood group", m.bloodGroup || "—")}
    ${row("Critical allergies", care.allergies?.trim() || (care.noKnownAllergies ? "No known allergies" : "NOT ANSWERED"))}
    ${row("Conditions", (care.conditions || []).join(", ") || (care.noConditions ? "None" : "NOT ANSWERED"))}
    ${row("Current meds", meds.map((x: Medication) => `${x.name} ${x.dose}`).join(", ") || "None")}
    ${row("Primary physician", care.doctor || "—")}
    ${row("Preferred hospital", care.hospital || "—")}
    ${row("Emergency contact", emergencyLine(care) || "—")}
    ${row("Insurance", ins ? ins.name : "—")}
    ${row("Medical documents", `${medDocs} on file in ReadiNes`)}
  </table></div>
  <div style="padding:10px 16px;background:${P.band};color:${P.muted};font-size:${F.note};border-top:1px solid ${P.band};display:flex;justify-content:space-between"><span>Assembled facts only · no diagnosis.</span><span>Generated ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span></div>
  </div>`;
}

/* ── styles ── */
const CSS = () => `
.lh-root{font-variant-numeric:tabular-nums;color:${C.text}}
.lh-root *{box-sizing:border-box}
.lh-head{margin-bottom:18px}
.lh-eyebrow{font-size:var(--text-caption-md-size);font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:${C.gold};margin-bottom:8px}
.lh-h1{letter-spacing:-0.015em;font-weight:700;font-size:var(--text-display-md-size);letter-spacing:-.5px;margin:0;color:${C.text}}
.lh-h2{letter-spacing:-0.015em;font-weight:700;margin:0;color:${C.text}}
.lh-card{background:${C.panel};border:1px solid ${C.border};border-radius:var(--tile-radius)}
.lh-switch{display:flex;align-items:center;gap:16px;overflow-x:auto;padding:2px 2px 16px}
.lh-mm{display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:0;cursor:pointer;flex-shrink:0;padding:0}
.lh-av{position:relative;width:42px;height:42px;border-radius:var(--surface-radius);display:grid;place-items:center;font-weight:700;font-size:var(--text-heading-sm-size);border:2px solid transparent;letter-spacing:-0.015em;transition:.15s}
.lh-mm.on .lh-av{transform:translateY(-1px)}
.lh-av.lg{width:52px;height:52px;font-size:var(--text-heading-lg-size)}
.lh-dot{position:absolute;top:-2px;right:-2px;width:11px;height:11px;border-radius:var(--control-radius);border:2px solid var(--lpv-panel)}
.lh-nm{font-size:var(--text-body-sm-size);font-weight:500;white-space:nowrap}
.lh-addm .lh-av{background:${C.panel2}}
.lh-famline{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:0 2px;margin-bottom:2px}
.lh-famtitle{display:inline-flex;align-items:center;gap:8px;font-size:var(--text-body-md-size);font-weight:500;color:${C.text}}
.lh-famsum{font-size:var(--text-body-sm-size);color:${C.sub};white-space:nowrap}
.lh-hero{background:linear-gradient(180deg,${al(C.action, 0.05)},${C.panel});border:1px solid ${C.border};border-radius:var(--tile-radius);padding:18px;margin-bottom:20px}
.lh-herotop{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.lh-heronext{display:flex;align-items:center;gap:9px;margin-top:16px;padding-top:14px;border-top:1px solid ${C.border}}
.lh-herometa{font-size:var(--text-body-sm-size);color:${C.sub};margin-top:8px;line-height:1.5}
.lh-headrow{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.lh-pillm{display:inline-flex;align-items:center;gap:8px;font-size:var(--text-body-sm-size);font-weight:500;color:${C.sub};background:${C.panel2};border:1px solid ${C.border};border-radius:var(--overlay-radius);padding:7px 14px;cursor:pointer;font:inherit;flex-shrink:0}
.lh-pillm.on{color:${C.text};border-color:${al(C.action, 0.4)};background:${al(C.action, 0.08)}}
.lh-cdot{width:8px;height:8px;border-radius:var(--control-radius);flex-shrink:0}
.lh-attndot{width:6px;height:6px;border-radius:var(--control-radius);background:${C.warning}}
.lh-addpill{border-style:dashed}
.lh-vitals{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:14px}
.lh-attnrow{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}
.lh-chip{display:inline-flex;align-items:center;gap:7px;font-size:var(--text-body-sm-size);color:${C.sub};background:${C.panel2};border:1px solid ${C.border};border-radius:var(--overlay-radius);padding:6px 12px;cursor:pointer;font:inherit}
.lh-chip:hover{background:var(--lpv-raised)}
.lh-mhead{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:16px}
.lh-btn{display:inline-flex;align-items:center;gap:7px;background:${C.action};color:var(--lpv-actionink);font-weight:500;font-size:var(--text-body-md-size);border:0;border-radius:var(--surface-radius);padding:10px 16px;min-height:44px;cursor:pointer;font:inherit;transition:.15s}
.lh-btn:hover{filter:brightness(1.06)}.lh-btn:disabled{opacity:.4;cursor:not-allowed}
.lh-btn-g{display:inline-flex;align-items:center;gap:7px;background:${C.panel2};color:${C.text};font-weight:500;font-size:var(--text-body-md-size);border:1px solid ${C.border};border-radius:var(--surface-radius);padding:10px 14px;min-height:44px;cursor:pointer;font:inherit}
.lh-btn-g:hover{background:var(--lpv-raised)}
.lh-tabs{display:flex;gap:6px;border-bottom:1px solid ${C.border};margin-bottom:18px;overflow-x:auto;scrollbar-width:none}
.lh-tabs::-webkit-scrollbar{display:none}
.lh-tab{display:inline-flex;align-items:center;gap:7px;background:none;border:0;border-bottom:2px solid transparent;color:${C.sub};font-size:var(--text-body-md-size);font-weight:500;padding:10px 12px;cursor:pointer;font:inherit;white-space:nowrap;margin-bottom:-1px}
.lh-tab.on{color:${C.text};border-bottom-color:${C.action}}
.lh-tc{font-size:var(--text-caption-md-size);background:${C.panel2};border-radius:var(--control-radius);padding:1px 6px;color:${C.sub}}
.lh-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.lh-grid-2-1{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px}
.lh-sechead{display:flex;align-items:center;gap:8px;font-size:var(--text-body-md-size);font-weight:700;color:${C.text};margin-bottom:12px}
.lh-mini{margin-left:auto;display:inline-flex;align-items:center;gap:4px;font-size:var(--text-body-sm-size);font-weight:500;color:${C.gold};background:${al(C.gold, 0.09)};border:1px solid ${al(C.gold, 0.2)};border-radius:var(--control-radius);padding:4px 9px;cursor:pointer;font:inherit}
.lh-row{display:flex;align-items:center;gap:11px;padding:9px 0;border-top:1px solid ${C.border}}
.lh-row:first-of-type{border-top:0}
.lh-ic{width:32px;height:32px;border-radius:var(--control-radius);display:grid;place-items:center;flex-shrink:0}
.lh-ib{width:28px;height:28px;border-radius:var(--control-radius);display:grid;place-items:center;border:1px solid ${C.border};background:transparent;cursor:pointer;flex-shrink:0}
.lh-ib:hover{background:var(--lpv-raised)}
.lh-tag{font-size:var(--text-caption-md-size);font-weight:500;padding:2px 7px;border-radius:var(--overlay-radius)}
.lh-info{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid ${C.border}}
.lh-info:first-of-type{border-top:0}
.lh-med{padding:12px 0;border-top:1px solid ${C.border}}
.lh-med:first-of-type{border-top:0}
.lh-adhere{display:flex;align-items:center;gap:12px;margin-top:9px;padding-left:43px;flex-wrap:wrap}
.lh-take{display:inline-flex;align-items:center;gap:5px;font-size:var(--text-body-sm-size);font-weight:500;color:${C.emerald};background:${al(C.emerald, 0.09)};border:1px solid ${al(C.emerald, 0.2)};border-radius:var(--control-radius);padding:5px 10px;cursor:pointer;font:inherit}
.lh-taken{display:inline-flex;align-items:center;gap:5px;font-size:var(--text-body-sm-size);font-weight:500;color:${C.emerald}}
.lh-lnk{display:inline-flex;align-items:center;gap:5px;font-size:var(--text-body-sm-size);color:${C.sub};background:none;border:0;cursor:pointer;font:inherit}
.lh-lnk:hover{color:${C.text}}
.lh-uprow{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.lh-up{display:inline-flex;align-items:center;gap:8px;font-size:var(--text-body-sm-size);font-weight:500;color:${C.text};background:${C.panel2};border:1px solid ${C.border};border-radius:var(--surface-radius);padding:11px 15px;cursor:pointer;font:inherit}
.lh-up:hover{background:var(--lpv-raised);border-color:${al(C.action, 0.33)}}
.lh-rec{position:relative;display:flex;align-items:center;gap:11px;padding:9px 0;border-top:1px solid ${C.border}}
.lh-rec:first-of-type{border-top:0}
.lh-tl{position:relative;padding-left:20px}
.lh-tl:before{content:"";position:absolute;left:5px;top:24px;bottom:8px;width:1px;background:${C.border}}
.lh-tlmon{font-size:var(--text-caption-md-size);font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:${C.gold};margin:14px 0 6px}
.lh-tlrow{position:relative;display:flex;align-items:center;gap:11px;padding:8px 0}
.lh-tldot{position:absolute;left:-15px;top:18px;width:9px;height:9px;border-radius:var(--control-radius)}
.lh-lbl{font-size:var(--text-caption-md-size);font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:${C.faint};margin-bottom:5px}
.lh-in{width:100%;background:${C.panel2};border:1px solid ${C.border};border-radius:var(--control-radius);padding:11px;min-height:44px;color:${C.text};font-size:var(--text-body-lg-size);outline:none;font:inherit}
.lh-in:focus{border-color:${C.action}}
.lh-overlay{position:fixed;inset:0;z-index:72;background:var(--lpv-scrim);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:18px;overscroll-behavior:contain}
.lh-modal{background:var(--lpv-panel);border:1px solid ${C.border};border-radius:var(--tile-radius);width:min(460px,100%);padding:22px;max-height:90vh;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
@media(max-width:767px){
.lh-overlay{align-items:flex-end;padding:0}
.lh-modal{width:100% !important;max-width:100% !important;max-height:88vh;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;border-radius:var(--overlay-radius) var(--overlay-radius) 0 0;border-bottom:0;padding:16px 16px calc(20px + env(safe-area-inset-bottom))}
.lh-modal::before{content:"";display:block;width:38px;height:4px;border-radius:var(--pill-radius);background:${C.border};margin:0 auto 14px}
}
.lh-preview{background:${C.panel2};border-radius:var(--control-radius);padding:10px}
.lh-x{width:44px;height:44px;border-radius:var(--control-radius);border:1px solid ${C.border};background:${C.panel2};color:${C.text};cursor:pointer;display:grid;place-items:center}
.lh-pick{display:flex;flex-wrap:wrap;gap:6px}
.lh-pk{font-size:var(--text-body-sm-size);font-weight:500;color:${C.sub};background:${C.panel2};border:1px solid ${C.border};border-radius:var(--control-radius);padding:6px 10px;cursor:pointer;font:inherit}
.lh-pk.on{color:var(--lpv-actionink);background:${C.action};border-color:${C.action}}
.lh-cond{display:inline-flex;align-items:center;gap:5px;font-size:var(--text-body-sm-size);color:${C.text};background:${C.panel2};border:1px solid ${C.border};border-radius:var(--overlay-radius);padding:4px 10px}
.lh-cond button{background:0;border:0;color:${C.faint};cursor:pointer;display:inline-flex}
.lh-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:80;background:var(--lpv-panel);border:1px solid ${C.border};color:${C.text};padding:12px 20px;border-radius:var(--surface-radius);font-size:var(--text-body-md-size);font-weight:500;display:flex;align-items:center;gap:10px;box-shadow:var(--elevation-overlay)}
.lh-pbar{display:flex;align-items:center;gap:13px;flex-wrap:wrap;margin-bottom:14px;padding:2px}
.lh-actcard{margin-bottom:16px;padding:0}
.lh-actrow{display:flex;align-items:center;gap:11px;border-top:1px solid ${C.border};padding:10px 16px;cursor:pointer}
.lh-actrow:hover{background:var(--lpv-raised)}
.lh-famgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:10px;margin-bottom:18px}
.lh-famcard{display:flex;align-items:center;gap:10px;text-align:left;background:${C.panel};border:1px solid ${C.border};border-radius:var(--surface-radius);padding:11px 12px;cursor:pointer;font:inherit;transition:.15s}
.lh-famcard:hover{background:${C.panel2}}
.lh-famcard.on{border-color:${al(C.action, 0.47)};background:${C.panel}}
.lh-swrail{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:10px 0 12px;margin:0 -2px}
.lh-swrail::-webkit-scrollbar{display:none}
.lh-sw{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:60px;min-height:66px;background:none;border:none;padding:2px;cursor:pointer;font:inherit}
.lh-swav{width:40px;height:40px;border-radius:var(--pill-radius);display:grid;place-items:center;font-weight:700;font-size:var(--text-body-md-size);border:2px solid transparent}
.lh-swnm{font-size:var(--text-caption-md-size);font-weight:500;max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lh-famav{width:36px;height:36px;border-radius:var(--surface-radius);display:grid;place-items:center;font-weight:700;font-size:var(--text-body-md-size);letter-spacing:-0.015em;flex-shrink:0}
.lh-famnm{display:block;font-size:var(--text-body-sm-size);font-weight:700;color:${C.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lh-famst{display:block;font-size:var(--text-caption-md-size);font-weight:500;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#lh-print{display:none}
@media(max-width:900px){.lh-grid3{grid-template-columns:minmax(0,1fr)}.lh-grid-2-1{grid-template-columns:minmax(0,1fr)}.lh-vgrid{grid-template-columns:minmax(0,1fr)}}
@media(max-width:767px){
.lh-pbar{row-gap:10px}
.lh-pbar>div{min-width:calc(100% - 58px) !important}
.lh-pbar>div>div{row-gap:2px}
.lh-pbar .lh-btn-g{flex:1 1 45%;justify-content:center;min-height:44px}
.lh-root input,.lh-root select,.lh-root textarea{min-width:0}
.lh-h2{font-size:var(--text-body-lg-size) !important;letter-spacing:-0.015em}
.lh-tab{font-size:var(--text-body-sm-size);padding:9px 8px;gap:0}
.lh-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:14px 0 4px}
.lh-act{display:flex;align-items:center;gap:9px;min-height:52px;padding:10px 12px;border-radius:var(--surface-radius);border:1px solid ${C.border};background:${C.panel2};color:${C.text};font-size:var(--text-body-sm-size);font-weight:500;font:inherit;cursor:pointer;text-align:left}
.lh-act span{min-width:0;overflow:hidden;text-overflow:ellipsis}
.lh-act-on{background:${C.action};border-color:${C.action};color:var(--color-text-on-brand)}
.lh-act-wide{grid-column:1 / -1;min-height:56px;font-size:var(--text-body-md-size)}
.lh-tabs{position:sticky;top:env(safe-area-inset-top,0px);z-index:30;background:var(--lpv-bg);margin:0 -14px 14px;padding:6px 14px 0}
.lh-tab>svg{display:none}
.lh-pane .lh-card{padding:14px !important}
.lh-sechead-tab{display:none}
.lh-tlrow{padding:7px 0}
.lh-tlmon{margin:10px 0 4px}
.lh-rec{padding:8px 0}
.lh-med{padding:10px 0}
}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
@media print{body *{visibility:hidden}#lh-print,#lh-print *{visibility:visible}#lh-print{display:block;position:absolute;inset:0}}
`;
