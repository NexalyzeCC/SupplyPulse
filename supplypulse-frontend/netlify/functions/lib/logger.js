/**
 * Structured JSON logger for the SupplyPulse agent pipeline.
 *
 * Every event is written as a single JSON line so Netlify Logs / Datadog /
 * any log aggregator can index and query individual fields.
 *
 * Usage:
 *   logLLM({ model: "gpt-4o-mini", step: "extract", supplierId, runId, usage, latencyMs });
 *   logTool({ tool: "webSearch", step: "search", supplierId, runId, latencyMs, success: true });
 *   logEvent("agent_run_complete", { supplier_id, run_id, total_cost_usd, total_latency_ms });
 */

const OPENAI_PRICING = {
  "gpt-4o":        { input: 2.50 / 1e6, output: 10.00 / 1e6 },
  "gpt-4o-mini":   { input: 0.15 / 1e6, output:  0.60 / 1e6 },
};

function logEvent(event, data) {
  console.log(JSON.stringify({ event, timestamp: new Date().toISOString(), ...data }));
}

function logLLM({ model, step, supplierId, runId, usage, latencyMs }) {
  const pricing = OPENAI_PRICING[model] || { input: 0, output: 0 };
  const inputTokens = usage?.prompt_tokens || 0;
  const outputTokens = usage?.completion_tokens || 0;
  const costUsd = inputTokens * pricing.input + outputTokens * pricing.output;
  logEvent("llm_call", {
    model,
    step,
    supplier_id:   supplierId,
    run_id:        runId,
    input_tokens:  inputTokens,
    output_tokens: outputTokens,
    latency_ms:    latencyMs,
    cost_usd:      Number(costUsd.toFixed(6)),
  });
}

function logTool({ tool, step, supplierId, runId, latencyMs, success, error }) {
  logEvent("tool_call", {
    tool,
    step,
    supplier_id: supplierId,
    run_id:      runId,
    latency_ms:  latencyMs,
    success,
    error:       error || null,
  });
}

module.exports = { logEvent, logLLM, logTool };
