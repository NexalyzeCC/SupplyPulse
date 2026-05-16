/**
 * POST /.netlify/functions/score-supplier
 *
 * Body: { supplierId: string, supplierName?: string, country?: string, category?: string }
 *
 * Auth:
 *   • Normal callers  — Bearer token verified via verifyUser()
 *   • Scheduled scans — X-Scheduled-Secret header matching SCHEDULED_SECRET env var
 *     (scheduled-scan.js cannot carry a user JWT, so it uses a shared secret instead)
 *
 * Delegates to runAgentLoop() which runs the full multi-step AI pipeline:
 *   1. Idempotency check (skip if already scored today)
 *   2. Parallel web searches (Tavily primary, Serper fallback)
 *   3. Signal extraction  (GPT-4o-mini)
 *   4. Score synthesis    (GPT-4o)
 *   5. Persist            (supplier_scores + supplier_signals)
 *   6. Alert              (email via Resend + Slack webhook if triggered)
 *
 * Returns: { ok: true, status, scoreId, score, direction }
 */

const { runAgentLoop } = require("./lib/agent/loop");
const { verifyUser }   = require("./lib/auth");

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
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

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  if (!isScheduledCall(event)) {
    const { user, error: authError } = await verifyUser(event);
    if (!user) {
      return json(401, { error: authError ?? "Unauthorized" });
    }
  }

  // ── Body parsing ──────────────────────────────────────────────────────────
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const { supplierId, supplierName, country, category } = body;

  if (!supplierId || typeof supplierId !== "string") {
    return json(400, { error: "supplierId (string) is required" });
  }

  // ── Run agent ─────────────────────────────────────────────────────────────
  try {
    const result = await runAgentLoop(supplierId, {
      supplierName: supplierName ?? undefined,
      country:      country      ?? undefined,
      category:     category     ?? undefined,
    });

    return json(200, { ok: true, ...result });
  } catch (err) {
    console.error("[score-supplier] Unhandled error:", err);
    return json(500, { error: err.message ?? "Internal server error" });
  }
};
