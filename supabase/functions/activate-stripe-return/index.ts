import { createClient } from 'npm:@supabase/supabase-js@2.94.1';
import { grantPaidRole } from '../_shared/vaultAccess.ts';
import { decodeJwtClaims, hasFreshInboxProof, normalizedEmail, randomUnusablePassword } from '../_shared/returnClaimProof.ts';
const headers = { 'Access-Control-Allow-Origin': 'https://member.vaulttradingacademy.com', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Content-Type': 'application/json' };
const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers });
const NO_MATCH = 'No current paid offer matches this verified account. Use the email entered at Stripe checkout. If you just paid, wait a moment and try again.';

// Fail-closed claim: binding a new paid membership requires a session created
// by a fresh email link (inbox proof). Before the bind, any pre-existing
// password on the account is replaced and every other session is revoked, so
// someone who pre-created the account cannot keep using it. The SQL RPC
// re-checks all of this; a direct RPC call cannot skip these steps.
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return reply(405, {});
  try {
    const auth = req.headers.get('Authorization') || '';
    const jwt = auth.replace(/^Bearer\s+/i, '');
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user?.email_confirmed_at || !user.email) return reply(401, { error: 'Verify your account email before activating.' });
    const email = normalizedEmail(user.email);
    const claims = decodeJwtClaims(jwt);
    if (!claims || claims.sub !== user.id || normalizedEmail(claims.email) !== email) return reply(401, { error: 'Sign in again with your secure email link.' });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: rows, error: lookupError } = await admin.from('vault_return_memberships')
      .select('auth_user_id, claimed_at').eq('email', email).in('status', ['active', 'trialing']).gt('access_until', new Date().toISOString());
    if (lookupError) throw lookupError;
    const needsBind = (rows ?? []).some(r => r.auth_user_id === null || (r.auth_user_id === user.id && !r.claimed_at));
    const alreadyBound = (rows ?? []).some(r => r.auth_user_id === user.id && r.claimed_at);
    if (!needsBind && !alreadyBound) return reply(409, { error: NO_MATCH });

    let secured = false;
    if (needsBind) {
      if (!hasFreshInboxProof(claims, Math.floor(Date.now() / 1000))) {
        return reply(403, { error: 'For your security, open a new secure link from your email to connect this payment.', code: 'fresh_email_link_required' });
      }
      const { error: pwError } = await admin.auth.admin.updateUserById(user.id, { password: randomUnusablePassword() });
      if (pwError) throw pwError;
      const { error: soError } = await admin.auth.admin.signOut(jwt, 'others');
      if (soError) throw soError;
      const { error: proofError } = await admin.from('vault_return_claim_proofs')
        .upsert({ session_id: claims.session_id, user_id: user.id, email, prepared_at: new Date().toISOString() });
      if (proofError) throw proofError;
      secured = true;
    }

    const { data: claimed, error: claimError } = await client.rpc('claim_vault_return_membership');
    if (claimError) throw claimError;
    if (!claimed) return reply(409, { error: NO_MATCH });
    await grantPaidRole(admin, user.id);
    return reply(200, { success: true, secured });
  } catch { return reply(500, { error: 'Unable to activate right now. Your payment record is preserved; try again or contact support.' }); }
});
