"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────
export type Theme = "dark" | "light" | "system";
export type FontId = "dm" | "fira" | "playfair" | "rajdhani" | "pacifico" | "spacemono";

interface SettingsContextValue {
  theme: Theme;
  font: FontId;
  resolvedTheme: "dark" | "light"; // actual applied theme after resolving "system"
  setTheme: (t: Theme) => void;
  setFont: (f: FontId) => void;
}

// ─── CSS variable map ────────────────────────────────────────────────
export const FONT_CSS_VAR: Record<FontId, string> = {
  dm:         "var(--font-dm, 'DM Sans'), system-ui, sans-serif",
  fira:       "var(--font-fira, 'Fira Code'), monospace",
  playfair:   "var(--font-playfair, 'Playfair Display'), serif",
  rajdhani:   "var(--font-rajdhani, 'Rajdhani'), sans-serif",
  pacifico:   "var(--font-pacifico, 'Pacifico'), cursive",
  spacemono:  "var(--font-space-mono, 'Space Mono'), monospace",
};

// ─── Context ────────────────────────────────────────────────────────
const SettingsContext = createContext<SettingsContextValue>({
  theme: "dark",
  font: "dm",
  resolvedTheme: "dark",
  setTheme: () => {},
  setFont: () => {},
});

export const useSettings = () => useContext(SettingsContext);

// ─── Helper: apply theme class to <html> ───────────────────────────
function applyTheme(theme: Theme): "dark" | "light" {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const resolved = theme === "system" ? (mq.matches ? "dark" : "light") : theme;

  const html = document.documentElement;
  html.classList.remove("theme-dark", "theme-light");
  html.classList.add(`theme-${resolved}`);
  html.setAttribute("data-theme", resolved);
  // Also set color-scheme so browser native UI matches
  html.style.colorScheme = resolved;
  return resolved;
}

// ─── Helper: apply font family via CSS variable ────────────────────
function applyFont(font: FontId) {
  // Set custom property on :root so it cascades everywhere via var(--ui-font)
  document.documentElement.style.setProperty("--ui-font", FONT_CSS_VAR[font]);
}

// ─── Provider ────────────────────────────────────────────────────────
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [font, setFontState] = useState<FontId>("dm");
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");

  // On mount: load from localStorage and apply. Optionally fetch from DB in background.
  useEffect(() => {
    const savedTheme = (localStorage.getItem("astramind-theme") as Theme) || "dark";
    const savedFont  = (localStorage.getItem("astramind-font")  as FontId) || "dm";
    setTimeout(() => {
      setThemeState(savedTheme);
      setFontState(savedFont);
      setResolvedTheme(applyTheme(savedTheme));
      applyFont(savedFont);
    }, 0);

    // Background sync from backend — optional, fails silently if unauthenticated
    fetch("/api/v1/user/config", {
      headers: { "Content-Type": "application/json" },
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.preferred_theme) {
          setThemeState(data.preferred_theme as Theme);
          setResolvedTheme(applyTheme(data.preferred_theme as Theme));
        }
        // preferred_font sync skipped until backend/frontend format alignment is done
      })
      .catch(() => { /* silent — backend may be unavailable */ });
  }, []);

  // React to system preference changes when theme = "system"
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setResolvedTheme(applyTheme("system"));
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [theme]);

  // Sync settings back to server (fire-and-forget, fails silently if unauthenticated)
  const syncToBackend = async (payload: { preferred_theme?: string, preferred_font?: string, last_used_model?: string }) => {
    try {
      await fetch("/api/v1/user/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch {
      // Silent — non-critical, local state is source of truth
    }
  };

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("astramind-theme", t);
    setResolvedTheme(applyTheme(t));
    syncToBackend({ preferred_theme: t });
  }, []);

  const setFont = useCallback((f: FontId) => {
    setFontState(f);
    localStorage.setItem("astramind-font", f);
    applyFont(f);
    syncToBackend({ preferred_font: f });
  }, []);

  return (
    <SettingsContext.Provider value={{ theme, font, resolvedTheme, setTheme, setFont }}>
      {children}
    </SettingsContext.Provider>
  );
}
