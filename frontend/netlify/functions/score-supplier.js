const OpenAI = require("openai");
const { createServiceClient, requireEnv } = require("./lib/supabase");

function sanitizeSupplierName(name) {
  return String(name).trim().slice(0, 100).replace(/[^\w\s\-.,&()]/g, "");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { supplierId, supplierName, country, category } = JSON.parse(event.body || "{}");

    if (!supplierName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "supplierName is required" }),
      };
    }

    const openai = new OpenAI.OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
    const supabase = createServiceClient();

    // Step 1: Web search via Tavily
    const safeName = sanitizeSupplierName(supplierName);
    const searchRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: requireEnv("TAVILY_API_KEY"),
        query: `${safeName} ${country} financial risk news legal 2024`,
        search_depth: "advanced",
        max_results: 8,
      }),
    });
    const searchData = await searchRes.json();
    const context = searchData.results.map((r) => r.content).join("\n\n");

    // Step 2: GPT-4o scores it
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a supply chain risk analyst. Given news and signals about a supplier, 
          return a JSON object with: 
          { "score": 0-100 (100=healthy), "risk": "low|medium|high|critical", 
            "news_signal": 0-100, "financial_signal": 0-100, "legal_signal": 0-100,
            "alerts": ["string"], "summary": "2 sentence explanation" }`,
        },
        {
          role: "user",
          content: `Supplier: ${supplierName} (${category}, ${country})\n\nRecent signals:\n${context}`,
        },
      ],
    });

    const result = JSON.parse(completion.choices[0].message.content);

    // Step 3: Persist to Supabase (only if supplierId was provided)
    if (supplierId) {
      const { error } = await supabase.from("scores").insert({
        supplier_id: supplierId,
        score: result.score,
        risk: result.risk,
        news_signal: result.news_signal,
        financial_signal: result.financial_signal,
        legal_signal: result.legal_signal,
        alerts: result.alerts,
        summary: result.summary,
      });

      if (error) {
        console.error("Supabase insert error:", error.message);
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
