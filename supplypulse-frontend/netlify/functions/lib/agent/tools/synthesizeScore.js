/**
 * synthesizeScore — GPT-4o scoring + recommendation step.
 *
 * Receives the validated signals array and the supplier profile, and produces
 * a validated { score, direction, summary, recommendations } object.
 *
 * Output is validated via the shared Zod ScoreOutputSchema in lib/validation.js.
 * Score is clamped to [0, 100] and direction is constrained to the enum.
 */

const OpenAI = require("openai");
const { SYSTEM_PROMPT, SYNTHESIS_PROMPT } = require("../prompts");
const { validateScoreOutput } = require("../../validation");

const openai = new OpenAI.OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Public ───────────────────────────────────────────────────────────────────

/**
 * @param {Array<object>} signals   — validated signal objects
 * @param {{ name:string, country:string|null, category:string|null, criticality:string }} supplier
 * @returns {Promise<{ score:number, direction:string, summary:string, recommendations:Array }>}
 */
async function synthesizeScore(signals, supplier) {
  const userPrompt = SYNTHESIS_PROMPT(signals, supplier);

  try {
    const completion = await openai.chat.completions.create({
      model:           "gpt-4o",
      response_format: { type: "json_object" },
      temperature:     0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "{}";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.warn("[synthesizeScore] JSON.parse failed — using defaults");
      parsed = {};
    }

    // Delegate all validation, clamping, and normalisation to the shared schema
    const result = validateScoreOutput(parsed);
    console.log(`[synthesizeScore] Score ${result.score}, direction: ${result.direction}`);
    return result;
  } catch (err) {
    console.error("[synthesizeScore] LLM error:", err.message);
    // Return a safe default so the pipeline can still persist something
    return {
      score:           50,
      direction:       "stable",
      summary:         "Score could not be computed due to a processing error.",
      recommendations: [],
    };
  }
}

module.exports = { synthesizeScore };
