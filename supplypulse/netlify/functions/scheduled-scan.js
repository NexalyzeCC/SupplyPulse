const { schedule } = require("@netlify/functions");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const handler = async () => {
  console.log("[scheduled-scan] Starting daily scan", new Date().toISOString());

  const { data: suppliers, error } = await supabase
    .from("suppliers")
    .select("id, name, country, category");

  if (error || !suppliers?.length) {
    console.log("[scheduled-scan] No suppliers found or error:", error?.message);
    return { statusCode: 200 };
  }

  // Batch in groups of 5 to respect rate limits
  for (let i = 0; i < suppliers.length; i += 5) {
    const batch = suppliers.slice(i, i + 5);
    await Promise.allSettled(
      batch.map((s) =>
        fetch(`${process.env.URL}/.netlify/functions/score-supplier`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierId: s.id,
            supplierName: s.name,
            country: s.country,
            category: s.category,
          }),
        })
      )
    );
    // Buffer between batches
    if (i + 5 < suppliers.length) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(`[scheduled-scan] Done — ${suppliers.length} suppliers scanned`);
  return { statusCode: 200 };
};

exports.handler = schedule("0 6 * * *", handler);