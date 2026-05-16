const { verifyUser } = require("./lib/auth");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  // Verify auth on every request
  const { user, error: authError } = await verifyUser(event);
  if (authError) {
    return { statusCode: 401, body: JSON.stringify({ error: authError }) };
  }

  const method = event.httpMethod;

  // GET — list all suppliers for the authenticated user
  if (method === "GET") {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*, scores(score, risk, scored_at)")
      .eq("user_id", user.id)  // use verified user.id, not query param
      .order("created_at", { ascending: false });

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    return { statusCode: 200, body: JSON.stringify(data) };
  }

  // POST — add a new supplier for the authenticated user
  if (method === "POST") {
    const { name, country, category } = JSON.parse(event.body);

    if (!name) {
      return { statusCode: 400, body: JSON.stringify({ error: "name is required" }) };
    }

    const { data, error } = await supabase
      .from("suppliers")
      .insert({ name, country, category, user_id: user.id })  // user.id from JWT
      .select()
      .single();

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    return { statusCode: 201, body: JSON.stringify(data) };
  }

  // DELETE — only allow deleting the user's own suppliers
  if (method === "DELETE") {
    const supplierId = event.queryStringParameters?.supplierId;

    if (!supplierId) {
      return { statusCode: 400, body: JSON.stringify({ error: "supplierId is required" }) };
    }

    // Verify this supplier belongs to the authenticated user before deleting
    const { data: existing, error: fetchError } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", supplierId)
      .eq("user_id", user.id)  // ownership check
      .single();

    if (fetchError || !existing) {
      return { statusCode: 403, body: JSON.stringify({ error: "Supplier not found or access denied" }) };
    }

    const { error } = await supabase.from("suppliers").delete().eq("id", supplierId);

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};