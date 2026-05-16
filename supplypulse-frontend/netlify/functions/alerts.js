/**
 * GET /.netlify/functions/alerts
 *
 * Returns the alert history for the authenticated user's suppliers.
 *
 * Auth: Bearer token required. user.id is derived server-side — the client
 * must NOT supply a userId param (doing so would be a privilege escalation).
 *
 * Query params: none required (userId is taken from the verified JWT).
 *
 * Response: Array<AlertLogEntry> ordered newest first (max 50).
 */

const { createClient } = require("@supabase/supabase-js");
const { verifyUser }   = require("./lib/auth");
const { HEADERS, preflight } = require("./lib/cors");

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
    return json(401, { error: authError ?? "Unauthorized" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  try {
    // Join alert_log → suppliers to filter by the authenticated user's suppliers.
    // The alert_log table has: id, supplier_id, score_id, score, channels, created_at
    const { data, error } = await supabase
      .from("alert_log")
      .select(`
        id,
        score,
        channels,
        created_at,
        supplier_id,
        score_id,
        suppliers!inner ( id, name, country, user_id )
      `)
      .eq("suppliers.user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[alerts] Query error:", error.message);
      return json(500, { error: error.message });
    }

    // Normalise: strip the nested user_id before sending to the client
    const entries = (data ?? []).map((row) => ({
      id:          row.id,
      supplier_id: row.supplier_id,
      score_id:    row.score_id,
      score:       row.score,
      channels:    row.channels ?? [],
      created_at:  row.created_at,
      supplier: {
        id:      row.suppliers?.id,
        name:    row.suppliers?.name,
        country: row.suppliers?.country ?? null,
      },
    }));

    return json(200, entries);
  } catch (err) {
    console.error("[alerts] Unhandled error:", err);
    return json(500, { error: err.message });
  }
};
