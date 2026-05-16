export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "sp-theme";
export const THEME_COOKIE_NAME = "sp-theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function persistTheme(theme: Theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.cookie = `${THEME_COOKIE_NAME}=${theme};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
}

export function resolveTheme(stored: string | null | undefined): Theme {
  if (stored === "light" || stored === "dark") return stored;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}
