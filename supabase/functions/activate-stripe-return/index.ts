import { createClient } from 'npm:@supabase/supabase-js@2.94.1';
import { grantPaidRole } from '../_shared/vaultAccess.ts';
import { decodeJwtClaims, normalizedEmail } from '../_shared/returnClaimProof.ts';
import { bindReturnMembership } from '../_shared/returnClaimFlow.ts';
const headers = { 'Access-Control-Allow-Origin': 'https://member.vaulttradingacademy.com', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Content-Type': 'application/json' };
const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers });
const NO_MATCH = 'No current paid offer matches this verified account. Use the email entered at Stripe checkout. If you just paid, wait a moment and try again.';
const FRESH = { error: 'For your security, open a new secure link from your email to connect this payment.', code: 'fresh_email_link_required' };

// Fail-closed claim: binding a new paid membership requires a session created
// by a fresh email link (inbox proof). Any earlier password is replaced and all
// sessions are revoked BEFORE the bind; the claim then runs on a brand-new
// email-link session minted server-side and handed back to the browser.
// The SQL RPC re-checks inbox proof; a direct RPC call cannot skip this.
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return reply(405, {});
  try {
    const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const auth = req.headers.get('Authorization') || '';
    const jwt = auth.replace(/^Bearer\s+/i, '');
    const client = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user?.email_confirmed_at || !user.email) return reply(401, { error: 'Verify your account email before activating.' });
    const email = normalizedEmail(user.email);
    const claims = decodeJwtClaims(jwt);
    if (!claims || claims.sub !== user.id || normalizedEmail(claims.email) !== email) return reply(401, { error: 'Sign in again with your secure email link.' });

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: rows, error: lookupError } = await admin.from('vault_return_memberships')
      .select('auth_user_id, claimed_at').eq('email', email).in('status', ['active', 'trialing']).gt('access_until', new Date().toISOString());
    if (lookupError) throw lookupError;
    const needsBind = (rows ?? []).some(r => r.auth_user_id === null || (r.auth_user_id === user.id && !r.claimed_at));
    const alreadyBound = (rows ?? []).some(r => r.auth_user_id === user.id && r.claimed_at);
    if (!needsBind && !alreadyBound) return reply(409, { error: NO_MATCH });

    if (!needsBind) {
      const { data: ok, error: claimError } = await client.rpc('claim_vault_return_membership');
      if (claimError) throw claimError;
      if (!ok) return reply(403, FRESH);
      await grantPaidRole(admin, user.id);
      return reply(200, { success: true, secured: false });
    }

    const result = await bindReturnMembership({
      setPassword: async (id, password) => { const { error: e } = await admin.auth.admin.updateUserById(id, { password }); if (e) throw e; },
      revokeAll: async (t) => { const { error: e } = await admin.auth.admin.signOut(t, 'global'); if (e) throw e; },
      mintEmailLinkSession: async (addr) => {
        const { data, error: e } = await admin.auth.admin.generateLink({ type: 'magiclink', email: addr });
        const hash = data?.properties?.hashed_token;
        if (e || !hash) return null;
        const fresh = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: v, error: ve } = await fresh.auth.verifyOtp({ token_hash: hash, type: 'magiclink' });
        if (ve || !v.session) return null;
        return { access_token: v.session.access_token, refresh_token: v.session.refresh_token };
      },
      writeProof: async (sid, id, addr) => {
        const { error: e } = await admin.from('vault_return_claim_proofs').upsert({ session_id: sid, user_id: id, email: addr, prepared_at: new Date().toISOString() });
        if (e) throw e;
      },
      claimAs: async (token) => {
        const c = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
        const { data: ok, error: e } = await c.rpc('claim_vault_return_membership');
        if (e) throw e;
        return ok === true;
      },
      nowSeconds: () => Math.floor(Date.now() / 1000),
    }, jwt, user.id, email);

    if (!result.ok) return result.reason === 'no_match' ? reply(409, { error: NO_MATCH }) : reply(403, FRESH);
    await grantPaidRole(admin, user.id);
    return reply(200, { success: true, secured: true, session: result.session });
  } catch { return reply(500, { error: 'Unable to activate right now. Your payment record is preserved; try again or contact support.' }); }
});
