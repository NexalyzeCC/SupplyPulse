const ALLOWED_ORIGIN = process.env.APP_URL || "*";

const HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Scheduled-Secret",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

function preflight(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS };
  return null;
}

module.exports = { HEADERS, preflight };
