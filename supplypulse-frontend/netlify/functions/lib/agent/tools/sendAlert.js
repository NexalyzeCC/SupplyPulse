/**
 * sendAlert — fires notifications when a supplier's risk profile deteriorates.
 *
 * Fires when EITHER condition holds:
 *   • score < supplier.alert_threshold           (crossed the line)
 *   • score dropped >= 10 points vs last scan    (sharp fall, even if healthy)
 *
 * The second rule is what the alerts page has always promised users; a fall
 * from 95 to 80 is worth knowing about well above any threshold.
 *
 * Recipients resolve per-user from `alert_recipients` — rows for this specific
 * supplier plus the owner's account-wide rows. ALERT_TO_EMAIL survives only as
 * a local-dev fallback when the table yields nothing.
 *
 * Guards against duplicates via a unique index on (supplier_id, score_id).
 *
 * Returns: { alerted: boolean, channels: string[] }
 */

const { createClient } = require("@supabase/supabase-js");
const { Resend }       = require("resend");
const { buildAlertEmail, buildSlackPayload } = require("../../email-template");

const DROP_THRESHOLD = 10;

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
}

/**
 * Most recent score for this supplier excluding the one we just wrote.
 * @returns {Promise<number|null>}
 */
async function fetchPreviousScore(supabase, supplierId, currentScoreId) {
  const { data, error } = await supabase
    .from("supplier_scores")
    .select("score")
    .eq("supplier_id", supplierId)
    .neq("id", currentScoreId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[sendAlert] Previous-score lookup failed (non-fatal):", error.message);
    return null;
  }
  return data?.score ?? null;
}

/**
 * Enabled recipients for this supplier: rows targeting it directly, plus the
 * owner's account-wide rows (supplier_id IS NULL).
 * @returns {Promise<{ emails:string[], slackUrls:string[] }>}
 */
async function resolveRecipients(supabase, supplier) {
  const { data, error } = await supabase
    .from("alert_recipients")
    .select("channel, destination")
    .eq("user_id", supplier.user_id)
    .eq("enabled", true)
    .or(`supplier_id.eq.${supplier.id},supplier_id.is.null`);

  if (error) {
    console.error("[sendAlert] Recipient lookup failed:", error.message);
    return { emails: [], slackUrls: [] };
  }

  const emails    = new Set();
  const slackUrls = new Set();

  for (const row of data ?? []) {
    if (row.channel === "email" && row.destination) emails.add(row.destination);
    if (row.channel === "slack" && row.destination) slackUrls.add(row.destination);
  }

  // Per-supplier webhook on the supplier row is additive, not exclusive.
  if (supplier.slack_webhook) slackUrls.add(supplier.slack_webhook);

  // Dev-only safety net so a misconfigured local env still shows something.
  if (emails.size === 0 && process.env.ALERT_TO_EMAIL) {
    console.warn("[sendAlert] No alert_recipients rows — falling back to ALERT_TO_EMAIL");
    emails.add(process.env.ALERT_TO_EMAIL);
  }

  return { emails: [...emails], slackUrls: [...slackUrls] };
}

// ─── Public ───────────────────────────────────────────────────────────────────

/**
 * @param {{ id:string, name:string, country:string|null, category:string|null,
 *           alert_threshold:number|null, criticality:string|null,
 *           slack_webhook:string|null, user_id:string }} supplier
 * @param {{ score:number, direction:string, summary:string,
 *           recommendations:Array }} scoreResult
 * @param {string} scoreId
 * @param {Array<object>} signals
 * @returns {Promise<{ alerted:boolean, channels:string[] }>}
 */
async function sendAlert(supplier, scoreResult, scoreId, signals = []) {
  const { score } = scoreResult;
  const threshold = supplier.alert_threshold ?? 40;
  const supabase  = getServiceClient();

  // ── Trigger evaluation ─────────────────────────────────────────────────────
  const prevScore = await fetchPreviousScore(supabase, supplier.id, scoreId);

  const crossedThreshold = score < threshold;
  const droppedSharply   = prevScore != null && (prevScore - score) >= DROP_THRESHOLD;

  if (!crossedThreshold && !droppedSharply) {
    return { alerted: false, channels: [] };
  }

  console.log(
    `[sendAlert] Triggered — score ${score}` +
    (prevScore != null ? ` (was ${prevScore})` : "") +
    `, threshold ${threshold}` +
    `, reason: ${crossedThreshold ? "below-threshold" : ""}${crossedThreshold && droppedSharply ? "+" : ""}${droppedSharply ? "sharp-drop" : ""}`,
  );

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

  const { emails, slackUrls } = await resolveRecipients(supabase, supplier);

  if (emails.length === 0 && slackUrls.length === 0) {
    console.warn(`[sendAlert] No recipients configured for supplier ${supplier.id}`);
    return { alerted: false, channels: [] };
  }

  // prevScore lets the template render "82 → 71" rather than a bare number.
  const resultWithId = { ...scoreResult, scoreId, prevScore };
  const channels = [];

  // ── Email via Resend ───────────────────────────────────────────────────────
  if (process.env.RESEND_API_KEY && emails.length > 0) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const html   = buildAlertEmail(supplier, resultWithId, signals);
    const from   = process.env.ALERT_FROM_EMAIL ?? "SupplyPulse <alerts@supplypulse.app>";
    const subject = `⚠️ SupplyPulse Alert: ${supplier.name} scored ${score}/100`;

    // One send per recipient — never put customers in a shared To: header.
    const sends = await Promise.allSettled(
      emails.map((to) => resend.emails.send({ from, to: [to], subject, html })),
    );

    const delivered = sends.filter((r) => r.status === "fulfilled").length;
    sends.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`[sendAlert] Resend error for ${emails[i]} (non-fatal):`, r.reason?.message);
      }
    });

    if (delivered > 0) {
      channels.push("email");
      console.log(`[sendAlert] Email sent to ${delivered}/${emails.length} recipients`);
    }
  }

  // ── Slack webhooks ─────────────────────────────────────────────────────────
  if (slackUrls.length > 0) {
    const payload = buildSlackPayload(supplier, resultWithId, signals);
    const posts = await Promise.allSettled(
      slackUrls.map((url) =>
        fetch(url, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        }).then((res) => {
          if (!res.ok) throw new Error(`Slack webhook returned ${res.status}`);
          return res;
        }),
      ),
    );

    const delivered = posts.filter((r) => r.status === "fulfilled").length;
    posts.forEach((r) => {
      if (r.status === "rejected") {
        console.error("[sendAlert] Slack error (non-fatal):", r.reason?.message);
      }
    });

    if (delivered > 0) {
      channels.push("slack");
      console.log(`[sendAlert] Slack delivered to ${delivered}/${slackUrls.length} webhooks`);
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
