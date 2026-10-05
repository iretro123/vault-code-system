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

export type LoginErrorKind = "credentials" | "unconfirmed" | "rate" | "other";

/** Classify a sign-in failure without ever revealing whether an email has an account. */
export function loginErrorKind(error: unknown): LoginErrorKind {
  const msg = String((error as { message?: unknown } | null)?.message ?? "");
  const code = String((error as { code?: unknown } | null)?.code ?? "");
  if (code === "email_not_confirmed" || /email not confirmed/i.test(msg)) return "unconfirmed";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(msg)) return "credentials";
  if (code === "over_request_rate_limit" || /rate limit|too many/i.test(msg)) return "rate";
  return "other";
}

export function loginErrorText(error: unknown): string {
  switch (loginErrorKind(error)) {
    case "credentials": return "That email and password didn't match. Check the email for typos, try again, or reset your password.";
    case "unconfirmed": return "Confirm your email first. Open the link we sent, or send a new one below.";
    case "rate": return "Too many attempts. Please wait a minute and try again.";
    default: return authErrorMessage(error);
  }
}
