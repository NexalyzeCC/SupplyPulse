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
const { HEADERS, preflight } = require("./lib/cors");
const {
  sanitizeText,
  sanitizeSupplierName,
  sanitizeUrl,
} = require("./lib/sanitize");

const VALID_CRITICALITY = new Set(["low", "medium", "high", "critical"]);

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

// ─── Handler ──────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const pre = preflight(event);
  if (pre) return pre;

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

    if (criticality !== undefined && !VALID_CRITICALITY.has(criticality)) {
      return json(400, { error: "criticality must be low, medium, high, or critical" });
    }

    // ── Sanitize all user-supplied strings ───────────────────────────────────
    const cleanName = sanitizeSupplierName(name);
    if (!cleanName) {
      return json(400, { error: "name is invalid after sanitisation" });
    }
    const cleanCountry  = country  != null ? sanitizeText(country,  80) : null;
    const cleanCategory = category != null ? sanitizeText(category, 80) : null;

    let cleanSlack = null;
    if (slack_webhook != null && slack_webhook !== "") {
      cleanSlack = sanitizeUrl(slack_webhook);
      if (!cleanSlack) {
        return json(400, { error: "slack_webhook must be a valid http(s) URL" });
      }
    }

    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("tier, status")
      .eq("user_id", user.id)
      .single();
    const tier = sub?.status === "active" ? (sub?.tier || "starter") : "starter";

    const { count } = await supabase
      .from("suppliers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count >= TIER_LIMITS[tier]) {
      return json(403, {
        error: "supplier_limit_reached",
        tier,
        limit: TIER_LIMITS[tier],
      });
    }

    // ── Insert ───────────────────────────────────────────────────────────────
    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        name:            cleanName,
        country:         cleanCountry,
        category:        cleanCategory,
        criticality:     criticality     ?? "medium",
        alert_threshold: alert_threshold ?? 40,
        slack_webhook:   cleanSlack,
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

    if (criticality !== undefined && !VALID_CRITICALITY.has(criticality)) {
      return json(400, { error: "criticality must be low, medium, high, or critical" });
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

    // ── Build update payload (only include provided fields, sanitised) ───────
    const updates = {};
    if (name !== undefined) {
      const cleanName = sanitizeSupplierName(name);
      if (!cleanName) {
        return json(400, { error: "name is invalid after sanitisation" });
      }
      updates.name = cleanName;
    }
    if (country !== undefined) {
      updates.country = country != null ? sanitizeText(country, 80) : null;
    }
    if (category !== undefined) {
      updates.category = category != null ? sanitizeText(category, 80) : null;
    }
    if (criticality     !== undefined) updates.criticality     = criticality;
    if (alert_threshold !== undefined) updates.alert_threshold = alert_threshold;
    if (slack_webhook !== undefined) {
      if (slack_webhook == null || slack_webhook === "") {
        updates.slack_webhook = null;
      } else {
        const cleanSlack = sanitizeUrl(slack_webhook);
        if (!cleanSlack) {
          return json(400, { error: "slack_webhook must be a valid http(s) URL" });
        }
        updates.slack_webhook = cleanSlack;
      }
    }

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

  return { statusCode: 405, headers: HEADERS, body: "Method Not Allowed" };
};
