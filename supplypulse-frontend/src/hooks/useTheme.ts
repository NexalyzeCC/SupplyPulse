"use client";

import { useLayoutEffect, useState, useCallback } from "react";
import {
  type Theme,
  THEME_STORAGE_KEY,
  applyTheme,
  persistTheme,
  resolveTheme,
} from "@/lib/theme";

export type { Theme };

/**
 * Manages the app-wide colour theme.
 * Persists to localStorage and the sp-theme cookie (read by the root layout).
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useLayoutEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const resolved = resolveTheme(stored);
    setTheme(resolved);
    applyTheme(resolved);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      persistTheme(next);
      applyTheme(next);
      return next;
    });
  }, []);

  return { theme, toggle, isDark: theme === "dark" };
}
