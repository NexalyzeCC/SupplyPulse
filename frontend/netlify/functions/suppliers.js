const { verifyUser } = require("./lib/auth");
const { createServiceClient } = require("./lib/supabase");

exports.handler = async (event) => {
  try {
    const supabase = createServiceClient();

    // Verify auth on every request
    const { user, error: authError } = await verifyUser(event);
    if (authError) {
      return { statusCode: 401, body: JSON.stringify({ error: authError }) };
    }

    const method = event.httpMethod;

    // GET - list all suppliers for the authenticated user
    if (method === "GET") {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*, scores(score, risk, scored_at)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
      }

      return { statusCode: 200, body: JSON.stringify(data) };
    }

    // POST - add a new supplier for the authenticated user
    if (method === "POST") {
      const { name, country, category } = JSON.parse(event.body);

      if (!name) {
        return { statusCode: 400, body: JSON.stringify({ error: "name is required" }) };
      }

      const { data, error } = await supabase
        .from("suppliers")
        .insert({ name, country, category, user_id: user.id })
        .select()
        .single();

      if (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
      }

      return { statusCode: 201, body: JSON.stringify(data) };
    }

    // DELETE - only allow deleting the user's own suppliers
    if (method === "DELETE") {
      const supplierId = event.queryStringParameters?.supplierId;

      if (!supplierId) {
        return { statusCode: 400, body: JSON.stringify({ error: "supplierId is required" }) };
      }

      const { data: existing, error: fetchError } = await supabase
        .from("suppliers")
        .select("id")
        .eq("id", supplierId)
        .eq("user_id", user.id)
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
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
