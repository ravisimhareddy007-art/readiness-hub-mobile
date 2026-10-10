import { Children, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronRight, Plus, X } from "lucide-react";

/* All values come from src/styles/tokens.css (CSS variables and .t-* type classes). */
const v = (name: string) => `var(--${name})`;
const SP = {
  xs: v("space-050"), sm: v("space-100"), md: v("space-150"), lg: v("space-200"),
  xl: v("space-250"), xxl: v("space-300"), xxxl: v("space-400"),
};
const C = {
  canvas: v("color-surface-canvas"),
  surface: v("color-surface-default"),
  sunken: v("color-surface-inset"),
  border: v("color-border-subtle"),
  textPrimary: v("color-text-primary"),
  textHeading: v("color-text-heading"),
  textSecondary: v("color-text-secondary"),
  brandTint: v("color-surface-brand-tint"),
  interactive: v("color-text-interactive"),
  textTertiary: v("color-text-tertiary"),
  icon: v("color-icon-secondary"),
  action: v("color-action-primary-default"),
  onAction: v("color-text-on-brand"),
  attention: v("color-status-warning-text"),
  danger: v("color-action-destructive-default"),
  disabledSurface: v("color-surface-disabled"),
  disabledText: v("color-text-disabled"),
  chartLine: v("color-chart-line"),
  chartGrid: v("color-chart-grid"),
  chartAxis: v("color-chart-axis"),
  chartFill: v("color-chart-fill"),
};
const RADIUS = v("control-radius");
const ROUND = v("pill-radius");
const TAP = v("control-size-default");
const LINE = `${v("divider-width")} solid ${C.border}`;
const ICON: CSSProperties = { width: v("icon-size-md"), height: v("icon-size-md"), flexShrink: 0 };

const clip: CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 };

/* 1. Screen */
export function Screen({ children, tabBar = true }: { children: ReactNode; tabBar?: boolean }) {
  return (
    <div
      style={{
        background: C.canvas,
        color: C.textPrimary,
        fontFamily: v("font-family-ui"),
        overflowY: "auto",
        overflowX: "hidden",
        maxWidth: "100%",
        paddingTop: `calc(${SP.lg} + env(safe-area-inset-top))`,
        paddingLeft: `calc(${v("layout-gutter")} + env(safe-area-inset-left))`,
        paddingRight: `calc(${v("layout-gutter")} + env(safe-area-inset-right))`,
        paddingBottom: tabBar
          ? `calc(${v("tabbar-height")} + ${SP.xxl} + env(safe-area-inset-bottom))`
          : `calc(${SP.xxl} + env(safe-area-inset-bottom))`,
      }}
    >
      {children}
    </div>
  );
}

/* 2. ScreenTitle */
export function ScreenTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <h1 className="t-heading-xl" style={{ ...clip, color: C.textPrimary, margin: 0 }}>{children}</h1>
      {sub && <div className="t-body-sm" style={{ ...clip, color: C.textTertiary, marginTop: SP.xs }}>{sub}</div>}
    </div>
  );
}

/* 3. Section */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: SP.xxl }}>
      <div className="t-caption-md" style={{ ...clip, textTransform: "uppercase", color: C.textTertiary, marginBottom: SP.sm }}>{title}</div>
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
  return (
    <div
      role={onPress ? "button" : undefined}
      tabIndex={onPress ? 0 : undefined}
      onClick={onPress}
      onKeyDown={(e) => { if (onPress && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onPress(); } }}
      style={{ display: "flex", alignItems: "center", gap: SP.md, minHeight: TAP, paddingTop: SP.md, paddingBottom: SP.md, cursor: onPress ? "pointer" : undefined, minWidth: 0 }}
    >
      {leading && (
        <div style={{ width: v("icon-size-xl"), height: v("icon-size-xl"), flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: ROUND, background: C.sunken, color: C.icon, overflow: "hidden" }}>
          {leading}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div className="t-label-lg" style={{ ...clip, color: C.textHeading }}>{title}</div>
        {meta && <div className="t-body-sm" style={{ ...clip, color: C.textTertiary }}>{meta}</div>}
        {alert && <div className="t-body-sm" style={{ ...clip, color: C.attention }}>{alert}</div>}
      </div>
      {value && <div className="t-body-md" style={{ flexShrink: 0, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: C.textPrimary }}>{value}</div>}
      {action && (
        <div style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <Button variant="secondary" size="sm" onPress={action.onPress}>{action.label}</Button>
        </div>
      )}
      {chevron && <ChevronRight color={C.icon} style={ICON} />}
    </div>
  );
}

/* 5. RowGroup — owns disclosure */
export function RowGroup({ children, initial = 3 }: { children: ReactNode; initial?: number }) {
  const [open, setOpen] = useState(false);
  const items = Children.toArray(children);
  const shown = open ? items : items.slice(0, initial);
  return (
    <div>
      {shown.map((child, i) => <div key={i} style={{ borderTop: i ? LINE : undefined }}>{child}</div>)}
      {items.length > initial && (
        <div style={{ borderTop: LINE }}>
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
  return (
    <div style={{ paddingTop: SP.sm, paddingBottom: SP.sm, minWidth: 0 }}>
      <div className="t-caption-md" style={{ ...clip, textTransform: "uppercase", color: C.textTertiary }}>{label}</div>
      <div className="t-body-md" style={{ color: C.textPrimary, marginTop: SP.xs, overflowWrap: "anywhere" }}>{value ?? "—"}</div>
    </div>
  );
}

/* 7. Input */
type InputProps =
  | { variant: "text" | "number" | "date" | "time" | "textarea"; label: string; value: string; onChange: (v: string) => void; placeholder?: string }
  | { variant: "select" | "choice"; label: string; value: string; onChange: (v: string) => void; options: string[] }
  | { variant: "toggle"; label: string; value: boolean; onChange: (v: boolean) => void };

export function Input(p: InputProps) {
  const control: CSSProperties = {
    width: "100%", boxSizing: "border-box", minHeight: TAP,
    paddingLeft: SP.md, paddingRight: SP.md, paddingTop: SP.sm, paddingBottom: SP.sm,
    borderRadius: RADIUS, border: LINE,
    background: C.surface, color: C.textPrimary, outline: "none", fontFamily: "inherit",
  };
  let body: ReactNode;
  if (p.variant === "toggle") {
    body = (
      <button type="button" role="switch" aria-checked={p.value} onClick={() => p.onChange(!p.value)} className="t-body-md"
        style={{ ...control, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
        <span style={{ ...clip }}>{p.value ? "On" : "Off"}</span>
        <span style={{ width: TAP, height: SP.xxl, borderRadius: ROUND, background: p.value ? C.action : C.sunken, display: "flex", alignItems: "center", justifyContent: p.value ? "flex-end" : "flex-start", padding: SP.xs, boxSizing: "border-box", flexShrink: 0 }}>
          <span style={{ width: SP.lg, height: SP.lg, borderRadius: ROUND, background: p.value ? C.onAction : C.textTertiary }} />
        </span>
      </button>
    );
  } else if (p.variant === "choice") {
    body = (
      <div role="radiogroup" style={{ display: "flex", gap: SP.xs, padding: SP.xs, borderRadius: RADIUS, background: C.sunken, minWidth: 0 }}>
        {p.options.map((o) => {
          const on = o === p.value;
          return (
            <button key={o} type="button" role="radio" aria-checked={on} onClick={() => p.onChange(o)} className="t-body-sm"
              style={{ ...clip, flex: 1, minHeight: TAP, border: "none", borderRadius: RADIUS, cursor: "pointer", fontFamily: "inherit", background: on ? C.surface : "transparent", color: on ? C.textPrimary : C.textTertiary }}>
              {o}
            </button>
          );
        })}
      </div>
    );
  } else if (p.variant === "select") {
    body = (
      <select value={p.value} onChange={(e) => p.onChange(e.target.value)} className="t-body-md" style={control}>
        {p.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  } else if (p.variant === "textarea") {
    body = <textarea value={p.value} placeholder={p.placeholder} onChange={(e) => p.onChange(e.target.value)} rows={3} className="t-body-md" style={{ ...control, resize: "vertical" }} />;
  } else {
    body = <input type={p.variant as string} value={p.value as string} placeholder={"placeholder" in p ? p.placeholder : undefined} onChange={(e) => p.onChange(e.target.value)} className="t-body-md"
      style={{ ...control, fontVariantNumeric: p.variant === "number" ? "tabular-nums" : undefined }} />;
  }
  return (
    <label style={{ display: "block", minWidth: 0, marginBottom: SP.lg }}>
      <div className="t-caption-md" style={{ ...clip, textTransform: "uppercase", color: C.textTertiary, marginBottom: SP.sm }}>{p.label}</div>
      {body}
    </label>
  );
}

/* 8. Button — label states the action, never a count.
   Disabled removes the fill entirely, never a lighter tint of the enabled colour. */
const HEIGHT = { lg: v("control-size-large"), md: TAP, sm: TAP } as const;
const LABEL = { lg: "t-label-lg", md: "t-label-md", sm: "t-label-md" } as const;

export function Button({
  children, variant = "primary", size = "md", onPress, disabled, full, block,
}: {
  children: ReactNode; variant?: "primary" | "secondary" | "danger"; size?: "lg" | "md" | "sm";
  onPress?: () => void; disabled?: boolean; full?: boolean; block?: boolean;
}) {
  const look: Record<string, CSSProperties> = {
    primary: { background: C.action, color: C.onAction, border: `${v("control-border-width")} solid ${C.action}` },
    secondary: { background: C.sunken, color: C.textPrimary, border: LINE },
    danger: { background: C.danger, color: C.onAction, border: `${v("control-border-width")} solid ${C.danger}` },
  };
  const idle: CSSProperties = disabled
    ? { background: C.disabledSurface, color: C.disabledText, border: `${v("control-border-width")} solid ${C.disabledSurface}` }
    : look[variant];
  return (
    <button type="button" onClick={onPress} disabled={disabled} className={LABEL[size]}
      style={{
        ...idle, ...clip, fontFamily: "inherit",
        height: HEIGHT[size],
        width: full || (size === "lg" && block) ? "100%" : undefined, maxWidth: "100%",
        paddingLeft: SP.lg, paddingRight: SP.lg, borderRadius: RADIUS,
        cursor: disabled ? "not-allowed" : "pointer",
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
  const R = v("overlay-radius");
  const panel = (
    <div style={{ background: C.surface, color: C.textPrimary, borderTopLeftRadius: R, borderTopRightRadius: R, borderRadius: inline ? R : undefined, boxShadow: v("elevation-overlay"), display: "flex", flexDirection: "column", maxHeight: inline ? undefined : "88vh", width: "100%", boxSizing: "border-box", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "center", paddingTop: SP.sm }}>
        <span style={{ width: v("sheet-handle-width"), height: v("sheet-handle-height"), borderRadius: ROUND, background: C.border }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: SP.sm, paddingLeft: SP.lg, paddingRight: SP.xs, minWidth: 0 }}>
        <div className="t-heading-md" style={{ ...clip, flex: 1, color: C.textPrimary }}>{title}</div>
        <button type="button" aria-label="Close" onClick={onClose}
          style={{ width: TAP, height: TAP, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", color: C.icon }}>
          <X style={ICON} />
        </button>
      </div>
      <div style={{ overflowY: "auto", paddingLeft: SP.lg, paddingRight: SP.lg, paddingBottom: SP.lg }}>{children}</div>
      {footer && <div style={{ padding: SP.lg, borderTop: LINE }}>{footer}</div>}
    </div>
  );
  if (inline) return panel;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", background: v("color-overlay-scrim") }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", paddingBottom: "env(safe-area-inset-bottom)" }}>{panel}</div>
    </div>
  );
}

/* 10. Stat */
export function Stat({ value, unit, label, size = "title" }: { value: ReactNode; unit?: string; label?: string; size?: "title" | "display" }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: SP.xs, minWidth: 0 }}>
        <span className={size === "display" ? "t-numeric-lg" : "t-numeric-md"} style={{ ...clip, color: C.textPrimary }}>{value}</span>
        {unit && <span className="t-body-sm" style={{ color: C.textTertiary }}>{unit}</span>}
      </div>
      {label && <div className="t-body-sm" style={{ ...clip, color: C.textTertiary }}>{label}</div>}
    </div>
  );
}

/* 11. Progress — linear, one colour, no rings */
export function Progress({ value, max, caption }: { value: number; max: number; caption?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div style={{ minWidth: 0 }}>
      <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}
        style={{ height: SP.sm, borderRadius: ROUND, background: C.sunken, overflow: "hidden" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: C.action, borderRadius: ROUND }} />
      </div>
      {caption && <div className="t-body-sm" style={{ ...clip, color: C.textTertiary, marginTop: SP.xs }}>{caption}</div>}
    </div>
  );
}

/* 12. Chart — line or bar, single series, legible in both themes.
   Geometry below is SVG viewBox units, not CSS sizes. */
export function Chart({
  data, type = "line", height = 160, empty = "Nothing recorded yet",
}: { data: { label: string; value: number }[]; type?: "line" | "bar"; height?: number; empty?: string }) {
  if (!data.length)
    return (
      <div className="t-body-sm" style={{ height, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: RADIUS, border: `${v("divider-width")} dashed ${C.chartGrid}`, color: C.chartAxis }}>
        {empty}
      </div>
    );
  const W = 320, padL = 32, padB = 20, padT = 8, padR = 8, tick = 4;
  const ch = height - padB - padT, cw = W - padL - padR;
  const vals = data.map((d) => d.value);
  const lo = Math.min(0, ...vals), hi = Math.max(...vals, lo + 1);
  const y = (n: number) => padT + ch - ((n - lo) / (hi - lo)) * ch;
  const step = cw / Math.max(1, type === "bar" ? data.length : data.length - 1);
  const x = (i: number) => padL + (type === "bar" ? step * i + step / 2 : data.length === 1 ? cw / 2 : step * i);
  const ticks = [lo, (lo + hi) / 2, hi];
  const fmt = (n: number) => (Math.abs(n) >= 1000 ? `${Math.round(n / 100) / 10}k` : `${Math.round(n * 10) / 10}`);
  const axis: CSSProperties = { fill: C.chartAxis, fontSize: v("text-caption-md-size"), fontFamily: v("font-family-ui") };
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} preserveAspectRatio="none" style={{ display: "block" }}>
      {ticks.map((n, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(n)} y2={y(n)} style={{ stroke: C.chartGrid, strokeWidth: 1 }} />
          <text x={padL - tick} y={y(n) + tick} textAnchor="end" style={axis}>{fmt(n)}</text>
        </g>
      ))}
      {type === "bar"
        ? data.map((d, i) => (
            <rect key={i} x={x(i) - step * 0.3} width={step * 0.6} y={y(Math.max(0, d.value))} height={Math.abs(y(d.value) - y(0))} rx={tick} style={{ fill: C.chartLine }} />
          ))
        : (
          <>
            <polygon points={`${x(0)},${y(lo)} ${pts} ${x(data.length - 1)},${y(lo)}`} style={{ fill: C.chartFill }} />
            <polyline points={pts} style={{ fill: "none", stroke: C.chartLine, strokeWidth: 2, strokeLinejoin: "round" }} />
            {data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.value)} r={3} style={{ fill: C.chartLine }} />)}
          </>
        )}
      {data.map((d, i) => (
        <text key={i} x={x(i)} y={height - tick} textAnchor="middle" style={axis}>{d.label}</text>
      ))}
    </svg>
  );
}

/* ── Canonical components. Every screen composes these; no screen restyles them. ── */

/* 13. IconWell — the 36px tinted square that leads a row or tile. Brand tint by default. */
export function IconWell({ children, color, size = "md" }: { children: ReactNode; color?: string; size?: "sm" | "md" | "lg" }) {
  const px = { sm: v("inline-size-default"), md: v("list-row-icon"), lg: v("tile-icon") }[size];
  const tint = color ? `color-mix(in srgb, ${color} 12%, transparent)` : C.brandTint;
  return (
    <span style={{ width: px, height: px, borderRadius: v("control-radius"), background: tint, color: color || C.interactive, display: "grid", placeItems: "center", flexShrink: 0 }}>
      {children}
    </span>
  );
}

/* 14. ListRow — the one list row. Title 17/500 heading colour, subtitle 13 secondary, 56 minimum height.
   Slots: leading, trailing, extra (a third line that earns ink only for an exception). */
export function ListRow({
  leading, title, subtitle, subtitleColor, extra, trailing, onPress, chevron, divider = true, className, wrap,
}: {
  leading?: ReactNode; title: ReactNode; subtitle?: ReactNode; subtitleColor?: string; extra?: ReactNode; trailing?: ReactNode;
  onPress?: () => void; chevron?: boolean; divider?: boolean; className?: string;
  /** Let the title run to two lines (for sentence-like titles). Default clips to one line. */
  wrap?: boolean;
}) {
  return (
    <div
      className={className}
      role={onPress ? "button" : undefined}
      tabIndex={onPress ? 0 : undefined}
      onClick={onPress}
      onKeyDown={(e) => { if (onPress && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onPress(); } }}
      style={{ display: "flex", alignItems: "center", gap: SP.md, minHeight: v("list-row-default"), paddingTop: SP.sm, paddingBottom: SP.sm, paddingLeft: SP.lg, paddingRight: SP.lg, borderTop: divider ? LINE : undefined, cursor: onPress ? "pointer" : undefined, minWidth: 0, textAlign: "left", width: "100%", boxSizing: "border-box", background: "transparent" }}
    >
      {leading}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div className="t-label-lg" style={{ ...(wrap ? { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } : clip), color: C.textHeading }}>{title}</div>
        {subtitle && <div className="t-body-sm" style={{ ...clip, color: subtitleColor || C.textSecondary, marginTop: SP.xs }}>{subtitle}</div>}
        {extra}
      </div>
      {trailing}
      {chevron && <ChevronRight color={C.icon} style={{ ...ICON, width: v("icon-size-sm"), height: v("icon-size-sm") }} />}
    </div>
  );
}

/* 15. ListGroup — the surface that holds rows: white tile, surface radius, raised elevation. */
export function ListGroup({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: C.surface, borderRadius: v("surface-radius"), boxShadow: v("elevation-raised"), overflow: "hidden", ...style }}>
      {children}
    </div>
  );
}

/* 16. SectionHeader — heading/xs in heading colour with an optional trailing element. */
export function SectionHeader({ title, trailing }: { title: ReactNode; trailing?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: SP.sm, marginBottom: SP.sm, minWidth: 0 }}>
      <div className="t-heading-xs" style={{ ...clip, color: C.textHeading }}>{title}</div>
      {trailing}
    </div>
  );
}

/* 17. Tile — module tile: icon well, title, one status line; the whole tile is the tap target. */
export function Tile({ icon, title, status, onPress }: { icon: ReactNode; title: string; status?: ReactNode; onPress?: () => void }) {
  return (
    <button type="button" onClick={onPress}
      style={{ background: C.surface, border: "none", borderRadius: v("tile-radius"), padding: SP.lg, minHeight: v("tile-min-height"), boxShadow: v("elevation-raised"), display: "grid", alignContent: "space-between", gap: SP.sm, textAlign: "left", cursor: onPress ? "pointer" : "default", color: C.textPrimary, width: "100%", minWidth: 0 }}>
      <IconWell size="lg">{icon}</IconWell>
      <span style={{ minWidth: 0 }}>
        <span className="t-label-md" style={{ display: "block", ...clip, color: C.textHeading }}>{title}</span>
        {status && <span className="t-body-sm" style={{ display: "block", color: C.textSecondary }}>{status}</span>}
      </span>
    </button>
  );
}
export function TileGrid({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.md }}>{children}</div>;
}

/* 18. Chip — status chip: colour always paired with a word. */
export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "info" | "neutral" | "brand" }) {
  const t = tone === "neutral"
    ? { background: C.sunken, color: C.textSecondary, border: `${v("inline-border-width")} solid transparent` }
    : tone === "brand"
      ? { background: C.brandTint, color: C.interactive, border: `${v("inline-border-width")} solid transparent` }
      : { background: v(`color-status-${tone}-surface`), color: v(`color-status-${tone}-text`), border: `${v("inline-border-width")} solid ${v(`color-status-${tone}-border`)}` };
  return (
    <span className="t-caption-md" style={{ ...t, display: "inline-flex", alignItems: "center", gap: SP.xs, height: v("inline-size-default"), paddingLeft: SP.sm, paddingRight: SP.sm, borderRadius: ROUND, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
      {children}
    </span>
  );
}

/* 19. Fab — the one floating action. Fixed 16px above the tab bar, on-brand icon, overlay elevation. */
export function Fab({ onPress, label = "Add", icon }: { onPress: () => void; label?: string; icon?: ReactNode }) {
  return (
    <button type="button" onClick={onPress} aria-label={label} title={label}
      style={{ position: "fixed", right: v("layout-gutter"), bottom: `calc(${v("tabbar-height")} + ${v("layout-gutter")} + env(safe-area-inset-bottom, 0px))`, zIndex: 55, width: v("fab-size"), height: v("fab-size"), borderRadius: ROUND, border: "none", display: "grid", placeItems: "center", background: C.action, color: C.onAction, boxShadow: v("elevation-overlay"), cursor: "pointer" }}>
      {icon ?? <Plus style={{ width: v("icon-size-lg"), height: v("icon-size-lg") }} />}
    </button>
  );
}

/* 20. Callout — page or section feedback. */
export function Callout({ tone = "info", icon, children }: { tone?: "info" | "warning" | "success" | "danger"; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="t-body-sm" style={{ display: "flex", gap: SP.md, paddingTop: SP.md, paddingBottom: SP.md, paddingLeft: SP.lg, paddingRight: SP.lg, borderRadius: v("surface-radius"), background: v(`color-status-${tone}-surface`), border: `${v("divider-width")} solid ${v(`color-status-${tone}-border`)}`, color: v(`color-status-${tone}-text`) }}>
      {icon}
      <span style={{ minWidth: 0 }}>{children}</span>
    </div>
  );
}

/* 21. EmptyState — calm, one sentence, one action. */
export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div style={{ display: "grid", justifyItems: "center", textAlign: "center", gap: SP.md, padding: SP.xxl }}>
      {icon && <span style={{ width: v("empty-icon-size"), height: v("empty-icon-size"), borderRadius: ROUND, background: C.brandTint, color: C.interactive, display: "grid", placeItems: "center" }}>{icon}</span>}
      <div className="t-heading-sm" style={{ color: C.textHeading }}>{title}</div>
      {body && <div className="t-body-md" style={{ color: C.textSecondary, maxWidth: "32ch" }}>{body}</div>}
      {action}
    </div>
  );
}
