import { createContext, useContext, type ReactNode } from "react";
import { Search } from "lucide-react";

/* One nav bar for every app screen: title (or brand) left, screen actions, then search and profile.
   App provides the search opener, the profile menu element, and the live theme tokens. */
export const MobileNavCtx = createContext<{
  openSearch: () => void;
  profile: ReactNode;
  tokens: { text: string; muted: string; panel: string; border: string; white: string };
} | null>(null);

export function MNav({ title, left, right }: { title?: ReactNode; left?: ReactNode; right?: ReactNode }) {
  const ctx = useContext(MobileNavCtx);
  if (!ctx) return null;
  const t = ctx.tokens;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        minHeight: 44,
        margin: "0 0 12px",
        position: "relative",
        zIndex: 40,
      }}
    >
      {left}
      {title ? (
        <b
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 20,
            fontWeight: 800,
            color: t.white,
            letterSpacing: -0.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {title}
        </b>
      ) : (
        <span style={{ flex: 1 }} />
      )}
      {right}
      <button
        onClick={ctx.openSearch}
        title="Search"
        style={{
          width: 38,
          height: 38,
          borderRadius: 99,
          display: "grid",
          placeItems: "center",
          background: t.panel,
          border: `1px solid ${t.border}`,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <Search size={16} color={t.muted} />
      </button>
      {ctx.profile}
    </div>
  );
}
