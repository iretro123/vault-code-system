import { createClient } from 'npm:@supabase/supabase-js@2.94.1';
import { grantPaidRole } from '../_shared/vaultAccess.ts';
const headers = { 'Access-Control-Allow-Origin': 'https://member.vaulttradingacademy.com', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Content-Type': 'application/json' };
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return new Response('{}', { status: 405, headers });
  try {
    const auth = req.headers.get('Authorization') || '';
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user?.email_confirmed_at) return new Response(JSON.stringify({error:'Verify your account email before activating.'}), {status:401,headers});
    const { data: claimed, error: claimError } = await client.rpc('claim_vault_return_membership');
    if (claimError) throw claimError;
    if (!claimed) return new Response(JSON.stringify({error:'No current paid offer matches this verified account. Use the email entered at Stripe checkout. If you just paid, wait a moment and try again.'}), {status:409,headers});
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await grantPaidRole(admin, user.id);
    return new Response(JSON.stringify({success:true}), {headers});
  } catch { return new Response(JSON.stringify({error:'Unable to activate right now. Your payment record is preserved; try again or contact support.'}), {status:500,headers}); }
});
