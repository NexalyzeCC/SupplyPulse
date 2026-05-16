/**
 * Centralised prompt templates for the SupplyPulse agent.
 *
 * All user-controlled content is wrapped in XML delimiter tags so the model
 * can distinguish instructions from data, defending against prompt injection.
 */

// ─── Agent persona ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are SupplyPulse, an expert supply-chain risk analyst.
Your job is to assess supplier health from recent public information and give
procurement teams clear, actionable intelligence.

Guidelines:
- Be factual and cite sources where possible.
- Distinguish between confirmed facts and inferred risk.
- Score 0 = imminent collapse / operations halt; 100 = rock-solid, no concerns.
- direction must reflect the TREND vs the supplier's historical baseline:
    "improving"    — risk is decreasing / situation getting better
    "stable"       — no significant change detected
    "deteriorating"— risk is increasing / situation getting worse
- Recommendations must be concrete actions a procurement manager can take TODAY.`;

// ─── Extraction prompt ────────────────────────────────────────────────────────

/**
 * @param {string} supplierName
 * @param {Array<{title:string, url:string, content:string, publishedDate?:string}>} results
 * @returns {string}
 */
function EXTRACTION_PROMPT(supplierName, results) {
  const truncated = results
    .map(
      (r, i) =>
        `<result index="${i + 1}" url="${r.url}" date="${r.publishedDate ?? "unknown"}">
<title>${r.title}</title>
<content>${r.content.slice(0, 500)}</content>
</result>`,
    )
    .join("\n");

  return `Extract structured risk signals for the supplier below from these web search results.

<supplier>${supplierName}</supplier>

<search_results>
${truncated}
</search_results>

Return a JSON array of signal objects. Each object must have:
{
  "type":         "news" | "financial" | "legal" | "operational" | "leadership",
  "severity":     "low" | "medium" | "high" | "critical",
  "summary":      "<1-2 sentence description of the specific signal>",
  "source_url":   "<URL from results above, or null>",
  "source_title": "<headline/title from results above, or null>",
  "signal_date":  "<YYYY-MM-DD if discernible, or null>",
  "confidence":   <integer 0-100>
}

Rules:
- Only include signals directly relevant to the supplier.
- Ignore generic industry news not specific to this supplier.
- If no relevant signals found, return an empty array [].
- Return only the JSON array, no prose.`;
}

// ─── Synthesis prompt ─────────────────────────────────────────────────────────

/**
 * @param {Array<object>} signals  — validated signal objects from extractSignals
 * @param {{ name:string, country:string|null, category:string|null, criticality:string }} supplier
 * @returns {string}
 */
function SYNTHESIS_PROMPT(signals, supplier) {
  const signalBlock = JSON.stringify(signals, null, 2);
  const meta = [supplier.category, supplier.country].filter(Boolean).join(", ");

  return `Score this supplier's overall health and produce recommendations.

<supplier name="${supplier.name}" meta="${meta}" criticality="${supplier.criticality ?? "medium"}"/>

<signals>
${signalBlock}
</signals>

Return a single JSON object:
{
  "score":   <integer 0-100, where 100 = perfectly healthy>,
  "direction": "improving" | "stable" | "deteriorating",
  "summary": "<2-3 sentence executive summary of key risks and overall health>",
  "recommendations": [
    {
      "priority": <integer 1 (most urgent) to 3 (nice-to-have)>,
      "action":   "<specific action a procurement manager can take today>",
      "rationale":"<why this action is needed given the signals above>"
    }
  ]
}

Scoring guidance:
- 80-100: Healthy — no material concerns
- 60-79:  Watch    — minor risks, monitor closely
- 40-59:  At risk  — active issues requiring attention
- 20-39:  Critical — significant disruption risk
- 0-19:   Severe   — imminent operational impact likely

Produce 3-5 recommendations ordered by priority. Return only the JSON object.`;
}

module.exports = { SYSTEM_PROMPT, EXTRACTION_PROMPT, SYNTHESIS_PROMPT };
