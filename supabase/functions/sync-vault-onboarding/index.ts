import { createClient } from 'npm:@supabase/supabase-js@2.94.1';
import { deliverLeasedJob, onboardingEnv, onboardingReady, supabaseOutboxStore } from '../_shared/returnOnboarding.ts';
// Authenticated retry backstop. The webhook makes one immediate attempt; this
// worker retries anything still pending once its backoff has passed.
Deno.serve(async req => {
  const secret = Deno.env.get('VAULT_ONBOARDING_JOB_SECRET');
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', {status:401});
  const env = onboardingEnv(k => Deno.env.get(k));
  // Explicit launch switch prevents accidentally triggering an existing live workflow.
  if (!onboardingReady(env)) return new Response('Onboarding not enabled/configured', {status:503});
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: jobs, error } = await db.rpc('claim_vault_onboarding_jobs');
  if (error) return new Response('Unable to claim jobs', {status:500});
  const store = supabaseOutboxStore(db);
  let sent = 0;
  for (const job of jobs || []) {
    // claim_vault_onboarding_jobs already incremented attempts; backoff uses the claimed count.
    if (await deliverLeasedJob(store, job, env, fetch, 15_000) === 'sent') sent++;
  }
  return Response.json({processed:jobs?.length||0,sent});
});
