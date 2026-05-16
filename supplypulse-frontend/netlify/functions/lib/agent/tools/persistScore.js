/**
 * persistScore — writes a completed score run to Supabase.
 *
 * 1. Inserts a row into `supplier_scores`     → returns scoreId
 * 2. Bulk-inserts all signals into `supplier_signals` with score_id FK
 *
 * Uses the service-role key so it can bypass Row Level Security on insert.
 *
 * Returns: { scoreId: string }
 */

const { createClient } = require("@supabase/supabase-js");

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
}

/**
 * @param {string} supplierId
 * @param {{
 *   score:           number,
 *   direction:       string,
 *   summary:         string,
 *   recommendations: Array<{ priority:number, action:string, rationale:string }>,
 * }} scoreResult
 * @param {Array<{
 *   type:string, severity:string, summary:string,
 *   source_url:string|null, source_title:string|null,
 *   signal_date:string|null, confidence:number
 * }>} signals
 * @returns {Promise<{ scoreId: string }>}
 */
async function persistScore(supplierId, scoreResult, signals) {
  const supabase = getServiceClient();

  // 1 ── Insert score row ──────────────────────────────────────────────────────
  const { data: scoreRow, error: scoreErr } = await supabase
    .from("supplier_scores")
    .insert({
      supplier_id:     supplierId,
      score:           scoreResult.score,
      direction:       scoreResult.direction,
      summary:         scoreResult.summary,
      recommendations: scoreResult.recommendations, // stored as JSONB
    })
    .select("id")
    .single();

  if (scoreErr) {
    throw new Error(`[persistScore] Failed to insert score: ${scoreErr.message}`);
  }

  const scoreId = scoreRow.id;
  console.log(`[persistScore] Inserted score row ${scoreId}`);

  // 2 ── Bulk-insert signals ───────────────────────────────────────────────────
  if (signals.length > 0) {
    const rows = signals.map((s) => ({
      score_id:     scoreId,
      type:         s.type,
      severity:     s.severity,
      summary:      s.summary,
      source_url:   s.source_url   ?? null,
      source_title: s.source_title ?? null,
      signal_date:  s.signal_date  ?? null,
      confidence:   s.confidence,
    }));

    const { error: signalErr } = await supabase
      .from("supplier_signals")
      .insert(rows);

    if (signalErr) {
      // Log but don't throw — the score row already exists; partial data is
      // better than a hard failure the UI can't recover from.
      console.error(`[persistScore] Signal insert error (non-fatal): ${signalErr.message}`);
    } else {
      console.log(`[persistScore] Inserted ${rows.length} signals`);
    }
  }

  return { scoreId };
}

module.exports = { persistScore };
