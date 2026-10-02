import { returnAccessValid } from '../_shared/returnOffer.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.94.1';
Deno.serve(async req => {
  const secret = Deno.env.get('VAULT_ONBOARDING_JOB_SECRET');
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', {status:401});
  const key = Deno.env.get('GHL_API_KEY');
  const locationId = Deno.env.get('GHL_LOCATION_ID');
  // Explicit launch switch prevents accidentally triggering an existing live workflow.
  if (Deno.env.get('VAULT_RETURN_ONBOARDING_ENABLED') !== 'true' || !key || !locationId) return new Response('Onboarding not enabled/configured', {status:503});
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: jobs, error } = await db.rpc('claim_vault_onboarding_jobs');
  if (error) return new Response('Unable to claim jobs', {status:500});
  let sent = 0;
  for (const job of jobs || []) {
    try {
      const {data: membership, error: memberError} = await db.from('vault_return_memberships').select('paid_at,status,access_until').eq('stripe_subscription_id',job.stripe_subscription_id).single();
      if (memberError || !returnAccessValid(membership)) throw new Error('Paid membership not currently valid; onboarding withheld');
      const res = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {method:'POST', headers:{Authorization:`Bearer ${key}`,Version:'2021-07-28','Content-Type':'application/json'},body:JSON.stringify({locationId,email:job.email})});
      const body = await res.json();
      if (!res.ok || !body.contact?.id) throw new Error(`GHL contact upsert HTTP ${res.status}`);
      // Idempotent tag addition is the only trigger. Disable workflow re-entry; do not send email directly here.
      const tag = await fetch(`https://services.leadconnectorhq.com/contacts/${encodeURIComponent(body.contact.id)}/tags`, {method:'POST', headers:{Authorization:`Bearer ${key}`,Version:'2021-07-28','Content-Type':'application/json'},body:JSON.stringify({tags:['vault-reactivation-paid']})});
      if (!tag.ok) throw new Error(`GHL tag HTTP ${tag.status}`);
      const {error:updateError} = await db.from('vault_onboarding_outbox').update({state:'sent',sent_at:new Date().toISOString(),locked_until:null,last_error:null}).eq('stripe_subscription_id',job.stripe_subscription_id);
      if (updateError) throw new Error('Unable to record CRM acknowledgement');
      sent++;
    } catch (e) {
      await db.from('vault_onboarding_outbox').update({state:'pending',locked_until:null,last_error:String(e).slice(0,250),next_attempt_at:new Date(Date.now()+Math.min(3600000,60000*2**Math.min(job.attempts,6))).toISOString()}).eq('stripe_subscription_id',job.stripe_subscription_id);
    }
  }
  return Response.json({processed:jobs?.length||0,sent});
});
