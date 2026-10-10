import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/* Theme is a single attribute on <html>: data-theme="dark" or absent (light).
   Every colour lives in src/styles/tokens.css; this module carries none. */
export type Theme = "dark" | "light";

const Ctx = createContext<Theme>("light");

function deviceTheme(): Theme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Pass `theme` to force one; omit it to follow the device setting. */
export function ThemeProvider({ theme, children }: { theme?: Theme; children: ReactNode }) {
  const [device, setDevice] = useState<Theme>("light");
  useEffect(() => {
    setDevice(deviceTheme());
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const on = (e: MediaQueryListEvent) => setDevice(e.matches ? "dark" : "light");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const current = theme ?? device;
  useEffect(() => {
    const el = document.documentElement;
    if (current === "dark") el.setAttribute("data-theme", "dark");
    else el.removeAttribute("data-theme");
  }, [current]);
  return <Ctx.Provider value={current}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return { theme: useContext(Ctx) };
}
