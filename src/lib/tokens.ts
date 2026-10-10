import { createContext, createElement, useContext, type ReactNode } from "react";

/* RULES
   - No component may import a raw hex colour. Only roles.
   - `success` does not exist. Healthy states are silent. Nothing in this product shows a green tick.
   - `gold` does not exist as a role. It is retired from all interactive elements. */

export const tokens = {
  color: {
    // surfaces, back to front
    canvas:        { dark: "#0B1220", light: "#F2F3F5" },
    surface:       { dark: "#131C2E", light: "#FFFFFF" },
    surfaceSunken: { dark: "#1B2740", light: "#EAECF0" },
    border:        { dark: "#27324A", light: "#E3E6EA" },

    // text, by importance only — never to convey status
    textPrimary:   { dark: "#FFFFFF", light: "#1B2431" },
    textBody:      { dark: "#E6EBF5", light: "#39424F" },
    textSecondary: { dark: "#8A97AE", light: "#5E6674" },
    textMuted:     { dark: "#7C8799", light: "#666D7A" },

    // roles
    action:        { dark: "#35A7A0", light: "#077480" },
    actionInk:     { dark: "#04221F", light: "#FFFFFF" },
    attention:     { dark: "#E8736A", light: "#A25146" },
    danger:        { dark: "#E8736A", light: "#BA4238" },
    dangerInk:     { dark: "#2A0806", light: "#FFFFFF" },
    money:         { dark: "#E6EBF5", light: "#39424F" },

    // charts — these MUST exist in both themes; their absence in light
    // is why charts are currently invisible there
    chartLine:     { dark: "#35A7A0", light: "#077480" },
    chartLineAlt:  { dark: "#8A97AE", light: "#5E6674" },
    chartGrid:     { dark: "#27324A", light: "#E3E6EA" },
    chartAxis:     { dark: "#7C8799", light: "#666D7A" },
    chartFill:     { dark: "#35A7A033", light: "#07748022" },
  },
  type: {
    display:   { size: 28, weight: 700, leading: 1.15, tracking: -0.6 },
    title:     { size: 20, weight: 700, leading: 1.25, tracking: -0.3 },
    body:      { size: 16, weight: 500, leading: 1.35, tracking: 0 },
    secondary: { size: 14, weight: 400, leading: 1.4,  tracking: 0 },
    label:     { size: 12, weight: 700, leading: 1.3,  tracking: 0.8 },
  },
  space:  { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  radius: { box: 12, round: 999 },
  tap: 44,
  gutter: 18,
  font: "var(--font-family-ui)",
};

export type Theme = "dark" | "light";
export type Role = keyof typeof tokens.color;
export type TypeName = keyof typeof tokens.type;

export const c = (role: Role, theme: Theme) => tokens.color[role][theme];

/** Typography as a style object, so no screen writes a font-size literal. */
export const typeStyle = (name: TypeName) => {
  const x = tokens.type[name];
  return { fontSize: x.size, fontWeight: x.weight, lineHeight: x.leading, letterSpacing: x.tracking, fontFamily: tokens.font };
};

/* No default: a screen outside a ThemeProvider must fail loudly, never render in the wrong theme. */
const Ctx = createContext<Theme | null>(null);

export function ThemeProvider({ theme, children }: { theme: Theme; children: ReactNode }) {
  return createElement(Ctx.Provider, { value: theme }, children);
}

export function useTheme() {
  const theme = useContext(Ctx);
  if (!theme) throw new Error("useTheme() called outside <ThemeProvider theme={...}>. Wrap the tree and pass the user's theme.");
  return { theme, t: (role: Role) => c(role, theme) };
}
