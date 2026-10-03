// Paid-return bind sequence. Kept dependency-injected so tests can model real
// auth-server semantics (an admin password change revokes EVERY session,
// including the caller's).
//
// Order matters:
//   1. caller proves fresh inbox ownership (email-link session)
//   2. replace any earlier password  -> auth server revokes all sessions
//   3. belt-and-braces global sign-out (ignored if already revoked)
//   4. mint a brand-new email-link session server-side (no email sent)
//   5. re-check inbox proof on the NEW session, write proof row for it
//   6. claim with the NEW session; return it so the browser can adopt it
// The previous design wrote the proof/claimed with the caller's session after
// step 2, which had already been revoked, so every real claim failed.
import { decodeJwtClaims, hasFreshInboxProof, randomUnusablePassword } from './returnClaimProof.ts';

export type MintedSession = { access_token: string; refresh_token: string };
export type ClaimDeps = {
  setPassword: (userId: string, password: string) => Promise<void>;
  revokeAll: (jwt: string) => Promise<void>;
  mintEmailLinkSession: (email: string) => Promise<MintedSession | null>;
  writeProof: (sessionId: string, userId: string, email: string) => Promise<void>;
  claimAs: (accessToken: string) => Promise<boolean>;
  nowSeconds: () => number;
};
export type BindResult =
  | { ok: true; session: MintedSession }
  | { ok: false; reason: 'fresh_email_link_required' | 'no_match' };

export async function bindReturnMembership(deps: ClaimDeps, callerJwt: string, userId: string, email: string): Promise<BindResult> {
  if (!hasFreshInboxProof(decodeJwtClaims(callerJwt), deps.nowSeconds())) return { ok: false, reason: 'fresh_email_link_required' };
  await deps.setPassword(userId, randomUnusablePassword());
  try { await deps.revokeAll(callerJwt); } catch { /* already revoked by the password change */ }
  const session = await deps.mintEmailLinkSession(email);
  const claims = session ? decodeJwtClaims(session.access_token) : null;
  if (!session || !claims || claims.sub !== userId || !hasFreshInboxProof(claims, deps.nowSeconds())) {
    return { ok: false, reason: 'fresh_email_link_required' };
  }
  await deps.writeProof(claims.session_id!, userId, email);
  return (await deps.claimAs(session.access_token)) ? { ok: true, session } : { ok: false, reason: 'no_match' };
}
