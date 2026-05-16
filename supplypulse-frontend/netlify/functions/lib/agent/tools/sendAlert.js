/**
 * sendAlert — fires notifications when a supplier score crosses its threshold.
 *
 * Guards against duplicate alerts with an idempotency check against `alert_log`.
 * Fires when: current score < supplier.alert_threshold AND no alert_log row
 * already exists for this (supplier_id, score_id) pair.
 *
 * Channels:
 *   • Email — Resend (RESEND_API_KEY, ALERT_FROM_EMAIL, ALERT_TO_EMAIL)
 *   • Slack — per-supplier webhook URL stored in suppliers.slack_webhook
 *
 * Returns: { alerted: boolean, channels: string[] }
 */

const { createClient }    = require("@supabase/supabase-js");
const { Resend }          = require("resend");
const { buildAlertEmail, buildSlackPayload } = require("../../email-template");

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
}

// ─── Public ───────────────────────────────────────────────────────────────────

/**
 * @param {{ id:string, name:string, country:string|null, category:string|null,
 *           alert_threshold:number|null, criticality:string|null,
 *           slack_webhook:string|null, user_id:string }} supplier
 * @param {{ score:number, direction:string, summary:string,
 *           recommendations:Array }}  scoreResult
 * @param {string} scoreId
 * @param {Array<{ type:string, severity:string, summary:string,
 *                 source_url:string|null, source_title:string|null,
 *                 confidence:number }>} signals
 * @returns {Promise<{ alerted:boolean, channels:string[] }>}
 */
async function sendAlert(supplier, scoreResult, scoreId, signals = []) {
  const { score, summary } = scoreResult;
  const threshold = supplier.alert_threshold ?? 40;

  if (score >= threshold) {
    return { alerted: false, channels: [] };
  }

  const supabase = getServiceClient();

  // ── Idempotency ────────────────────────────────────────────────────────────
  const { data: existing } = await supabase
    .from("alert_log")
    .select("id")
    .eq("supplier_id", supplier.id)
    .eq("score_id",    scoreId)
    .maybeSingle();

  if (existing) {
    console.log("[sendAlert] Alert already sent for this score — skipping");
    return { alerted: false, channels: [] };
  }

  // Attach scoreId to the result object so the template can render it
  const resultWithId = { ...scoreResult, scoreId };

  const channels = [];

  // ── Email via Resend ───────────────────────────────────────────────────────
  if (process.env.RESEND_API_KEY && process.env.ALERT_TO_EMAIL) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from:    process.env.ALERT_FROM_EMAIL ?? "SupplyPulse <alerts@supplypulse.app>",
        to:      [process.env.ALERT_TO_EMAIL],
        subject: `⚠️ SupplyPulse Alert: ${supplier.name} scored ${score}/100`,
        html:    buildAlertEmail(supplier, resultWithId, signals),
      });
      channels.push("email");
      console.log("[sendAlert] Email sent via Resend");
    } catch (err) {
      console.error("[sendAlert] Resend error (non-fatal):", err.message);
    }
  }

  // ── Slack webhook ──────────────────────────────────────────────────────────
  if (supplier.slack_webhook) {
    try {
      const payload = buildSlackPayload(supplier, scoreResult, signals);
      const res = await fetch(supplier.slack_webhook, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (res.ok) {
        channels.push("slack");
        console.log("[sendAlert] Slack webhook delivered");
      } else {
        console.warn("[sendAlert] Slack webhook returned", res.status);
      }
    } catch (err) {
      console.error("[sendAlert] Slack error (non-fatal):", err.message);
    }
  }

  // ── Persist to alert_log ───────────────────────────────────────────────────
  if (channels.length > 0) {
    const { error } = await supabase.from("alert_log").insert({
      supplier_id: supplier.id,
      score_id:    scoreId,
      score,
      channels,
    });
    if (error) {
      console.error("[sendAlert] alert_log insert error:", error.message);
    }
  }

  return { alerted: channels.length > 0, channels };
}

module.exports = { sendAlert };
