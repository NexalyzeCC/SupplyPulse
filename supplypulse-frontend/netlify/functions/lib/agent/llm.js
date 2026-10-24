/**
 * Shared LLM client for the scoring agent.
 *
 * LLM_PROVIDER picks the backend: "gemini" or "openai" (default).
 * Gemini is reached through its OpenAI-compatible endpoint, so the same
 * openai SDK and chat.completions calls work for both.
 */

const OpenAI = require("openai");

const PROVIDERS = {
  openai: {
    keyVar:  "OPENAI_API_KEY",
    baseURL: undefined,
    models:  { fast: "gpt-4o-mini", smart: "gpt-4o" },
  },
  gemini: {
    keyVar:  "GEMINI_API_KEY",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    models:  {
      fast:  process.env.GEMINI_MODEL_FAST ?? "gemini-2.5-flash",
      smart: process.env.GEMINI_MODEL      ?? "gemini-2.5-pro",
    },
  },
};

function provider() {
  const name = (process.env.LLM_PROVIDER ?? "openai").toLowerCase();
  const p = PROVIDERS[name];
  if (!p) throw new Error(`Unknown LLM_PROVIDER "${name}". Use "openai" or "gemini".`);
  return p;
}

// Lazy singleton: the OpenAI constructor throws synchronously on a missing
// key, so build it on first use rather than at module load.
let _client = null;
function getClient() {
  if (_client) return _client;
  const p = provider();
  const apiKey = process.env[p.keyVar];
  if (!apiKey) {
    throw new Error(
      `${p.keyVar} is not configured. Set it in Netlify → Site settings → Environment variables.`,
    );
  }
  _client = new OpenAI.OpenAI({ apiKey, baseURL: p.baseURL });
  return _client;
}

/** "fast" = signal extraction, "smart" = score synthesis. */
function modelFor(kind) {
  return provider().models[kind];
}

module.exports = { getClient, modelFor };
