/**
 * /.netlify/functions/alert-recipients
 *
 * GET    — list the authenticated user's alert destinations
 * POST   — add one   { channel, destination, supplier_id? }
 * PATCH  — toggle    { id, enabled }
 * DELETE — remove    ?id=<uuid>
 *
 * Auth: Bearer token required. user_id always comes from the verified JWT —
 * the client must never supply it.
 */

const { createClient } = require("@supabase/supabase-js");
const { verifyUser }   = require("./lib/auth");
const { HEADERS, preflight } = require("./lib/cors");
const { sanitizeText, sanitizeUrl } = require("./lib/sanitize");
const { captureError } = require("./lib/sentry");

const VALID_CHANNELS = new Set(["email", "slack"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

exports.handler = async (event) => {
  const pre = preflight(event);
  if (pre) return pre;

  const { user, error: authError } = await verifyUser(event);
  if (!user) return json(401, { error: authError ?? "Unauthorized" });

  const supabase = getServiceClient();
  const method   = event.httpMethod;

  try {
    // ── GET ────────────────────────────────────────────────────────────────
    if (method === "GET") {
      const { data, error } = await supabase
        .from("alert_recipients")
        .select("id, supplier_id, channel, destination, enabled, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) return json(500, { error: error.message });
      return json(200, data ?? []);
    }

    // ── POST ───────────────────────────────────────────────────────────────
    if (method === "POST") {
      let body;
      try { body = JSON.parse(event.body || "{}"); }
      catch { return json(400, { error: "Invalid JSON body" }); }

      const { channel, destination, supplier_id } = body;

      if (!VALID_CHANNELS.has(channel)) {
        return json(400, { error: "channel must be email or slack" });
      }
      if (!destination || typeof destination !== "string") {
        return json(400, { error: "destination is required" });
      }

      let clean;
      if (channel === "email") {
        clean = sanitizeText(destination, 254);
        if (!EMAIL_RE.test(clean)) {
          return json(400, { error: "destination must be a valid email address" });
        }
      } else {
        clean = sanitizeUrl(destination);
        if (!clean) {
          return json(400, { error: "destination must be a valid http(s) webhook URL" });
        }
      }

      // If scoped to a supplier, prove the user owns it.
      if (supplier_id) {
        const { data: owned } = await supabase
          .from("suppliers")
          .select("id")
          .eq("id", supplier_id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!owned) return json(404, { error: "Supplier not found" });
      }

      const { data, error } = await supabase
        .from("alert_recipients")
        .insert({
          user_id:     user.id,
          supplier_id: supplier_id ?? null,
          channel,
          destination: clean,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return json(409, { error: "That destination is already configured" });
        }
        return json(500, { error: error.message });
      }
      return json(201, data);
    }

    // ── PATCH ──────────────────────────────────────────────────────────────
    if (method === "PATCH") {
      let body;
      try { body = JSON.parse(event.body || "{}"); }
      catch { return json(400, { error: "Invalid JSON body" }); }

      const { id, enabled } = body;
      if (!id || typeof enabled !== "boolean") {
        return json(400, { error: "id and enabled (boolean) are required" });
      }

      const { data, error } = await supabase
        .from("alert_recipients")
        .update({ enabled })
        .eq("id", id)
        .eq("user_id", user.id)     // ownership enforced here, not by RLS
        .select()
        .maybeSingle();

      if (error) return json(500, { error: error.message });
      if (!data)  return json(404, { error: "Recipient not found" });
      return json(200, data);
    }

    // ── DELETE ─────────────────────────────────────────────────────────────
    if (method === "DELETE") {
      const id = event.queryStringParameters?.id;
      if (!id) return json(400, { error: "id query param is required" });

      const { error } = await supabase
        .from("alert_recipients")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) return json(500, { error: error.message });
      return json(200, { ok: true });
    }

    return { statusCode: 405, headers: HEADERS, body: "Method Not Allowed" };
  } catch (err) {
    captureError(err, { fn: "alert-recipients", userId: user.id });
    console.error("[alert-recipients] Unhandled error:", err);
    return json(500, { error: err.message });
  }
};
