/**
 * ReadiNes brand mark and wordmark.
 *
 * The mark is two solid shapes; the R is the negative space between them, so the
 * shapes run exactly to the edges of the viewBox with no padding inside the SVG.
 * Every gap around it belongs to the layout, or the mark will not sit flush
 * against the wordmark or a container edge.
 *
 * Monochrome by design. The mark reads entirely through contrast between figure
 * and ground, so colour inside it makes it weaker, most visibly at small sizes.
 * It takes the surface's text colour unless a caller passes one.
 */

export function BrandMark({
  size = 36,
  color = "currentColor",
  carve,
  title = "ReadiNes",
}: {
  size?: number;
  color?: string;
  /** Accepted and ignored. Kept so existing callers do not break. */
  carve?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size * (835 / 700)}
      viewBox="0 0 700 835"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      style={{ display: "block", flexShrink: 0 }}
    >
      <polygon points="0,0 615,3 192,213 8,833 0,833" fill={color} />
      <polygon points="320,375 700,145 700,835 415,835" fill={color} />
    </svg>
  );
}

/* Set as text, never as a path, and never in uppercase: the capital N is what
   distinguishes the product name from the word "readiness". */
export function BrandWordmark({
  size = 17,
  color = "currentColor",
  gold,
  tick,
}: {
  size?: number;
  color?: string;
  /** Accepted and ignored. Kept so existing callers do not break. */
  gold?: string;
  tick?: boolean;
}) {
  return (
    <span
      style={{
        fontFamily: "inherit",
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "-0.01em",
        lineHeight: 1,
        color,
        display: "inline-flex",
        alignItems: "center",
        whiteSpace: "nowrap",
      }}
    >
      ReadiNes
    </span>
  );
}
