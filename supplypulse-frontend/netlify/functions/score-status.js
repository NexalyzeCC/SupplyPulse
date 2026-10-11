/**
 * GET /.netlify/functions/score-status?id={supplierId}
 *
 * Polled by useScanPolling every 5 s after a scan is triggered.
 *
 * Auth: Bearer token required (verified via Supabase Auth).
 * Ownership: confirms the supplier belongs to the requesting user.
 *
 * Response shape matches StatusResponse in useScanPolling.ts:
 *   { status: "running" }
 *   { status: "complete", score: number, direction: string, scoreId: string }
 *   { status: "failed",   message?: string }
 *
 * "complete" is returned when the latest supplier_scores row was created
 * within the last 5 minutes — i.e. it belongs to the scan we just triggered.
 */

const { createClient }  = require("@supabase/supabase-js");
const { verifyUser }    = require("./lib/auth");
const { HEADERS, preflight } = require("./lib/cors");
const { captureError } = require("./lib/sentry");

const RECENT_WINDOW_MS = 5 * 60 * 1_000; // 5 minutes

function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  const pre = preflight(event);
  if (pre) return pre;

  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: HEADERS, body: "Method Not Allowed" };
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const { user, error: authError } = await verifyUser(event);
  if (!user) {
    return json(401, { status: "failed", message: authError ?? "Unauthorized" });
  }

  // ── Input validation ───────────────────────────────────────────────────────
  const supplierId = event.queryStringParameters?.id;
  if (!supplierId) {
    return json(400, { status: "failed", message: "id query param is required" });
  }

  // Use service-role client for all reads (bypasses anon RLS restrictions on
  // functions that don't carry a cookie-based session).
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

    try {
    // ── Ownership check ──────────────────────────────────────────────────────
    const { data: supplier, error: supplierErr } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", supplierId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (supplierErr) return json(500, { status: "failed", message: supplierErr.message });
    if (!supplier)   return json(404, { status: "failed", message: "Supplier not found" });

    // ── Most recent job for this supplier ────────────────────────────────────
    const { data: job, error: jobErr } = await supabase
      .from("scan_jobs")
      .select("id, status, error, score_id, created_at")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (jobErr) return json(500, { status: "failed", message: jobErr.message });

    if (!job) {
      // No job was ever enqueued for this supplier.
      return json(200, { status: "idle" });
    }

    if (job.status === "queued")  return json(200, { status: "queued" });
    if (job.status === "running") return json(200, { status: "running" });

    if (job.status === "failed") {
      return json(200, {
        status:  "failed",
        message: job.error ?? "The agent scan failed. Please try again.",
      });
    }

    // ── done — return the score the job produced ─────────────────────────────
    const { data: score, error: scoreErr } = await supabase
      .from("supplier_scores")
      .select("id, score, direction")
      .eq("id", job.score_id)
      .maybeSingle();

    if (scoreErr) return json(500, { status: "failed", message: scoreErr.message });

    if (!score) {
      // Job completed but was skipped by the idempotency guard — fall back to
      // the latest score so the UI still resolves.
      const { data: latest } = await supabase
        .from("supplier_scores")
        .select("id, score, direction")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latest) return json(200, { status: "running" });

      return json(200, {
        status:    "complete",
        score:     latest.score,
        direction: latest.direction,
        scoreId:   latest.id,
      });
    }

    return json(200, {
      status:    "complete",
      score:     score.score,
      direction: score.direction,
      scoreId:   score.id,
    });
  } catch (err) {
    captureError(err, { fn: "score-status", supplierId });
    console.error("[score-status] Unhandled error:", err);
    return json(500, { status: "failed", message: err.message });
  }
};
