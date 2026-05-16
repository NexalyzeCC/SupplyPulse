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
const { logTool } = require("../../logger");

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
 * @param {{ runId?:string, supplierId?:string }} [ctx]
 * @returns {Promise<{ scoreId: string }>}
 */
async function persistScore(supplierId, scoreResult, signals, ctx = {}) {
  const { runId } = ctx;
  const supabase = getServiceClient();

  // 1 ── Insert score row ──────────────────────────────────────────────────────
  const t0 = Date.now();
  let scoreId;
  try {
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
      throw new Error(`Failed to insert score: ${scoreErr.message}`);
    }

    scoreId = scoreRow.id;
    console.log(`[persistScore] Inserted score row ${scoreId}`);

    logTool({
      tool:      "persistScore",
      step:      "persist_score",
      supplierId,
      runId,
      latencyMs: Date.now() - t0,
      success:   true,
    });
  } catch (err) {
    logTool({
      tool:      "persistScore",
      step:      "persist_score",
      supplierId,
      runId,
      latencyMs: Date.now() - t0,
      success:   false,
      error:     err.message,
    });
    throw err;
  }

  // 2 ── Bulk-insert signals ───────────────────────────────────────────────────
  if (signals.length > 0) {
    const t1 = Date.now();
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

    try {
      const { error: signalErr } = await supabase
        .from("supplier_signals")
        .insert(rows);

      if (signalErr) throw new Error(signalErr.message);

      console.log(`[persistScore] Inserted ${rows.length} signals`);
      logTool({
        tool:      "persistSignals",
        step:      "persist_signals",
        supplierId,
        runId,
        latencyMs: Date.now() - t1,
        success:   true,
      });
    } catch (err) {
      // Non-fatal — the score row already exists; partial data is better
      // than a hard failure the UI can't recover from. Log but do NOT rethrow.
      console.error(`[persistScore] Signal insert error (non-fatal): ${err.message}`);
      logTool({
        tool:      "persistSignals",
        step:      "persist_signals",
        supplierId,
        runId,
        latencyMs: Date.now() - t1,
        success:   false,
        error:     err.message,
      });
    }
  }

  return { scoreId };
}

module.exports = { persistScore };
