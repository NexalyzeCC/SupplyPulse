/**
 * Canonical browser origin for auth email links (Supabase `emailRedirectTo`, etc.).
 * Prefer `NEXT_PUBLIC_SITE_URL` in production so confirmation emails never embed
 * `localhost`, even if signup was accidentally triggered during local testing.
 *
 * Env value must include protocol, e.g. `https://app.example.com` (no trailing slash required).
 */
export function getPublicSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ?? "";
  if (raw) return raw;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}
