"use client";

import { useLayoutEffect } from "react";
import {
  THEME_STORAGE_KEY,
  applyTheme,
  persistTheme,
  resolveTheme,
} from "@/lib/theme";

/**
 * Syncs theme from localStorage / OS preference on the client.
 * Server-rendered `dark` class comes from the sp-theme cookie in layout.tsx.
 */
export default function ThemeProvider() {
  useLayoutEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const theme = resolveTheme(stored);
    applyTheme(theme);
    persistTheme(theme);
  }, []);

  return null;
}
