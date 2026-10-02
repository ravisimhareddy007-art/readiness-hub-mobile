import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText } from "lucide-react";
import { ThemeProvider, tokens, typeStyle, useTheme, type Role, type Theme, type TypeName } from "@/lib/tokens";
import { Button, Chart, Field, Input, Progress, Row, RowGroup, Screen, ScreenTitle, Section, Sheet, Stat } from "@/ui";

export const Route = createFileRoute("/design")({
  head: () => ({
    meta: [
      { title: "Design system — ReadiNes" },
      { name: "description", content: "Every ReadiNes interface primitive in every state, in dark and light." },
      { property: "og:title", content: "Design system — ReadiNes" },
      { property: "og:description", content: "Every ReadiNes interface primitive in every state, in dark and light." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DesignPage,
});

const S = tokens.space;
const noop = () => {};

function DesignPage() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap" }}>
      {(["dark", "light"] as Theme[]).map((th) => (
        <div key={th} style={{ flex: "1 1 360px", minWidth: 0 }}>
          <ThemeProvider theme={th}><Gallery /></ThemeProvider>
        </div>
      ))}
    </div>
  );
}

function Swatch({ role }: { role: Role }) {
  const { t } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: S.sm, minWidth: 0 }}>
      <span style={{ width: S.xxl, height: S.xxl, flexShrink: 0, borderRadius: tokens.radius.box, background: t(role), border: `1px solid ${t("border")}` }} />
      <span style={{ ...typeStyle("secondary"), color: t("textBody"), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{role}</span>
    </div>
  );
}

function Gallery() {
  const { theme, t } = useTheme();
  const [text, setText] = useState("Passport");
  const [num, setNum] = useState("1200");
  const [date, setDate] = useState("2027-03-15");
  const [time, setTime] = useState("09:00");
  const [note, setNote] = useState("");
  const [sel, setSel] = useState("INR");
  const [on, setOn] = useState(true);
  const [choice, setChoice] = useState("Monthly");
  const icon = <FileText size={S.xl} />;
  const series = [
    { label: "Jan", value: 5.4 }, { label: "Feb", value: 5.9 }, { label: "Mar", value: 6.1 },
    { label: "Apr", value: 5.7 }, { label: "May", value: 6.4 }, { label: "Jun", value: 6.0 },
  ];
  return (
    <Screen tabBar={false}>
      <ScreenTitle sub={`${theme} theme`}>Design system</ScreenTitle>

      <Section title="Type">
        {(Object.keys(tokens.type) as TypeName[]).map((n) => (
          <div key={n} style={{ ...typeStyle(n), color: t("textPrimary"), marginBottom: S.sm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {n} · {tokens.type[n].size}
          </div>
        ))}
      </Section>

      <Section title="Colour roles">
        <div style={{ display: "flex", flexDirection: "column", gap: S.sm }}>
          {(Object.keys(tokens.color) as Role[]).map((r) => <Swatch key={r} role={r} />)}
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
        {(["primary", "secondary", "ghost", "danger"] as const).map((v) => (
          <div key={v} style={{ display: "flex", flexDirection: "column", gap: S.sm, marginBottom: S.lg }}>
            <Button variant={v} size="lg">Save {v}</Button>
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
        <div style={{ display: "flex", flexDirection: "column", gap: S.lg }}>
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
