const { createServiceClient } = require("./lib/supabase");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const supabase = createServiceClient();
    const { userId } = event.queryStringParameters;

    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: "userId required" }) };
    }

    // Get all scores for this user's suppliers, ordered newest first
    const { data, error } = await supabase
      .from("scores")
      .select(`
        score, risk, summary, alerts, scored_at,
        suppliers!inner(id, name, country, category, user_id)
      `)
      .eq("suppliers.user_id", userId)
      .order("scored_at", { ascending: false })
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
