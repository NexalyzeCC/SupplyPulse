const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");
const { verifyUser } = require("./lib/auth");

const openai = new OpenAI.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function sanitizeSupplierName(name) {
  return String(name).trim().slice(0, 100).replace(/[^\w\s\-.,&()]/g, "");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { user, error: authError } = await verifyUser(event);
    if (authError) {
      return { statusCode: 401, body: JSON.stringify({ error: authError }) };
    }

    const { supplierId } = JSON.parse(event.body || "{}");
    if (!supplierId) {
      return { statusCode: 400, body: JSON.stringify({ error: "supplierId is required" }) };
    }

    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("id, name, country, category")
      .eq("id", supplierId)
      .eq("user_id", user.id)
      .single();

    if (supplierError || !supplier) {
      return { statusCode: 404, body: JSON.stringify({ error: "Supplier not found" }) };
    }

    const safeName = sanitizeSupplierName(supplier.name);
    const searchRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `${safeName} ${supplier.country ?? ""} financial risk news legal supplier disruption`,
        search_depth: "advanced",
        max_results: 8,
      }),
    });

    const searchData = await searchRes.json();
    const results = Array.isArray(searchData.results) ? searchData.results : [];
    const context = results.map((r) => r.content).join("\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a supply chain risk analyst. Given news and signals about a supplier,
return a JSON object with:
{ "score": 0-100 (100=healthy), "direction": "improving|stable|deteriorating",
  "summary": "2 sentence explanation",
  "recommendations": [{ "priority": 1, "action": "string", "rationale": "string" }],
  "signals": [{ "type": "news|legal|financial|leadership|operational",
    "severity": "low|medium|high|critical", "summary": "string",
    "source_url": "string|null", "source_title": "string|null",
    "confidence": 0-100 }] }`,
        },
        {
          role: "user",
          content: `Supplier: ${supplier.name} (${supplier.category ?? "unknown category"}, ${supplier.country ?? "unknown country"})\n\nRecent signals:\n${context}`,
        },
      ],
    });

    const result = JSON.parse(completion.choices[0].message.content);
    const direction = ["improving", "stable", "deteriorating"].includes(result.direction)
      ? result.direction
      : "stable";

    const { data: score, error: scoreError } = await supabase
      .from("supplier_scores")
      .insert({
        supplier_id: supplierId,
        score: Number(result.score),
        direction,
        summary: result.summary ?? null,
        recommendations: Array.isArray(result.recommendations)
          ? result.recommendations
          : [],
      })
      .select("id")
      .single();

    if (scoreError) {
      console.error("Supabase score insert error:", scoreError.message);
      return { statusCode: 500, body: JSON.stringify({ error: scoreError.message }) };
    }

    const signals = Array.isArray(result.signals) ? result.signals : [];
    if (signals.length > 0) {
      const { error: signalsError } = await supabase.from("supplier_signals").insert(
        signals.slice(0, 8).map((signal, index) => ({
          supplier_id: supplierId,
          score_id: score.id,
          type: signal.type ?? "news",
          severity: signal.severity ?? "low",
          summary: signal.summary ?? "Signal detected.",
          source_url: signal.source_url ?? results[index]?.url ?? null,
          source_title: signal.source_title ?? results[index]?.title ?? null,
          signal_date: null,
          confidence: Number(signal.confidence ?? 50),
        })),
      );

      if (signalsError) {
        console.error("Supabase signal insert error:", signalsError.message);
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "complete",
        score: Number(result.score),
        direction,
        scoreId: score.id,
      }),
    };
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
