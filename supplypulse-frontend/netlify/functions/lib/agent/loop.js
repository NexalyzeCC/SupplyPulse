/**
 * loop.js — ReAct agent orchestrator for SupplyPulse.
 *
 * Pipeline (6 steps):
 *   1. Idempotency check  — skip if a score was already created today
 *   2. Search             — parallel web searches across 5 targeted queries
 *   3. Extract signals    — GPT-4o-mini parses raw results into structured signals
 *   4. Synthesize score   — GPT-4o derives score, direction, summary, recommendations
 *   5. Persist            — writes supplier_scores + supplier_signals rows
 *   6. Alert              — fires email / Slack if score < threshold
 *
 * Returns: { status: "complete"|"skipped", scoreId, score, direction }
 */

const { createClient } = require("@supabase/supabase-js");
const { webSearch }       = require("./tools/webSearch");
const { extractSignals }  = require("./tools/extractSignals");
const { synthesizeScore } = require("./tools/synthesizeScore");
const { persistScore }    = require("./tools/persistScore");
const { sendAlert }       = require("./tools/sendAlert");

// ─── Supabase (service role for reads the anon key can't do) ─────────────────

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strips characters that could pollute a search query.
 * Moved here from score-supplier.js per task spec.
 * @param {string} name
 * @returns {string}
 */
function sanitizeSupplierName(name) {
  return name
    .replace(/[^\w\s,.\-&]/g, " ") // keep alphanumeric, spaces, common punctuation
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

/**
 * Generates 5 targeted search queries for a supplier.
 * No LLM needed — deterministic for v1.
 * @param {string} name     — sanitised supplier name
 * @param {string} country  — e.g. "China" or null
 * @param {string} category — e.g. "Electronics" or null
 * @returns {string[]}
 */
function generateQueries(name, country, category) {
  const geo = country  ? ` ${country}` : "";
  const cat = category ? ` ${category}` : "";
  return [
    `${name} financial risk bankruptcy 2025 2026`,
    `${name}${geo} supply chain disruption news`,
    `${name} legal regulatory investigation lawsuit`,
    `${name}${cat} operational issues factory shutdown`,
    `${name} leadership management controversy`,
  ];
}

/**
 * Returns true if a score row already exists for this supplier created today
 * (UTC date). Used to avoid double-billing the AI APIs on repeat calls.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} supplierId
 * @returns {Promise<{ exists:boolean, scoreId?:string, score?:number, direction?:string }>}
 */
async function checkTodayIdempotency(supabase, supplierId) {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("supplier_scores")
    .select("id, score, direction")
    .eq("supplier_id", supplierId)
    .gte("created_at", todayStart.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[loop] Idempotency check error (non-fatal):", error.message);
    return { exists: false };
  }

  if (data) {
    return { exists: true, scoreId: data.id, score: data.score, direction: data.direction };
  }

  return { exists: false };
}

/**
 * Fetches the full supplier row including alert config and user_id.
 * Throws if supplier is not found or the DB call fails.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} supplierId
 * @returns {Promise<object>}
 */
async function fetchSupplier(supabase, supplierId) {
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, country, category, criticality, alert_threshold, slack_webhook, user_id")
    .eq("id", supplierId)
    .single();

  if (error || !data) {
    throw new Error(`[loop] Supplier not found: ${supplierId} — ${error?.message}`);
  }

  return data;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * @param {string} supplierId
 * @param {{
 *   supplierName?: string,
 *   country?:      string,
 *   category?:     string,
 *   forceRefresh?: boolean  — bypass today's idempotency guard
 * }} opts
 * @returns {Promise<{
 *   status:    "complete" | "skipped",
 *   scoreId:   string,
 *   score:     number,
 *   direction: string,
 * }>}
 */
async function runAgentLoop(supplierId, opts = {}) {
  const { forceRefresh = false } = opts;
  const supabase = getServiceClient();

  // ── Step 0: Fetch supplier profile ──────────────────────────────────────────
  const supplier = await fetchSupplier(supabase, supplierId);
  console.log(`[loop] Starting agent for supplier: ${supplier.name} (${supplierId})`);

  // ── Step 1: Idempotency guard ────────────────────────────────────────────────
  if (!forceRefresh) {
    const cached = await checkTodayIdempotency(supabase, supplierId);
    if (cached.exists) {
      console.log(`[loop] Score already exists today — skipping (scoreId: ${cached.scoreId})`);
      return {
        status:    "skipped",
        scoreId:   cached.scoreId,
        score:     cached.score,
        direction: cached.direction,
      };
    }
  }

  // Use caller-supplied name if provided (avoids an extra DB round-trip when
  // the HTTP handler already validated it), otherwise fall back to DB value.
  const rawName = opts.supplierName ?? supplier.name;
  const name    = sanitizeSupplierName(rawName);
  const country  = opts.country   ?? supplier.country  ?? null;
  const category = opts.category  ?? supplier.category ?? null;

  // ── Step 2: Parallel web searches ───────────────────────────────────────────
  const queries = generateQueries(name, country, category);
  console.log(`[loop] Running ${queries.length} parallel searches`);

  const searchResults = await Promise.allSettled(queries.map((q) => webSearch(q)));

  // Flatten fulfilled results; log errors for failed queries
  const allResults = searchResults.flatMap((r, i) => {
    if (r.status === "fulfilled") return r.value;
    console.warn(`[loop] Query ${i} failed: ${r.reason?.message}`);
    return [];
  });

  console.log(`[loop] Retrieved ${allResults.length} total results`);

  // ── Step 3: Extract signals ──────────────────────────────────────────────────
  const signals = await extractSignals(name, allResults);
  console.log(`[loop] Extracted ${signals.length} signals`);

  // ── Step 4: Synthesize score ─────────────────────────────────────────────────
  const scoreResult = await synthesizeScore(signals, {
    name:        supplier.name,
    country:     supplier.country,
    category:    supplier.category,
    criticality: supplier.criticality,
  });

  // ── Step 5: Persist score + signals ─────────────────────────────────────────
  const { scoreId } = await persistScore(supplierId, scoreResult, signals);
  console.log(`[loop] Persisted score ${scoreResult.score} (id: ${scoreId})`);

  // ── Step 6: Alert if needed ──────────────────────────────────────────────────
  const alertResult = await sendAlert(
    supplier,
    scoreResult,  // { score, direction, summary, recommendations }
    scoreId,
    signals,      // pass signals so the template can render the top 3
  );

  if (alertResult.alerted) {
    console.log(`[loop] Alert sent via: ${alertResult.channels.join(", ")}`);
  }

  return {
    status:    "complete",
    scoreId,
    score:     scoreResult.score,
    direction: scoreResult.direction,
  };
}

module.exports = { runAgentLoop, sanitizeSupplierName };
