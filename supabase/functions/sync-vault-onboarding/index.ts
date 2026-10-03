import { createClient } from 'npm:@supabase/supabase-js@2.94.1';
import { deliverLeasedJob, onboardingEnv, onboardingReady, supabaseOutboxStore } from '../_shared/returnOnboarding.ts';
// Authenticated retry backstop. The webhook makes one immediate attempt; this
// worker retries anything still pending once its backoff has passed.
Deno.serve(async req => {
  // POST only; reject before any credential or DB work.
  if (req.method !== 'POST') return new Response('Method Not Allowed', {status:405, headers:{Allow:'POST'}});
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // Two accepted callers: the private job secret (manual/ops), or a single-use
  // 2-minute wake token minted by the database scheduler (no shared secret).
  const secret = Deno.env.get('VAULT_ONBOARDING_JOB_SECRET');
  const bearerOk = !!secret && req.headers.get('Authorization') === `Bearer ${secret}`;
  const wake = req.headers.get('x-vault-wake') || '';
  let wakeOk = false;
  if (!bearerOk && /^[0-9a-f]{64}$/.test(wake)) {
    const { data } = await db.rpc('consume_vault_onboarding_wake', { p_token: wake });
    wakeOk = data === true;
  }
  if (!bearerOk && !wakeOk) return new Response('Unauthorized', {status:401});
  const env = onboardingEnv(k => Deno.env.get(k));
  // Explicit launch switch prevents accidentally triggering an existing live workflow.
  if (!onboardingReady(env)) return new Response('Onboarding not enabled/configured', {status:503});
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
