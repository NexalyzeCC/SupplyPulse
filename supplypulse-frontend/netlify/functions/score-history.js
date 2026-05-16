const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const supplierId = event.queryStringParameters?.supplierId;

    if (!supplierId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "supplierId is required" }),
      };
    }

    const { data, error } = await supabase
      .from("supplier_scores")
      .select("score, direction, summary, recommendations, created_at")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: true })
      .limit(30);

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("score-history error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
