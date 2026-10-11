/**
 * scan-worker-background — drains the scan_jobs queue.
 *
 * The "-background" filename suffix is what grants this function Netlify's
 * 15-minute budget instead of the standard 10-second request limit. Renaming
 * it silently reintroduces the timeouts this queue exists to fix.
 *
 * Claims jobs one at a time via the claim_scan_job() RPC (FOR UPDATE SKIP
 * LOCKED), so several concurrent workers never pick up the same job.
 *
 * Auth: X-Scheduled-Secret only. Never user-facing.
 */

const { createClient } = require("@supabase/supabase-js");
const { runAgentLoop } = require("./lib/agent/loop");
const { captureError } = require("./lib/sentry");

const MAX_ATTEMPTS   = 3;
const MAX_JOBS_PER_RUN = 50;
const TIME_BUDGET_MS = 13 * 60 * 1_000;  // stop claiming with 2 min to spare

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
}

/** Exponential backoff: 1 min, then 5 min. */
function backoffMs(attempts) {
  return attempts <= 1 ? 60_000 : 300_000;
}

async function claimJob(supabase) {
  const { data, error } = await supabase.rpc("claim_scan_job");
  if (error) {
    console.error("[scan-worker] claim error:", error.message);
    return null;
  }
  return Array.isArray(data) ? data[0] ?? null : data ?? null;
}

async function completeJob(supabase, job, result) {
  await supabase
    .from("scan_jobs")
    .update({
      status:      "done",
      finished_at: new Date().toISOString(),
      score_id:    result.scoreId ?? null,
      cost_usd:    result.costUsd ?? null,
      error:       null,
    })
    .eq("id", job.id);
}

async function failJob(supabase, job, err) {
  const exhausted = job.attempts >= MAX_ATTEMPTS;

  await supabase
    .from("scan_jobs")
    .update(
      exhausted
        ? {
            status:      "failed",
            finished_at: new Date().toISOString(),
            error:       String(err.message ?? err).slice(0, 1000),
          }
        : {
            // Back to the queue for another attempt.
            status:        "queued",
            started_at:    null,
            scheduled_for: new Date(Date.now() + backoffMs(job.attempts)).toISOString(),
            error:         String(err.message ?? err).slice(0, 1000),
          },
    )
    .eq("id", job.id);

  if (exhausted) {
    captureError(err, { fn: "scan-worker", jobId: job.id, supplierId: job.supplier_id });
  }
}

exports.handler = async (event) => {
  const secret = process.env.SCHEDULED_SECRET;
  const header =
    event.headers?.["x-scheduled-secret"] ??
    event.headers?.["X-Scheduled-Secret"] ??
    "";

  if (!secret || header !== secret) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  const supabase = getServiceClient();
  const startMs  = Date.now();
  let processed = 0, succeeded = 0, failed = 0;

  console.log("[scan-worker] Draining queue…");

  while (processed < MAX_JOBS_PER_RUN && Date.now() - startMs < TIME_BUDGET_MS) {
    const job = await claimJob(supabase);
    if (!job) break;   // queue empty

    processed++;
    console.log(`[scan-worker] Job ${job.id} — supplier ${job.supplier_id} (attempt ${job.attempts})`);

    try {
      const result = await runAgentLoop(job.supplier_id, {
        forceRefresh: job.force_refresh,
      });
      await completeJob(supabase, job, result);
      succeeded++;
    } catch (err) {
      console.error(`[scan-worker] Job ${job.id} failed:`, err.message);
      await failJob(supabase, job, err);
      failed++;
    }
  }

  console.log(
    `[scan-worker] Done — ${processed} processed, ${succeeded} ok, ${failed} failed, ` +
    `${Math.round((Date.now() - startMs) / 1000)}s`,
  );

  return { statusCode: 200, body: JSON.stringify({ processed, succeeded, failed }) };
};
