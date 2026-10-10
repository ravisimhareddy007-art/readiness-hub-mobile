import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { ThemeProvider, useTheme, type Theme } from "@/lib/theme";
import { Button, Chart, Field, Input, Progress, Row, RowGroup, Screen, ScreenTitle, Section, Sheet, Stat } from "@/ui";

export const Route = createFileRoute("/design")({
  head: () => ({
    meta: [
      { title: "Design system — ReadiNes" },
      { name: "description", content: "Every ReadiNes interface primitive in every state, in the device theme, switchable to dark or light." },
      { property: "og:title", content: "Design system — ReadiNes" },
      { property: "og:description", content: "Every ReadiNes interface primitive in every state, in the device theme, switchable to dark or light." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DesignPage,
});

const S = { sm: "var(--space-100)", lg: "var(--space-200)", xl: "var(--space-250)", xxl: "var(--space-300)" };
const noop = () => {};

const TYPE = ["t-display-lg", "t-display-md", "t-heading-xl", "t-heading-lg", "t-heading-md", "t-heading-sm", "t-heading-xs",
  "t-body-lg", "t-body-md", "t-body-sm", "t-label-lg", "t-label-md", "t-label-sm", "t-caption-md", "t-numeric-lg", "t-numeric-md"];
const COLOURS = ["color-surface-canvas", "color-surface-default", "color-surface-inset", "color-border-subtle",
  "color-text-primary", "color-text-secondary", "color-text-tertiary", "color-action-primary-default", "color-text-on-brand",
  "color-action-destructive-default", "color-status-success-icon", "color-status-warning-icon", "color-status-danger-icon",
  "color-status-info-icon", "color-chart-line", "color-chart-line-alt", "color-chart-grid", "color-chart-axis", "color-chart-fill"];

function DesignPage() {
  const [theme, setTheme] = useState<Theme | undefined>(undefined);
  return (
    <ThemeProvider theme={theme}><Gallery onToggle={(cur) => setTheme(cur === "dark" ? "light" : "dark")} /></ThemeProvider>
  );
}

/** Reads the live value from tokens.css so the label shows what the theme actually resolves to. */
function useComputed(name: string, dep: unknown) {
  const [val, setVal] = useState("");
  useEffect(() => { setVal(getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()); }, [name, dep]);
  return val;
}

function Swatch({ name, theme }: { name: string; theme: Theme }) {
  const val = useComputed(name, theme);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: S.sm, minWidth: 0 }}>
      <span style={{ width: S.xxl, height: S.xxl, flexShrink: 0, borderRadius: "var(--control-radius)", background: `var(--${name})`, boxShadow: "var(--elevation-raised)" }} />
      <span className="t-body-sm" style={{ color: "var(--color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name} · {val}</span>
    </div>
  );
}

function TypeSample({ cls, theme }: { cls: string; theme: Theme }) {
  const size = useComputed(`text-${cls.slice(2)}-size`, theme);
  return (
    <div className={cls} style={{ color: "var(--color-text-primary)", marginBottom: S.sm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {cls} · {size}
    </div>
  );
}

function Gallery({ onToggle }: { onToggle: (cur: Theme) => void }) {
  const { theme } = useTheme();
  const [text, setText] = useState("Passport");
  const [num, setNum] = useState("1200");
  const [date, setDate] = useState("2027-03-15");
  const [time, setTime] = useState("09:00");
  const [note, setNote] = useState("");
  const [sel, setSel] = useState("INR");
  const [on, setOn] = useState(true);
  const [choice, setChoice] = useState("Monthly");
  const icon = <FileText style={{ width: "var(--icon-size-md)", height: "var(--icon-size-md)" }} />;
  const series = [
    { label: "Jan", value: 5.4 }, { label: "Feb", value: 5.9 }, { label: "Mar", value: 6.1 },
    { label: "Apr", value: 5.7 }, { label: "May", value: 6.4 }, { label: "Jun", value: 6.0 },
  ];
  return (
    <Screen tabBar={false}>
      <ScreenTitle sub={`${theme} theme`}>Design system</ScreenTitle>

      <div style={{ marginTop: S.lg }}>
        <Button variant="secondary" onPress={() => onToggle(theme)}>Switch to {theme === "dark" ? "light" : "dark"}</Button>
      </div>

      <Section title="Type">
        {TYPE.map((n) => <TypeSample key={n} cls={n} theme={theme} />)}
      </Section>

      <Section title="Colour roles">
        <div style={{ display: "flex", flexDirection: "column", gap: S.sm }}>
          {COLOURS.map((r) => <Swatch key={r} name={r} theme={theme} />)}
        </div>
      </Section>

      <Section title="Row">
        <RowGroup initial={20}>
          <Row title="Title only" />
          <Row leading={icon} title="With leading" />
          <Row title="With meta" meta="Added 12 Mar 2026" />
          <Row title="With alert" meta="Passport" alert="Expires in 12 days" />
          <Row title="With value" value="₹1.5L" />
          <Row title="With action" action={{ label: "Add", onPress: noop }} />
          <Row title="With chevron" onPress={noop} chevron />
          <Row leading={icon} title="Everything" meta="HDFC Bank · •5671" alert="No nominee" value="₹60,000" action={{ label: "Fix", onPress: noop }} onPress={noop} chevron />
          <Row leading={icon} title="A deliberately very long title that must truncate rather than wrap onto a second line at any width" meta="And a meta line that is also far too long to fit comfortably on a narrow phone screen" value="₹1.2Cr" chevron />
        </RowGroup>
      </Section>

      <Section title="RowGroup · 2 items">
        <RowGroup>
          <Row title="Aadhaar Card" meta="Identity" />
          <Row title="PAN Card" meta="Identity" />
        </RowGroup>
      </Section>

      <Section title="RowGroup · 9 items">
        <RowGroup>
          {Array.from({ length: 9 }, (_, i) => <Row key={i} title={`Document ${i + 1}`} meta="Finance" chevron onPress={noop} />)}
        </RowGroup>
      </Section>

      <Section title="Button">
        {(["primary", "secondary", "danger"] as const).map((v) => (
          <div key={v} style={{ display: "flex", flexDirection: "column", gap: S.sm, marginBottom: S.lg }}>
            <Button variant={v} size="lg" block>Save {v}</Button>
            <div style={{ display: "flex", flexWrap: "wrap", gap: S.sm }}>
              <Button variant={v} size="md">Medium</Button>
              <Button variant={v} size="sm">Small</Button>
              <Button variant={v} size="md" disabled>Disabled</Button>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Input">
        <Input variant="text" label="Text" value={text} onChange={setText} />
        <Input variant="number" label="Number" value={num} onChange={setNum} />
        <Input variant="date" label="Date" value={date} onChange={setDate} />
        <Input variant="time" label="Time" value={time} onChange={setTime} />
        <Input variant="textarea" label="Textarea" value={note} onChange={setNote} placeholder="Notes" />
        <Input variant="select" label="Select" value={sel} onChange={setSel} options={["INR", "USD", "AED"]} />
        <Input variant="toggle" label="Toggle" value={on} onChange={setOn} />
        <Input variant="choice" label="Choice" value={choice} onChange={setChoice} options={["Once", "Weekly", "Monthly"]} />
      </Section>

      <Section title="Field">
        <Field label="Institution" value="Life Insurance Corporation" />
        <Field label="Renewal" value="15 Mar 2027" />
      </Section>

      <Section title="Sheet">
        <Sheet inline title="Edit holding" footer={<Button size="lg">Save holding</Button>}>
          <Field label="Value" value="₹25,00,000" />
          <Field label="Account" value="•5671" />
        </Sheet>
      </Section>

      <Section title="Stat">
        <div style={{ display: "flex", flexWrap: "wrap", gap: S.xxl }}>
          <Stat value="72" unit="of 100" label="Readiness" size="display" />
          <Stat value="₹1.5L" label="Owed to you" />
          <Stat value="6.4" unit="%" label="HbA1c" />
        </div>
      </Section>

      <Section title="Progress">
        <div style={{ display: "flex", flexDirection: "column", gap: S.xl }}>
          <Progress value={0} max={10} caption="0 of 10 ready" />
          <Progress value={5} max={10} caption="5 of 10 ready" />
          <Progress value={10} max={10} caption="10 of 10 ready" />
        </div>
      </Section>

      <Section title="Chart">
        <div style={{ display: "flex", flexDirection: "column", gap: S.lg }}>
          <Chart data={series} />
          <Chart data={series} type="bar" />
          <Chart data={[]} />
        </div>
      </Section>
    </Screen>
  );
}
