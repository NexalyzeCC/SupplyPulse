/**
 * webSearch — fetch risk-relevant web results for a query string.
 *
 * Primary:  Tavily Search API  (TAVILY_API_KEY)
 * Fallback: Serper.dev         (SERPER_API_KEY)  — used when Tavily fails or
 *           returns an empty results array.
 *
 * Returns: Array<{ title, url, content, publishedDate }>
 */

const { logTool } = require("../../logger");

const TIMEOUT_MS = 8_000;
const MAX_RETRIES = 1;

// ─── Shared fetch with timeout ────────────────────────────────────────────────

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Tavily ───────────────────────────────────────────────────────────────────

async function searchTavily(query) {
  const res = await fetchWithTimeout("https://api.tavily.com/search", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key:      process.env.TAVILY_API_KEY,
      query,
      search_depth: "advanced",
      max_results:  5,
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily HTTP ${res.status}`);
  }

  const data = await res.json();
  const results = data.results ?? [];

  return results.map((r) => ({
    title:         r.title       ?? "",
    url:           r.url         ?? "",
    content:       r.content     ?? "",
    publishedDate: r.published_date ?? null,
  }));
}

// ─── Serper.dev (fallback) ────────────────────────────────────────────────────

async function searchSerper(query) {
  const res = await fetchWithTimeout("https://google.serper.dev/search", {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY":    process.env.SERPER_API_KEY ?? "",
    },
    body: JSON.stringify({ q: query, num: 5 }),
  });

  if (!res.ok) {
    throw new Error(`Serper HTTP ${res.status}`);
  }

  const data = await res.json();
  const organic = data.organic ?? [];

  return organic.map((r) => ({
    title:         r.title   ?? "",
    url:           r.link    ?? "",
    content:       r.snippet ?? "",
    publishedDate: r.date    ?? null,
  }));
}

// ─── Public: search with retry + fallback ─────────────────────────────────────

/**
 * @param {string} query
 * @param {{ runId?:string, supplierId?:string }} [ctx]
 * @returns {Promise<Array<{ title: string, url: string, content: string, publishedDate: string|null }>>}
 */
async function webSearch(query, ctx = {}) {
  const { runId, supplierId } = ctx;
  const t0 = Date.now();
  let lastError;

  // Try Tavily (with 1 retry)
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const results = await searchTavily(query);
      if (results.length > 0) {
        logTool({
          tool:      "webSearch",
          step:      "search",
          supplierId,
          runId,
          latencyMs: Date.now() - t0,
          success:   true,
        });
        return results;
      }
      // Empty results — fall through to Serper
      break;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 500)); // brief back-off
      }
    }
  }

  // Serper fallback (only if API key is configured)
  if (process.env.SERPER_API_KEY) {
    try {
      const results = await searchSerper(query);
      if (results.length > 0) {
        logTool({
          tool:      "webSearch",
          step:      "search",
          supplierId,
          runId,
          latencyMs: Date.now() - t0,
          success:   true,
        });
        return results;
      }
    } catch (err) {
      lastError = err;
      console.warn("[webSearch] Serper fallback failed:", err.message);
    }
  }

  // Both providers exhausted — return empty rather than throwing (preserves
  // graceful degradation; loop.js can still proceed with fewer signals).
  console.warn("[webSearch] All providers returned empty for query:", query, lastError?.message);
  logTool({
    tool:      "webSearch",
    step:      "search",
    supplierId,
    runId,
    latencyMs: Date.now() - t0,
    success:   false,
    error:     lastError?.message || "no results from any provider",
  });
  return [];
}

module.exports = { webSearch };
