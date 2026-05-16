/**
 * Resolve Netlify function URLs for scan/API calls.
 * When NEXT_PUBLIC_API_URL is set (separate backend deploy), use /api/* paths.
 * Otherwise use same-origin /.netlify/functions/* (unified Netlify site or netlify dev).
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export function apiUrl(
  functionName: string,
  searchParams?: Record<string, string>,
): string {
  const query =
    searchParams && Object.keys(searchParams).length > 0
      ? `?${new URLSearchParams(searchParams).toString()}`
      : "";

  if (API_BASE) {
    return `${API_BASE}/api/${functionName}${query}`;
  }

  return `/.netlify/functions/${functionName}${query}`;
}
