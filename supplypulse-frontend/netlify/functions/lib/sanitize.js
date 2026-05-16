/**
 * Centralised input sanitisation for prompt injection defence.
 *
 * Every string that flows from a user, a search result, or any external
 * source into an LLM prompt should pass through one of these helpers first.
 *
 * Strategy:
 *   • Strip the characters that break our XML-tagged prompt structure (<, >).
 *   • Strip markdown code fences that could be used to escape into a code
 *     block and inject instructions.
 *   • Drop NULL bytes (some models / loggers handle these badly).
 *   • Normalise whitespace and Unicode (NFKC collapses look-alikes like
 *     full-width chars or zero-width spaces into a canonical form).
 *   • Hard length cap to limit how much an attacker can stuff into a prompt.
 */

function sanitizeText(input, max = 200) {
  return String(input ?? "")
    .normalize("NFKC")
    .replace(/[<>]/g, "")             // strip angle brackets (XML breakers)
    .replace(/```/g, "")              // strip markdown code fences
    .replace(/\u0000/g, "")           // null bytes
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function sanitizeSupplierName(name) {
  return sanitizeText(name, 100).replace(/[^\w\s\-.,&()]/g, "");
}

function sanitizeUrl(url) {
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    return u.toString().slice(0, 500);
  } catch {
    return null;
  }
}

module.exports = { sanitizeText, sanitizeSupplierName, sanitizeUrl };
