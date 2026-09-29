/**
 * Turn a raw auth error into a message a member can act on.
 * Empty, JSON-shaped or server-side failures become a clear retry message
 * instead of surfacing "{}" or an internal schema error.
 */
export function authErrorMessage(error: unknown): string {
  const raw = (error as { message?: unknown } | null)?.message;
  const msg = typeof raw === "string" ? raw.trim() : "";

  const unhelpful =
    msg === "" ||
    msg === "{}" ||
    msg === "[]" ||
    msg === "null" ||
    msg === "undefined" ||
    /^\{[\s\S]*\}$/.test(msg) ||
    /database error/i.test(msg) ||
    /querying schema/i.test(msg) ||
    /unexpected_failure/i.test(msg) ||
    /internal server error/i.test(msg) ||
    /^(500|502|503|504)\b/.test(msg);

  if (unhelpful) {
    return "We couldn't reach the sign-in service. Please wait a moment and try again.";
  }

  if (/failed to fetch|network|timeout/i.test(msg)) {
    return "Connection problem. Check your internet and try again.";
  }

  return msg;
}
