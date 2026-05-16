"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  type Theme,
  THEME_STORAGE_KEY,
  applyTheme,
  persistTheme,
  resolveTheme,
} from "@/lib/theme";

export type { Theme };

const themeListeners = new Set<() => void>();

function subscribeTheme(onStoreChange: () => void) {
  themeListeners.add(onStoreChange);
  const onStorage = () => onStoreChange();
  window.addEventListener("storage", onStorage);
  return () => {
    themeListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function notifyThemeListeners() {
  for (const listener of themeListeners) {
    listener();
  }
}

function getThemeSnapshot(): Theme {
  return resolveTheme(localStorage.getItem(THEME_STORAGE_KEY));
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

/**
 * Manages the app-wide colour theme.
 * Persists to localStorage and the sp-theme cookie (read by the root layout).
 */
export function useTheme() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  const toggle = useCallback(() => {
    const next: Theme = theme === "light" ? "dark" : "light";
    persistTheme(next);
    applyTheme(next);
    notifyThemeListeners();
  }, [theme]);

  return { theme, toggle, isDark: theme === "dark" };
}
