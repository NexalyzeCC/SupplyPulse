/**
 * scheduled-scan — daily cron that re-scores suppliers.
 *
 * Tier rules:
 *   • Pro / Enterprise  → scanned every day
 *   • Starter           → scanned only on Mondays (UTC)
 *   • status !== active → never scanned
 *
 * Each eligible supplier is fanned out to /.netlify/functions/score-supplier
 * via fetch, authenticated with X-Scheduled-Secret. Batched in groups of 5
 * with a 2s pause between batches to respect rate limits.
 */

const { schedule } = require("@netlify/functions");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function invokeScan(s) {
  return fetch(`${process.env.URL}/.netlify/functions/score-supplier`, {
    method: "POST",
    headers: {
      "Content-Type":       "application/json",
      "X-Scheduled-Secret": process.env.SCHEDULED_SECRET ?? "",
    },
    body: JSON.stringify({
      supplierId:   s.id,
      supplierName: s.name,
      country:      s.country,
      category:     s.category,
    }),
  });
}

const handler = async () => {
  // Compute eligibility day inside the handler (not module scope) so each
  // invocation uses the current weekday — module evaluation is cached on
  // warm Lambdas and would freeze the value across days.
  const day = new Date().getUTCDay();   // 0 = Sun, 1 = Mon
  const isWeeklyDay = day === 1;        // Starter runs on Mondays only

  console.log(
    `[scheduled-scan] Starting (day=${day}, isWeeklyDay=${isWeeklyDay})`,
    new Date().toISOString()
  );

  // ── 1. Load all suppliers ────────────────────────────────────────────────
  // We use two queries instead of a PostgREST embedded join because
  // suppliers and user_subscriptions have no direct FK between them —
  // they only share auth.users(id) as a parent. Embedding fails (or picks
  // the wrong relationship) without a direct FK; two queries are reliable.
  const { data: suppliers, error: sErr } = await supabase
    .from("suppliers")
    .select("id, name, country, category, user_id");

  if (sErr) {
    console.error("[scheduled-scan] suppliers query error:", sErr.message);
    return { statusCode: 500 };
  }

  if (!suppliers?.length) {
    console.log("[scheduled-scan] No suppliers found");
    return { statusCode: 200 };
  }

  // ── 2. Load subscriptions only for those users (deduplicated) ─────────────
  const userIds = [...new Set(suppliers.map((s) => s.user_id).filter(Boolean))];
  const { data: subs, error: subErr } = await supabase
    .from("user_subscriptions")
    .select("user_id, tier, status")
    .in("user_id", userIds);

  if (subErr) {
    console.error("[scheduled-scan] subscriptions query error:", subErr.message);
    return { statusCode: 500 };
  }

  const subByUser = new Map((subs ?? []).map((r) => [r.user_id, r]));

  // ── 3. Apply tier filter in JS ────────────────────────────────────────────
  const eligible = suppliers.filter((s) => {
    const sub = subByUser.get(s.user_id);
    if (!sub || sub.status !== "active") return false;
    const tier = sub.tier;
    if (tier === "pro" || tier === "enterprise") return true;  // daily
    if (tier === "starter") return isWeeklyDay;                // Mondays
    return false;
  });

  console.log(
    `[scheduled-scan] ${eligible.length} eligible / ${suppliers.length} total suppliers`
  );

  if (eligible.length === 0) {
    return { statusCode: 200 };
  }

  for (let i = 0; i < eligible.length; i += 5) {
    const batch = eligible.slice(i, i + 5);
    await Promise.allSettled(batch.map(invokeScan));
    if (i + 5 < eligible.length) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(`[scheduled-scan] Done — ${eligible.length} suppliers scanned`);
  return { statusCode: 200 };
};

exports.handler = schedule("0 6 * * *", handler);
