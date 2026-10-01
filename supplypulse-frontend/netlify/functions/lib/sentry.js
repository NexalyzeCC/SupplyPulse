/**
 * Optional Sentry wiring for Netlify Functions.
 *
 * No-ops entirely when SENTRY_DSN is unset so local dev and CI never need it.
 * captureError() is safe to call unconditionally from any catch block.
 */

let _sentry = null;
let _initTried = false;

function getSentry() {
  if (_initTried) return _sentry;
  _initTried = true;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return null;

  try {
    const Sentry = require("@sentry/node");
    Sentry.init({
      dsn,
      environment: process.env.CONTEXT ?? "development",
      tracesSampleRate: 0,
    });
    _sentry = Sentry;
  } catch (err) {
    console.warn("[sentry] init failed (non-fatal):", err.message);
  }

  return _sentry;
}

/**
 * @param {Error|unknown} err
 * @param {Record<string, unknown>} [context]
 */
function captureError(err, context = {}) {
  const Sentry = getSentry();
  if (!Sentry) return;
  try {
    Sentry.captureException(err, { extra: context });
  } catch {
    /* never let error reporting break the handler */
  }
}

module.exports = { captureError };
