"use client";

import { useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "sp-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

/**
 * Manages the app-wide colour theme.
 *
 * - Reads localStorage on mount, falling back to OS preference.
 * - Applies the `dark` class to `<html>` immediately (avoids FOUC because
 *   the root layout also injects an inline script that sets the class
 *   synchronously before React hydrates).
 * - Persists the user's choice to localStorage.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved: Theme = stored ?? (prefersDark ? "dark" : "light");
    setTheme(resolved);
    applyTheme(resolved);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  return { theme, toggle, isDark: theme === "dark" };
}
