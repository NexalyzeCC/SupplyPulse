/**
 * POST /.netlify/functions/score-supplier
 *
 * Body: { supplierId: string, forceRefresh?: boolean }
 *
 * Enqueues a scan and returns 202 immediately. The actual agent loop runs in
 * scan-worker-background, which has a 15-minute budget instead of this
 * endpoint's 10 seconds.
 *
 * Auth:
 *   • Normal callers  — Bearer token verified via verifyUser()
 *   • Scheduled scans — X-Scheduled-Secret header matching SCHEDULED_SECRET
 *
 * Returns: { ok: true, jobId, status: "queued" | "already_queued" }
 */

const { createClient } = require("@supabase/supabase-js");
const { verifyUser }   = require("./lib/auth");
const { HEADERS, preflight } = require("./lib/cors");
const { captureError } = require("./lib/sentry");

function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
}

/** Returns true when the request comes from the trusted scheduler. */
function isScheduledCall(event) {
  const secret = process.env.SCHEDULED_SECRET;
  if (!secret) return false; // secret not configured — never trust
  const header =
    event.headers?.["x-scheduled-secret"] ??
    event.headers?.["X-Scheduled-Secret"] ??
    "";
  return header === secret;
}

/** Fire-and-forget kick so a queued job starts without waiting for the cron. */
async function kickWorker() {
  const base = process.env.URL ?? process.env.APP_URL;
  if (!base) return;
  try {
    await fetch(`${base}/.netlify/functions/scan-worker-background`, {
      method:  "POST",
      headers: { "X-Scheduled-Secret": process.env.SCHEDULED_SECRET ?? "" },
    });
  } catch (err) {
    // Non-fatal: the job is queued and the cron will drain it regardless.
    console.warn("[score-supplier] Worker kick failed (non-fatal):", err.message);
  }
}

exports.handler = async (event) => {
  const pre = preflight(event);
  if (pre) return pre;

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: HEADERS, body: "Method Not Allowed" };
  }

  const scheduled = isScheduledCall(event);
  let authedUserId = null;

  if (!scheduled) {
    const { user, error: authError } = await verifyUser(event);
    if (!user) return json(401, { error: authError ?? "Unauthorized" });
    authedUserId = user.id;
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return json(400, { error: "Invalid JSON body" }); }

  const { supplierId, forceRefresh = false } = body;
  if (!supplierId || typeof supplierId !== "string") {
    return json(400, { error: "supplierId (string) is required" });
  }

  const supabase = getServiceClient();

  try {
    // ── Resolve owner + confirm access ───────────────────────────────────────
    // Service-role bypasses RLS, so ownership is enforced here in handler code.
    const { data: supplier, error: supErr } = await supabase
      .from("suppliers")
      .select("id, user_id")
      .eq("id", supplierId)
      .maybeSingle();

    if (supErr)    return json(500, { error: supErr.message });
    if (!supplier) return json(404, { error: "Supplier not found" });

    if (!scheduled && supplier.user_id !== authedUserId) {
      // Same response as a missing supplier — don't confirm it exists.
      return json(404, { error: "Supplier not found" });
    }

    // ── Enqueue ──────────────────────────────────────────────────────────────
    const { data: job, error: jobErr } = await supabase
      .from("scan_jobs")
      .insert({
        supplier_id:   supplierId,
        user_id:       supplier.user_id,
        force_refresh: Boolean(forceRefresh),
      })
      .select("id")
      .single();

    if (jobErr) {
      // Unique partial index — a scan is already queued or running.
      if (jobErr.code === "23505") {
        const { data: active } = await supabase
          .from("scan_jobs")
          .select("id")
          .eq("supplier_id", supplierId)
          .in("status", ["queued", "running"])
          .maybeSingle();
        return json(202, {
          ok: true,
          jobId: active?.id ?? null,
          status: "already_queued",
        });
      }
      return json(500, { error: jobErr.message });
    }

    await kickWorker();

    return json(202, { ok: true, jobId: job.id, status: "queued" });
  } catch (err) {
    captureError(err, { fn: "score-supplier", supplierId });
    console.error("[score-supplier] Unhandled error:", err);
    return json(500, { error: err.message ?? "Internal server error" });
  }
};
