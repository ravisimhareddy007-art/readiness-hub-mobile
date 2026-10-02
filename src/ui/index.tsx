import { Children, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronRight, X } from "lucide-react";
import { tokens, typeStyle, useTheme } from "@/lib/tokens";

const S = tokens.space;
const R = tokens.radius;
const TAP = tokens.tap;
const LEADING = 38;
const LINE = 1;

const clip: CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 };

/* 1. Screen */
export function Screen({ children, tabBar = true }: { children: ReactNode; tabBar?: boolean }) {
  const { t } = useTheme();
  return (
    <div
      style={{
        background: t("canvas"),
        color: t("textBody"),
        fontFamily: tokens.font,
        overflowY: "auto",
        overflowX: "hidden",
        maxWidth: "100%",
        paddingTop: `calc(${S.lg}px + env(safe-area-inset-top))`,
        paddingLeft: `calc(${tokens.gutter}px + env(safe-area-inset-left))`,
        paddingRight: `calc(${tokens.gutter}px + env(safe-area-inset-right))`,
        paddingBottom: `calc(${tabBar ? TAP + S.xxxl + S.xxl : S.xxl}px + env(safe-area-inset-bottom))`,
      }}
    >
      {children}
    </div>
  );
}

/* 2. ScreenTitle */
export function ScreenTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  const { t } = useTheme();
  return (
    <div style={{ minWidth: 0 }}>
      <h1 style={{ ...typeStyle("display"), ...clip, color: t("textPrimary"), margin: 0 }}>{children}</h1>
      {sub && <div style={{ ...typeStyle("secondary"), ...clip, color: t("textSecondary"), marginTop: S.xs }}>{sub}</div>}
    </div>
  );
}

/* 3. Section */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useTheme();
  return (
    <section style={{ marginTop: S.xxl }}>
      <div style={{ ...typeStyle("label"), ...clip, textTransform: "uppercase", color: t("textSecondary"), marginBottom: S.sm }}>{title}</div>
      {children}
    </section>
  );
}

/* 4. Row — flexbox, never grid */
export function Row({
  leading, title, meta, alert, value, action, onPress, chevron,
}: {
  leading?: ReactNode; title: string; meta?: string; alert?: string; value?: string;
  action?: { label: string; onPress: () => void }; onPress?: () => void; chevron?: boolean;
}) {
  const { t } = useTheme();
  return (
    <div
      role={onPress ? "button" : undefined}
      tabIndex={onPress ? 0 : undefined}
      onClick={onPress}
      onKeyDown={(e) => { if (onPress && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onPress(); } }}
      style={{ display: "flex", alignItems: "center", gap: S.md, minHeight: TAP, paddingTop: S.md, paddingBottom: S.md, cursor: onPress ? "pointer" : undefined, minWidth: 0 }}
    >
      {leading && (
        <div style={{ width: LEADING, height: LEADING, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: R.round, background: t("surfaceSunken"), color: t("textSecondary"), overflow: "hidden" }}>
          {leading}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ ...typeStyle("body"), ...clip, color: t("textPrimary") }}>{title}</div>
        {meta && <div style={{ ...typeStyle("secondary"), ...clip, color: t("textSecondary") }}>{meta}</div>}
        {alert && <div style={{ ...typeStyle("secondary"), ...clip, color: t("attention") }}>{alert}</div>}
      </div>
      {value && <div style={{ ...typeStyle("body"), flexShrink: 0, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: t("money") }}>{value}</div>}
      {action && (
        <div style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <Button variant="secondary" size="sm" onPress={action.onPress}>{action.label}</Button>
        </div>
      )}
      {chevron && <ChevronRight size={S.xl} color={t("textMuted")} style={{ flexShrink: 0 }} />}
    </div>
  );
}

/* 5. RowGroup — owns disclosure */
export function RowGroup({ children, initial = 3 }: { children: ReactNode; initial?: number }) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  const items = Children.toArray(children);
  const shown = open ? items : items.slice(0, initial);
  const line = `${LINE}px solid ${t("border")}`;
  return (
    <div>
      {shown.map((child, i) => <div key={i} style={{ borderTop: i ? line : undefined }}>{child}</div>)}
      {items.length > initial && (
        <div style={{ borderTop: line }}>
          <Button variant="secondary" size="md" full onPress={() => setOpen(!open)}>
            {open ? "Show less" : `Show all ${items.length}`}
          </Button>
        </div>
      )}
    </div>
  );
}

/* 6. Field */
export function Field({ label, value }: { label: string; value: ReactNode }) {
  const { t } = useTheme();
  return (
    <div style={{ paddingTop: S.sm, paddingBottom: S.sm, minWidth: 0 }}>
      <div style={{ ...typeStyle("label"), ...clip, textTransform: "uppercase", color: t("textSecondary") }}>{label}</div>
      <div style={{ ...typeStyle("body"), color: t("textBody"), marginTop: S.xs, overflowWrap: "anywhere" }}>{value ?? "—"}</div>
    </div>
  );
}

/* 7. Input */
type InputProps =
  | { variant: "text" | "number" | "date" | "time" | "textarea"; label: string; value: string; onChange: (v: string) => void; placeholder?: string }
  | { variant: "select" | "choice"; label: string; value: string; onChange: (v: string) => void; options: string[] }
  | { variant: "toggle"; label: string; value: boolean; onChange: (v: boolean) => void };

export function Input(p: InputProps) {
  const { t } = useTheme();
  const control: CSSProperties = {
    ...typeStyle("body"),
    width: "100%", boxSizing: "border-box", minHeight: TAP,
    paddingLeft: S.md, paddingRight: S.md, paddingTop: S.sm, paddingBottom: S.sm,
    borderRadius: R.box, border: `${LINE}px solid ${t("border")}`,
    background: t("surface"), color: t("textPrimary"), outline: "none",
  };
  let body: ReactNode;
  if (p.variant === "toggle") {
    body = (
      <button type="button" role="switch" aria-checked={p.value} onClick={() => p.onChange(!p.value)}
        style={{ ...control, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
        <span style={{ ...clip }}>{p.value ? "On" : "Off"}</span>
        <span style={{ width: TAP, height: S.xxl, borderRadius: R.round, background: p.value ? t("action") : t("surfaceSunken"), display: "flex", alignItems: "center", justifyContent: p.value ? "flex-end" : "flex-start", padding: S.xs, boxSizing: "border-box", flexShrink: 0 }}>
          <span style={{ width: S.lg, height: S.lg, borderRadius: R.round, background: p.value ? t("actionInk") : t("textMuted") }} />
        </span>
      </button>
    );
  } else if (p.variant === "choice") {
    body = (
      <div role="radiogroup" style={{ display: "flex", gap: S.xs, padding: S.xs, borderRadius: R.box, background: t("surfaceSunken"), minWidth: 0 }}>
        {p.options.map((o) => {
          const on = o === p.value;
          return (
            <button key={o} type="button" role="radio" aria-checked={on} onClick={() => p.onChange(o)}
              style={{ ...typeStyle("secondary"), ...clip, flex: 1, minHeight: TAP - S.sm, border: "none", borderRadius: R.box, cursor: "pointer", background: on ? t("surface") : "transparent", color: on ? t("textPrimary") : t("textSecondary") }}>
              {o}
            </button>
          );
        })}
      </div>
    );
  } else if (p.variant === "select") {
    body = (
      <select value={p.value} onChange={(e) => p.onChange(e.target.value)} style={control}>
        {p.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  } else if (p.variant === "textarea") {
    body = <textarea value={p.value} placeholder={p.placeholder} onChange={(e) => p.onChange(e.target.value)} rows={3} style={{ ...control, resize: "vertical" }} />;
  } else {
    body = <input type={p.variant as string} value={p.value as string} placeholder={"placeholder" in p ? p.placeholder : undefined} onChange={(e) => p.onChange(e.target.value)}
      style={{ ...control, fontVariantNumeric: p.variant === "number" ? "tabular-nums" : undefined }} />;
  }
  return (
    <label style={{ display: "block", minWidth: 0, marginBottom: S.lg }}>
      <div style={{ ...typeStyle("label"), ...clip, textTransform: "uppercase", color: t("textSecondary"), marginBottom: S.sm }}>{p.label}</div>
      {body}
    </label>
  );
}

/* 8. Button — label states the action, never a count.
   Disabled removes the fill entirely: surfaceSunken, textMuted at half opacity,
   never a lighter tint of the enabled colour. */
const HEIGHT = { lg: 48, md: TAP, sm: 40 } as const;
const LABEL = { lg: 15, md: 14, sm: 13 } as const;

export function Button({
  children, variant = "primary", size = "md", onPress, disabled, full, block,
}: {
  children: ReactNode; variant?: "primary" | "secondary" | "danger"; size?: "lg" | "md" | "sm";
  onPress?: () => void; disabled?: boolean; full?: boolean; block?: boolean;
}) {
  const { t } = useTheme();
  const look: Record<string, CSSProperties> = {
    primary: { background: t("action"), color: t("actionInk"), border: `${LINE}px solid ${t("action")}` },
    secondary: { background: t("surfaceSunken"), color: t("textPrimary"), border: `${LINE}px solid ${t("border")}` },
    danger: { background: t("danger"), color: t("dangerInk"), border: `${LINE}px solid ${t("danger")}` },
  };
  const idle = disabled
    ? { background: t("surfaceSunken"), color: t("textMuted"), border: `${LINE}px solid ${t("surfaceSunken")}` }
    : look[variant];
  return (
    <button type="button" onClick={onPress} disabled={disabled}
      style={{
        ...typeStyle("secondary"), ...idle, ...clip,
        fontSize: LABEL[size], fontWeight: 500, lineHeight: 1.1,
        height: HEIGHT[size],
        width: full || (size === "lg" && block) ? "100%" : undefined, maxWidth: "100%",
        paddingLeft: S.lg, paddingRight: S.lg, borderRadius: R.box,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        position: "relative",
      }}>
      {children}
    </button>
  );
}

/* 9. Sheet — inline renders in place; otherwise a bottom sheet */
export function Sheet({
  title, children, footer, onClose, inline,
}: { title: string; children: ReactNode; footer?: ReactNode; onClose?: () => void; inline?: boolean }) {
  const { t } = useTheme();
  const panel = (
    <div style={{ background: t("surface"), color: t("textBody"), borderTopLeftRadius: R.box, borderTopRightRadius: R.box, borderRadius: inline ? R.box : undefined, border: `${LINE}px solid ${t("border")}`, display: "flex", flexDirection: "column", maxHeight: inline ? undefined : "88vh", width: "100%", boxSizing: "border-box", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "center", paddingTop: S.sm }}>
        <span style={{ width: S.xxxl + S.sm, height: S.xs, borderRadius: R.round, background: t("border") }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: S.sm, paddingLeft: S.lg, paddingRight: S.xs, minWidth: 0 }}>
        <div style={{ ...typeStyle("title"), ...clip, flex: 1, color: t("textPrimary") }}>{title}</div>
        <button type="button" aria-label="Close" onClick={onClose}
          style={{ width: TAP, height: TAP, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", color: t("textSecondary") }}>
          <X size={S.xl} />
        </button>
      </div>
      <div style={{ overflowY: "auto", paddingLeft: S.lg, paddingRight: S.lg, paddingBottom: S.lg }}>{children}</div>
      {footer && <div style={{ padding: S.lg, borderTop: `${LINE}px solid ${t("border")}` }}>{footer}</div>}
    </div>
  );
  if (inline) return panel;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", background: `color-mix(in srgb, ${t("canvas")} 70%, transparent)` }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", paddingBottom: "env(safe-area-inset-bottom)" }}>{panel}</div>
    </div>
  );
}

/* 10. Stat */
export function Stat({ value, unit, label, size = "title" }: { value: ReactNode; unit?: string; label?: string; size?: "title" | "display" }) {
  const { t } = useTheme();
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: S.xs, minWidth: 0 }}>
        <span style={{ ...typeStyle(size), ...clip, fontVariantNumeric: "tabular-nums", color: t("textPrimary") }}>{value}</span>
        {unit && <span style={{ ...typeStyle("secondary"), color: t("textSecondary") }}>{unit}</span>}
      </div>
      {label && <div style={{ ...typeStyle("secondary"), ...clip, color: t("textSecondary") }}>{label}</div>}
    </div>
  );
}

/* 11. Progress — linear, one colour, no rings */
export function Progress({ value, max, caption }: { value: number; max: number; caption?: string }) {
  const { t } = useTheme();
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div style={{ minWidth: 0 }}>
      <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}
        style={{ height: S.sm, borderRadius: R.round, background: t("surfaceSunken"), overflow: "hidden" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: t("action"), borderRadius: R.round }} />
      </div>
      {caption && <div style={{ ...typeStyle("secondary"), ...clip, color: t("textSecondary"), marginTop: S.xs }}>{caption}</div>}
    </div>
  );
}

/* 12. Chart — line or bar, single series, legible in both themes */
export function Chart({
  data, type = "line", height = 160, empty = "Nothing recorded yet",
}: { data: { label: string; value: number }[]; type?: "line" | "bar"; height?: number; empty?: string }) {
  const { t } = useTheme();
  if (!data.length)
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: R.box, border: `${LINE}px dashed ${t("chartGrid")}`, ...typeStyle("secondary"), color: t("chartAxis") }}>
        {empty}
      </div>
    );
  const W = 320, padL = S.xxxl, padB = S.xl, padT = S.sm, padR = S.sm;
  const ch = height - padB - padT, cw = W - padL - padR;
  const vals = data.map((d) => d.value);
  const lo = Math.min(0, ...vals), hi = Math.max(...vals, lo + 1);
  const y = (v: number) => padT + ch - ((v - lo) / (hi - lo)) * ch;
  const step = cw / Math.max(1, type === "bar" ? data.length : data.length - 1);
  const x = (i: number) => padL + (type === "bar" ? step * i + step / 2 : data.length === 1 ? cw / 2 : step * i);
  const ticks = [lo, (lo + hi) / 2, hi];
  const fmt = (n: number) => (Math.abs(n) >= 1000 ? `${Math.round(n / 100) / 10}k` : `${Math.round(n * 10) / 10}`);
  const axis = { fill: t("chartAxis"), fontSize: tokens.type.label.size, fontFamily: tokens.font };
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} preserveAspectRatio="none" style={{ display: "block" }}>
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={t("chartGrid")} strokeWidth={LINE} />
          <text x={padL - S.xs} y={y(v) + S.xs} textAnchor="end" {...axis}>{fmt(v)}</text>
        </g>
      ))}
      {type === "bar"
        ? data.map((d, i) => (
            <rect key={i} x={x(i) - step * 0.3} width={step * 0.6} y={y(Math.max(0, d.value))} height={Math.abs(y(d.value) - y(0))} rx={S.xs} fill={t("chartLine")} />
          ))
        : (
          <>
            <polygon points={`${x(0)},${y(lo)} ${pts} ${x(data.length - 1)},${y(lo)}`} fill={t("chartFill")} />
            <polyline points={pts} fill="none" stroke={t("chartLine")} strokeWidth={2} strokeLinejoin="round" />
            {data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.value)} r={3} fill={t("chartLine")} />)}
          </>
        )}
      {data.map((d, i) => (
        <text key={i} x={x(i)} y={height - S.xs} textAnchor="middle" {...axis}>{d.label}</text>
      ))}
    </svg>
  );
}
