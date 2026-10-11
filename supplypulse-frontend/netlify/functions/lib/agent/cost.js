/**
 * Token → USD estimation for the scoring pipeline.
 *
 * Rates are per 1M tokens. Update when OpenAI pricing changes — this feeds
 * scan_jobs.cost_usd, which is how per-tier gross margin gets measured.
 */

const RATES = {
  "gpt-4o":      { input: 2.50, output: 10.00 },
  "gpt-4o-mini": { input: 0.15, output:  0.60 },
};

/**
 * @param {Array<{ model:string, usage:{ prompt_tokens?:number, completion_tokens?:number }|null }>} entries
 * @returns {number} estimated USD, rounded to 5dp
 */
function estimateCostUsd(entries = []) {
  let total = 0;

  for (const { model, usage } of entries) {
    if (!usage) continue;
    const rate = RATES[model];
    if (!rate) continue;

    total += ((usage.prompt_tokens     ?? 0) / 1_000_000) * rate.input;
    total += ((usage.completion_tokens ?? 0) / 1_000_000) * rate.output;
  }

  return Math.round(total * 100_000) / 100_000;
}

module.exports = { estimateCostUsd, RATES };
