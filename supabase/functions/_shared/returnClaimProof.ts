// Pure checks for the paid-return claim. The SQL claim RPC enforces the same
// rules authoritatively; these let the edge function fail early and closed
// BEFORE it replaces a password or revokes sessions.
export const CLAIM_PROOF_MAX_AGE_SECONDS = 15 * 60;

export type JwtClaims = { sub?: string; session_id?: string; email?: string; role?: string; amr?: Array<{ method?: string; timestamp?: number } | string> };

/** Decode (not verify) a JWT payload. Only call after auth.getUser() accepted the token. */
export function decodeJwtClaims(token: string): JwtClaims | null {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    return JSON.parse(atob(b64));
  } catch { return null; }
}

/** True only when THIS session was created by an email OTP / magic link within the window. */
export function hasFreshInboxProof(claims: JwtClaims | null, nowSeconds: number, maxAge = CLAIM_PROOF_MAX_AGE_SECONDS): boolean {
  if (!claims || claims.role !== 'authenticated' || !claims.session_id || !claims.sub) return false;
  return (claims.amr ?? []).some((e) =>
    typeof e === 'object' && e?.method === 'otp' && typeof e.timestamp === 'number'
      && e.timestamp <= nowSeconds + 60 && nowSeconds - e.timestamp <= maxAge);
}

export function normalizedEmail(v: string | null | undefined): string {
  return (v ?? '').trim().toLowerCase();
}

/** Unguessable replacement password: invalidates any password set before inbox proof. */
export function randomUnusablePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(48));
  return btoa(String.fromCharCode(...bytes));
}
