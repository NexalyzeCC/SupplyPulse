const { createClient } = require("@supabase/supabase-js");
const { verifyUser } = require("./lib/auth");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { user, error: authError } = await verifyUser(event);
    if (authError) {
      return { statusCode: 401, body: JSON.stringify({ error: authError }) };
    }

    const supplierId = event.queryStringParameters?.id;
    if (!supplierId) {
      return { statusCode: 400, body: JSON.stringify({ error: "id is required" }) };
    }

    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", supplierId)
      .eq("user_id", user.id)
      .single();

    if (supplierError || !supplier) {
      return { statusCode: 404, body: JSON.stringify({ error: "Supplier not found" }) };
    }

    const { data: score, error: scoreError } = await supabase
      .from("supplier_scores")
      .select("id, score, direction")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (scoreError) {
      return { statusCode: 500, body: JSON.stringify({ error: scoreError.message }) };
    }

    if (!score) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "running" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "complete",
        score: score.score,
        direction: score.direction,
        scoreId: score.id,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
