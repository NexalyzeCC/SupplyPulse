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
    const { userId } = event.queryStringParameters;

    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: "userId required" }) };
    }

    // Get all scores for this user's suppliers, ordered newest first
    const { data, error } = await supabase
      .from("supplier_scores")
      .select(`
        score, direction, summary, recommendations, created_at,
        suppliers!inner(id, name, country, category, user_id)
      `)
      .eq("suppliers.user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
