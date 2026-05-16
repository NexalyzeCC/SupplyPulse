"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

/**
 * Sun / Moon toggle button.
 * Reads and writes theme via localStorage through `useTheme`.
 * Renders `null` on the server (and on the first client render before
 * hydration) to avoid a class-mismatch flash.
 */
export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="
        flex h-9 w-9 items-center justify-center rounded-lg
        text-slate-500 transition-colors
        hover:bg-slate-100 hover:text-slate-700
        dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200
      "
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
