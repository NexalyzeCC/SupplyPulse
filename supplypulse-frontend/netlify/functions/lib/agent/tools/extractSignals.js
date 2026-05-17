/**
 * extractSignals — GPT-4o-mini signal extraction step.
 *
 * Receives raw web search results, truncates each to 500 chars, wraps them
 * in <search_results> XML tags (prompt injection defence), and asks the model
 * to return a validated array of structured signals.
 *
 * Output is validated via the shared Zod SignalSchema in lib/validation.js.
 *
 * Returns: Array<{
 *   type, severity, summary, source_url, source_title, signal_date, confidence
 * }>
 */

const OpenAI = require("openai");
const { SYSTEM_PROMPT, EXTRACTION_PROMPT } = require("../prompts");
const { validateSignals } = require("../../validation");
const { logLLM } = require("../../logger");

const MODEL = "gpt-4o-mini";

// Lazy singleton. The new OpenAI SDK throws synchronously in its constructor
// when OPENAI_API_KEY is missing — instantiating at module load time would
// crash the whole Netlify function before the handler can run. Defer the
// construction to the first call so a missing key produces a clean error.
let _client = null;
function getClient() {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Set it in your environment (Netlify → Site settings → Environment variables for production).",
    );
  }
  _client = new OpenAI.OpenAI({ apiKey });
  return _client;
}

// ─── Public ───────────────────────────────────────────────────────────────────

/**
 * @param {string} supplierName
 * @param {Array<{ title:string, url:string, content:string, publishedDate?:string }>} results
 * @param {{ runId?:string, supplierId?:string }} [ctx]
 * @returns {Promise<Array<object>>}
 */
async function extractSignals(supplierName, results, ctx = {}) {
  if (results.length === 0) {
    console.log("[extractSignals] No search results — skipping extraction");
    return [];
  }

  const { runId, supplierId } = ctx;
  const userPrompt = EXTRACTION_PROMPT(supplierName, results);

  const t0 = Date.now();
  try {
    const completion = await getClient().chat.completions.create({
      model:           MODEL,
      response_format: { type: "json_object" },
      temperature:     0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
    });

    logLLM({
      model:     MODEL,
      step:      "extract",
      supplierId,
      runId,
      usage:     completion.usage,
      latencyMs: Date.now() - t0,
    });

    const text = completion.choices[0]?.message?.content ?? "[]";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.warn("[extractSignals] JSON.parse failed — returning []");
      return [];
    }

    // Delegate all validation and normalisation to the shared Zod schema
    const validated = validateSignals(parsed);
    console.log(`[extractSignals] Extracted ${validated.length} valid signals`);
    return validated;
  } catch (err) {
    logLLM({
      model:     MODEL,
      step:      "extract",
      supplierId,
      runId,
      usage:     null,
      latencyMs: Date.now() - t0,
    });
    console.error("[extractSignals] LLM error:", err.message);
    return [];
  }
}

module.exports = { extractSignals };
