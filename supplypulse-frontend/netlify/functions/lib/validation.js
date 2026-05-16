/**
 * Centralised Zod schemas and validators for the SupplyPulse agent pipeline.
 *
 * Both extractSignals.js and synthesizeScore.js import from here so that
 * all LLM output constraints live in a single place.
 *
 * On parse failure, validators log a warning and return safe defaults rather
 * than throwing — the pipeline must always be able to produce *something*.
 */

const { z } = require("zod");

// ─── Shared primitives ────────────────────────────────────────────────────────

const SignalTypeEnum = z.enum([
  "news",
  "financial",
  "legal",
  "operational",
  "leadership",
]);

const SeverityEnum = z.enum(["low", "medium", "high", "critical"]);

const DirectionEnum = z.enum(["improving", "stable", "deteriorating"]);

const Confidence = z
  .number()
  .int()
  .min(0)
  .max(100)
  .default(70)
  .catch(70); // catch replaces invalid values with the fallback

const ClampedScore = z
  .number()
  .transform((v) => Math.max(0, Math.min(100, Math.round(v))))
  .pipe(z.number().int().min(0).max(100));

// ─── Signal schema ────────────────────────────────────────────────────────────

const SignalSchema = z.object({
  type:         SignalTypeEnum.catch("news"),
  severity:     SeverityEnum.catch("low"),
  summary:      z.string().min(1).max(500).catch(""),
  source_url:   z.string().url().nullable().catch(null),
  source_title: z.string().max(300).nullable().catch(null),
  signal_date:  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .nullable()
    .catch(null),
  confidence:   Confidence,
});

// ─── Recommendation schema ────────────────────────────────────────────────────

const RecommendationSchema = z.object({
  priority: z
    .union([
      z.number().int().min(1).max(3),
      // Accept string labels from older model responses
      z.enum(["high", "medium", "low"]).transform((v) =>
        ({ high: 1, medium: 2, low: 3 }[v]),
      ),
    ])
    .catch(2),
  action:    z.string().min(1).max(300).catch(""),
  rationale: z.string().max(500).catch(""),
});

// ─── Score output schema ──────────────────────────────────────────────────────

const ScoreOutputSchema = z.object({
  score:           ClampedScore.catch(50),
  direction:       DirectionEnum.catch("stable"),
  summary:         z.string().min(1).max(1000).catch("No summary available."),
  recommendations: z
    .array(RecommendationSchema)
    .default([])
    .catch([])
    .transform((recs) =>
      recs
        .filter((r) => r.action.length > 0)
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 10),
    ),
});

// ─── Public validators ────────────────────────────────────────────────────────

/**
 * Validates and normalises an array of raw signal objects from the LLM.
 *
 * @param {unknown} raw  — the value parsed from JSON (may be anything)
 * @returns {Array<import('./validation').Signal>}
 */
function validateSignals(raw) {
  // Accept both a bare array and { signals: [...] }
  let arr;
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (raw && typeof raw === "object" && Array.isArray(raw.signals)) {
    arr = raw.signals;
  } else {
    console.warn("[validation] validateSignals: input is not an array — returning []");
    return [];
  }

  const validated = [];
  for (let i = 0; i < arr.length; i++) {
    const result = SignalSchema.safeParse(arr[i]);
    if (result.success && result.data.summary.length > 0) {
      validated.push(result.data);
    } else if (!result.success) {
      console.warn(`[validation] Signal[${i}] parse error:`, result.error.issues);
      // Attempt a coerced parse with .catch() fallbacks for each field
      const coerced = SignalSchema.parse(arr[i] ?? {});
      if (coerced.summary.length > 0) validated.push(coerced);
    }
  }

  return validated;
}

/**
 * Validates and normalises the score synthesis object returned by GPT-4o.
 *
 * @param {unknown} raw  — the value parsed from JSON (may be anything)
 * @returns {{ score:number, direction:string, summary:string, recommendations:Array }}
 */
function validateScoreOutput(raw) {
  if (!raw || typeof raw !== "object") {
    console.warn("[validation] validateScoreOutput: non-object input — using defaults");
    return ScoreOutputSchema.parse({});
  }

  const result = ScoreOutputSchema.safeParse(raw);

  if (result.success) {
    return result.data;
  }

  console.warn("[validation] validateScoreOutput parse errors:", result.error.issues);

  // Partial recovery: try to salvage valid top-level fields
  const fallback = {
    score:           typeof raw.score === "number" ? raw.score : 50,
    direction:       DirectionEnum.options.includes(raw.direction) ? raw.direction : "stable",
    summary:         typeof raw.summary === "string" ? raw.summary.slice(0, 1000) : "No summary available.",
    recommendations: [],
  };

  return ScoreOutputSchema.parse(fallback);
}

module.exports = {
  SignalSchema,
  ScoreOutputSchema,
  RecommendationSchema,
  validateSignals,
  validateScoreOutput,
};
