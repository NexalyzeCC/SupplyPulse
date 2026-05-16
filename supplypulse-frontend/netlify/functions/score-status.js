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
    // Confirm the supplier belongs to the authenticated user before revealing
    // any score data.
    const { data: supplier, error: supplierErr } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", supplierId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (supplierErr) {
      return json(500, { status: "failed", message: supplierErr.message });
    }

    if (!supplier) {
      // Either supplier doesn't exist or it belongs to a different user.
      return json(404, { status: "failed", message: "Supplier not found" });
    }

    // ── Fetch latest score ───────────────────────────────────────────────────
    const { data, error } = await supabase
      .from("supplier_scores")
      .select("id, score, direction, created_at")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return json(500, { status: "failed", message: error.message });
    }

    if (!data) {
      // No score row exists yet — scan is still running (or hasn't started).
      return json(200, { status: "running" });
    }

    // ── Recency check ────────────────────────────────────────────────────────
    const ageMs = Date.now() - new Date(data.created_at).getTime();
    if (ageMs > RECENT_WINDOW_MS) {
      // Latest score is older than 5 minutes — scan still in flight (or stalled).
      return json(200, { status: "running" });
    }

    // Fresh score — report completion.
    return json(200, {
      status:    "complete",
      score:     data.score,
      direction: data.direction, // "improving" | "stable" | "deteriorating"
      scoreId:   data.id,
    });
  } catch (err) {
    console.error("[score-status] Unhandled error:", err);
    return json(500, { status: "failed", message: err.message });
  }
};
