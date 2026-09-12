/**
 * ReadiNes brand components — generated from the v1.0 brand kit.
 * The mark is the R-key: keyhole in the head, tail as the key shaft,
 * two document teeth. Carve details take the surface color via `carve`.
 */

const GOLD = "#D9A441";
const CHARCOAL = "#1E242B";
const CREAM = "#F3EEE2";

export function BrandMark({
  size = 36,
  color = GOLD,
  carve = CHARCOAL,
  title = "ReadiNes",
}: {
  size?: number;
  color?: string;
  carve?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size * (190 / 147)}
      viewBox="41 25 147 190"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <path d="M 60.20,114.70 L 80.66,98.67 L 168.71,211.00 L 135.67,211.00 Z" fill={color} />
      <g transform="translate(139.84,174.26) rotate(51.9)">
        <rect x="0" y="-24" width="17" height="26" rx="3" fill={color} />
        <rect x="3.5" y="-18" width="10" height="2.4" rx="1.2" fill={carve} />
        <rect x="3.5" y="-13" width="7.5" height="2.4" rx="1.2" fill={carve} />
      </g>
      <g transform="translate(155.94,194.66) rotate(51.9)">
        <rect x="0" y="-24" width="17" height="26" rx="3" fill={color} />
        <rect x="3.5" y="-18" width="10" height="2.4" rx="1.2" fill={carve} />
        <rect x="3.5" y="-13" width="7.5" height="2.4" rx="1.2" fill={carve} />
      </g>
      <path d="M58 29 V211" fill="none" stroke={color} strokeLinecap="butt" strokeWidth={26} />
      <path d="M45 29 H112 C164 29 164 135 112 135 H45 Z" fill={color} />
      <circle cx="102" cy="68" r="18" fill={carve} />
      <path d="M94 78 L84 114 H120 L110 78 Z" fill={carve} />
    </svg>
  );
}

/**
 * Wordmark: "ReadiNes" with the tick-i and gold mid-cap N.
 * Below ~17px font size the tick loses legibility; pass tick={false} there
 * (per guidelines 6.2) to fall back to a plain i with the gold N kept.
 */
export function BrandWordmark({
  size = 17,
  color = CHARCOAL,
  gold = GOLD,
  tick = true,
}: {
  size?: number;
  color?: string;
  gold?: string;
  tick?: boolean;
}) {
  const base: React.CSSProperties = {
    fontFamily: "'Nunito Sans','Space Grotesk',system-ui,sans-serif",
    fontWeight: 800,
    fontSize: size,
    letterSpacing: "-0.02em",
    color,
    display: "inline-flex",
    alignItems: "baseline",
    lineHeight: 1,
  };
  if (!tick) {
    return (
      <span style={base}>
        Readi<span style={{ color: gold }}>N</span>es
      </span>
    );
  }
  const h = size; // tick glyph box scales with font size
  return (
    <span style={base}>
      Read
      <svg
        width={h * 0.52}
        height={h * 1.06}
        viewBox="0 0 26 53"
        style={{ margin: "0 0.06em", transform: "translateY(0.16em)" }}
        aria-hidden
      >
        <path
          d="M3 33 L10 45 L21 16"
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={8}
        />
        <circle cx="22.5" cy="4.5" r="4" fill={gold} />
      </svg>
      <span style={{ color: gold }}>N</span>es
    </span>
  );
}

export const BRAND = {
  name: "ReadiNes",
  tagline: "Be ready for life's important moments",
  colors: { gold: GOLD, charcoal: CHARCOAL, cream: CREAM, paper: "#FAF7F0" },
};
