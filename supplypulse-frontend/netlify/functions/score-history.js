/**
 * GET /.netlify/functions/score-history?supplierId={id}
 *
 * Returns the score trajectory for a single supplier (newest 30 rows,
 * ordered ascending so charts render left-to-right).
 *
 * Auth: Bearer token required.
 * Ownership: confirms the supplier belongs to the authenticated user before
 * returning any data.
 *
 * Response: Array<{ id, score, direction, summary, created_at }>
 */

const { createClient } = require("@supabase/supabase-js");
const { verifyUser }   = require("./lib/auth");

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const { user, error: authError } = await verifyUser(event);
  if (!user) {
    return json(401, { error: authError ?? "Unauthorized" });
  }

  // ── Input ──────────────────────────────────────────────────────────────────
  const supplierId = event.queryStringParameters?.supplierId;
  if (!supplierId) {
    return json(400, { error: "supplierId query param is required" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  try {
    // ── Ownership check ───────────────────────────────────────────────────────
    const { data: supplier, error: supplierErr } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", supplierId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (supplierErr) {
      return json(500, { error: supplierErr.message });
    }

    if (!supplier) {
      return json(404, { error: "Supplier not found" });
    }

    // ── Fetch score history ───────────────────────────────────────────────────
    const { data, error } = await supabase
      .from("supplier_scores")
      .select("id, score, direction, summary, created_at")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: true }) // ascending for chart x-axis
      .limit(30);

    if (error) {
      console.error("[score-history] Query error:", error.message);
      return json(500, { error: error.message });
    }

    return json(200, data ?? []);
  } catch (err) {
    console.error("[score-history] Unhandled error:", err);
    return json(500, { error: err.message });
  }
};
