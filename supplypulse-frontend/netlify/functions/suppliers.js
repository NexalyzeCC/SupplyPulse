/**
 * /.netlify/functions/suppliers
 *
 * GET    — list the authenticated user's suppliers with their latest score
 * POST   — create a new supplier (tier-gated: Starter ≤ 3, Pro ≤ 25)
 * PUT    — update an existing supplier (ownership check)
 * DELETE — delete an existing supplier (ownership check)
 *
 * All methods require a valid Bearer token verified via verifyUser().
 */

const { createClient } = require("@supabase/supabase-js");
const { verifyUser }   = require("./lib/auth");

// ─── Tier limits ──────────────────────────────────────────────────────────────

const TIER_LIMITS = {
  starter:    3,
  pro:        25,
  enterprise: Infinity,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
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

/**
 * Returns the user's tier from `user_profiles`. Defaults to "starter" so
 * we fail-safe (restrictive) if the profile row is missing.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<string>}
 */
async function getUserTier(supabase, userId) {
  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("tier")
      .eq("id", userId)
      .maybeSingle();

    return data?.tier ?? "starter";
  } catch {
    return "starter";
  }
}

/**
 * Counts how many suppliers the user currently owns.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function countSuppliers(supabase, userId) {
  const { count, error } = await supabase
    .from("suppliers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  // ── Auth (all methods) ─────────────────────────────────────────────────────
  const { user, error: authError } = await verifyUser(event);
  if (!user) {
    return json(401, { error: authError ?? "Unauthorized" });
  }

  const supabase = getServiceClient();
  const method   = event.httpMethod;

  // ── GET — list suppliers with latest score ─────────────────────────────────
  if (method === "GET") {
    const { data, error } = await supabase
      .from("suppliers")
      .select(`
        *,
        supplier_scores ( id, score, direction, created_at )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return json(500, { error: error.message });
    }

    // Collapse the supplier_scores array to just the most recent entry
    const suppliers = (data ?? []).map((s) => {
      const scores = Array.isArray(s.supplier_scores) ? s.supplier_scores : [];
      scores.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const { supplier_scores: _raw, ...rest } = s;
      return { ...rest, latest_score: scores[0] ?? null };
    });

    return json(200, suppliers);
  }

  // ── POST — create a new supplier ───────────────────────────────────────────
  if (method === "POST") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    const { name, country, category, criticality, alert_threshold, slack_webhook } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return json(400, { error: "name is required" });
    }

    if (
      alert_threshold !== undefined &&
      (typeof alert_threshold !== "number" || alert_threshold < 0 || alert_threshold > 100)
    ) {
      return json(400, { error: "alert_threshold must be a number between 0 and 100" });
    }

    // ── Tier gate ────────────────────────────────────────────────────────────
    const [tier, currentCount] = await Promise.all([
      getUserTier(supabase, user.id),
      countSuppliers(supabase, user.id),
    ]);

    const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.starter;

    if (currentCount >= limit) {
      return json(403, {
        error: `Supplier limit reached for your ${tier} plan (${limit} max). Upgrade to add more.`,
        code:  "TIER_LIMIT_EXCEEDED",
        tier,
        limit,
      });
    }

    // ── Insert ───────────────────────────────────────────────────────────────
    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        name:            name.trim(),
        country:         country         ?? null,
        category:        category        ?? null,
        criticality:     criticality     ?? "medium",
        alert_threshold: alert_threshold ?? 40,
        slack_webhook:   slack_webhook   ?? null,
        user_id:         user.id,
      })
      .select()
      .single();

    if (error) {
      return json(500, { error: error.message });
    }

    return json(201, data);
  }

  // ── PUT — update an existing supplier ─────────────────────────────────────
  if (method === "PUT") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    const {
      supplierId,
      name,
      country,
      category,
      criticality,
      alert_threshold,
      slack_webhook,
    } = body;

    if (!supplierId || typeof supplierId !== "string") {
      return json(400, { error: "supplierId is required" });
    }

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return json(400, { error: "name must be a non-empty string" });
    }

    if (
      alert_threshold !== undefined &&
      (typeof alert_threshold !== "number" || alert_threshold < 0 || alert_threshold > 100)
    ) {
      return json(400, { error: "alert_threshold must be a number between 0 and 100" });
    }

    // ── Ownership check ──────────────────────────────────────────────────────
    const { data: existing, error: fetchErr } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", supplierId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchErr) {
      return json(500, { error: fetchErr.message });
    }

    if (!existing) {
      return json(404, { error: "Supplier not found or access denied" });
    }

    // ── Build update payload (only include provided fields) ──────────────────
    const updates = {};
    if (name            !== undefined) updates.name            = name.trim();
    if (country         !== undefined) updates.country         = country         ?? null;
    if (category        !== undefined) updates.category        = category        ?? null;
    if (criticality     !== undefined) updates.criticality     = criticality;
    if (alert_threshold !== undefined) updates.alert_threshold = alert_threshold;
    if (slack_webhook   !== undefined) updates.slack_webhook   = slack_webhook   ?? null;

    if (Object.keys(updates).length === 0) {
      return json(400, { error: "No fields to update" });
    }

    // ── Update ───────────────────────────────────────────────────────────────
    const { data, error } = await supabase
      .from("suppliers")
      .update(updates)
      .eq("id", supplierId)
      .select()
      .single();

    if (error) {
      return json(500, { error: error.message });
    }

    return json(200, data);
  }

  // ── DELETE — remove a supplier ─────────────────────────────────────────────
  if (method === "DELETE") {
    const supplierId = event.queryStringParameters?.supplierId;

    if (!supplierId) {
      return json(400, { error: "supplierId query param is required" });
    }

    // ── Ownership check ──────────────────────────────────────────────────────
    const { data: existing, error: fetchErr } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", supplierId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchErr) {
      return json(500, { error: fetchErr.message });
    }

    if (!existing) {
      return json(404, { error: "Supplier not found or access denied" });
    }

    const { error } = await supabase
      .from("suppliers")
      .delete()
      .eq("id", supplierId);

    if (error) {
      return json(500, { error: error.message });
    }

    return json(200, { success: true });
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};
