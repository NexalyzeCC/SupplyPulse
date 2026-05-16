/**
 * Supabase env vars for the Next.js app.
 * Prefer NEXT_PUBLIC_*; fall back to NEXT_APP_* for older .env files.
 * Project URL must be the base host only (no /rest/v1/ suffix).
 */
function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

export function getSupabaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.NEXT_APP_SUPABASE_URL;

  if (!raw) {
    throw new Error(
      "Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or NEXT_APP_SUPABASE_URL in .env.local (e.g. https://xxx.supabase.co)",
    );
  }

  return normalizeSupabaseUrl(raw);
}

export function getSupabaseAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_APP_SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error(
      "Missing Supabase anon key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_APP_SUPABASE_ANON_KEY in .env.local",
    );
  }

  return key;
}
