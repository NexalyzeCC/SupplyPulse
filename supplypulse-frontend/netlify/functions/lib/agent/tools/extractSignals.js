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

const openai = new OpenAI.OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Public ───────────────────────────────────────────────────────────────────

/**
 * @param {string} supplierName
 * @param {Array<{ title:string, url:string, content:string, publishedDate?:string }>} results
 * @returns {Promise<Array<object>>}
 */
async function extractSignals(supplierName, results) {
  if (results.length === 0) {
    console.log("[extractSignals] No search results — skipping extraction");
    return [];
  }

  const userPrompt = EXTRACTION_PROMPT(supplierName, results);

  try {
    const completion = await openai.chat.completions.create({
      model:           "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature:     0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
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
    console.error("[extractSignals] LLM error:", err.message);
    return [];
  }
}

module.exports = { extractSignals };
