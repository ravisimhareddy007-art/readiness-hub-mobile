import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Screen, ScreenTitle, Section, Row, RowGroup, Input, Button, Sheet } from "@/ui";
import DocViewer from "@/components/DocViewer";
import { DocContextPanel } from "@/App";
import type { Doc, Holding, Member } from "@/lib/types";

/* The floating add button lives in App and asks this screen to open its add sheet. */
export const ADD_DOCS_EVENT = "readines:add-docs";

const daysTo = (s: string) => Math.ceil((+new Date(s) - Date.now()) / 86400000);
const fdate = (s?: string) =>
  s ? new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

const FILTERS = { All: "all", Expiring: "expiring", Expired: "expired", "This week": "recent", Proofs: "proofs" } as const;
const SORTS = { Newest: "newest", Oldest: "oldest", Name: "name", Expiry: "expiry" } as const;
type Quick = (typeof FILTERS)[keyof typeof FILTERS];
type Sort = (typeof SORTS)[keyof typeof SORTS];
const labelOf = <T extends Record<string, string>>(m: T, v: string) => Object.keys(m).find((k) => m[k] === v)!;

export default function Documents({ store, toast, go }: any) {
  const [q, setQ] = useState("");
  const [quick, setQuick] = useState<Quick>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [selMode, setSelMode] = useState(false);
  const [open, setOpen] = useState<Doc | null>(null);
  const [preview, setPreview] = useState<Doc | null>(null);
  const [addSheet, setAddSheet] = useState(false);
  const upRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = () => setAddSheet(true);
    window.addEventListener(ADD_DOCS_EVENT, h);
    return () => window.removeEventListener(ADD_DOCS_EVENT, h);
  }, []);

  const nameOf = (mid?: string) => store.members.find((m: Member) => m.id === mid)?.name || "Unassigned";
  const docs: Doc[] = store.docs;

  const filtered = useMemo(() => {
    let list = docs;
    if (quick === "expiring") list = list.filter((d) => d.expiry && daysTo(d.expiry) >= 0 && daysTo(d.expiry) < 60);
    if (quick === "expired") list = list.filter((d) => d.expiry && daysTo(d.expiry) < 0);
    if (quick === "recent") list = list.filter((d) => (Date.now() - +new Date(d.addedAt)) / 86400000 <= 7);
    if (quick === "proofs") list = list.filter((d) => d.docType === "Transaction Evidence");
    const needle = q.trim().toLowerCase();
    if (needle)
      list = list.filter((d) =>
        `${d.docType} ${d.name} ${d.category} ${nameOf(d.memberId)} ${d.source} ${d.notes || ""}`
          .toLowerCase()
          .includes(needle),
      );
    const by: Record<string, (a: Doc, b: Doc) => number> = {
      newest: (a, b) => +new Date(b.addedAt) - +new Date(a.addedAt),
      oldest: (a, b) => +new Date(a.addedAt) - +new Date(b.addedAt),
      name: (a, b) => a.docType.localeCompare(b.docType),
      expiry: (a, b) => (a.expiry ? +new Date(a.expiry) : Infinity) - (b.expiry ? +new Date(b.expiry) : Infinity),
    };
    return [...list].sort(by[sort]);
  }, [docs, quick, q, sort, store.members]);

  const groups = useMemo(() => {
    const m = new Map<string, Doc[]>();
    for (const d of filtered) {
      const k = nameOf(d.memberId);
      m.set(k, [...(m.get(k) || []), d]);
    }
    return [...m.entries()];
  }, [filtered, store.members]);

  const toggle = (id: string) =>
    setSel((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const clearSel = () => setSel(new Set());
  const bulkDelete = async () => {
    for (const id of sel) await store.removeDoc(id);
    toast(`${sel.size} document(s) removed`);
    clearSel();
  };
  const addAndToast = (files: FileList | null, msg: string) => {
    if (files?.length) {
      store.addFiles(files);
      toast(msg.replace("{n}", String(files.length)));
    }
  };
  const alertOf = (d: Doc) => {
    if (!d.expiry) return undefined;
    const n = daysTo(d.expiry);
    if (n < 0) return `Expired ${-n} day${n === -1 ? "" : "s"} ago`;
    if (n <= 60) return `Expires in ${n} day${n === 1 ? "" : "s"}`;
    return undefined;
  };
  const current = (d: Doc) => store.docs.find((x: Doc) => x.id === d.id) || d;

  return (
    <Screen fab>
      <ScreenTitle
        sub={filtered.length === docs.length ? `${docs.length} documents` : `${filtered.length} of ${docs.length}`}
        action={
          <Button variant="secondary" size="sm" onPress={() => { if (selMode) clearSel(); setSelMode((v) => !v); }}>
            {selMode ? "Done" : "Select"}
          </Button>
        }
      >
        Documents
      </ScreenTitle>

      {selMode && (
        <Section title={`${sel.size} selected`}>
          <Button variant="secondary" size="md" full onPress={clearSel}>Clear</Button>
          <Button variant="danger" size="md" full disabled={sel.size === 0} onPress={bulkDelete}>Delete selected</Button>
        </Section>
      )}

      <Section title="">
        <Input variant="text" value={q} onChange={setQ} placeholder="Name, type, person or issuer" />
        <Input
          variant="choice"
          value={labelOf(FILTERS, quick)}
          onChange={(v) => setQuick(FILTERS[v as keyof typeof FILTERS])}
          options={Object.keys(FILTERS)}
          trailing={
            <Button variant="secondary" size="sm" onPress={() => { const o = Object.values(SORTS); setSort(o[(o.indexOf(sort) + 1) % o.length]); }}>
              {labelOf(SORTS, sort)}
            </Button>
          }
        />
      </Section>

      {docs.length === 0 ? (
        <Section title="Nothing here yet">
          <Row title="No documents yet" meta="Add a passport, a policy or a payslip" />
          <Button variant="primary" size="lg" block onPress={() => setAddSheet(true)}>Add your first document</Button>
        </Section>
      ) : filtered.length === 0 ? (
        <Section title="No matches">
          <Button variant="secondary" size="md" full onPress={() => { setQuick("all"); setQ(""); }}>Clear filters</Button>
        </Section>
      ) : (
        groups.map(([who, list]) => (
          <Section key={who} title={who}>
            <RowGroup initial={list.length > 5 ? 3 : list.length}>
              {list.map((d) => (
                <Row
                  key={d.id}
                  leading={selMode && sel.has(d.id) ? <Check size={20} /> : undefined}
                  title={d.docType}
                  meta={[fdate(d.addedAt), d.source].filter(Boolean).join(" · ")}
                  alert={alertOf(d)}
                  chevron={!selMode}
                  onPress={() => (selMode ? toggle(d.id) : setPreview(d))}
                />
              ))}
            </RowGroup>
          </Section>
        ))
      )}

      <input ref={upRef} type="file" multiple hidden onChange={(e) => { addAndToast(e.target.files, "{n} document(s) added"); e.currentTarget.value = ""; setAddSheet(false); }} />
      <input ref={scanRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addAndToast(e.target.files, "Scan captured and classified"); e.currentTarget.value = ""; setAddSheet(false); }} />

      {addSheet && (
        <Sheet title="Add documents" onClose={() => setAddSheet(false)}>
          <Button variant="primary" size="lg" block onPress={() => upRef.current?.click()}>Upload files</Button>
          <Button variant="secondary" size="lg" block onPress={() => scanRef.current?.click()}>Scan with camera</Button>
        </Sheet>
      )}

      {open && (
        <DocContextPanel
          key={open.id}
          d={current(open)}
          store={store}
          toast={toast}
          onClose={() => setOpen(null)}
          onPreview={() => setPreview(current(open))}
          onDeleted={() => setOpen(null)}
        />
      )}
      {preview && (
        <DocViewer
          doc={preview}
          store={store}
          onClose={() => setPreview(null)}
          onAddToWealth={
            ["Finance", "Insurance", "Property"].includes(preview.category) &&
            !store.holdings.some((h: Holding) => h.docId === preview.id)
              ? () => {
                  setPreview(null);
                  store.setWealthIntent({ docId: preview.id });
                  go?.("wealth");
                }
              : undefined
          }
        />
      )}
    </Screen>
  );
}
