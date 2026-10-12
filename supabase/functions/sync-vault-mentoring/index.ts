import { createClient } from 'npm:@supabase/supabase-js@2.94.1';
import { deliverMentoringJob, mentoringEnv, mentoringReady, supabaseMentoringStore } from '../_shared/mentoringDelivery.ts';
// Private retry worker for $49 mentoring booking delivery. Two accepted callers: the private job
// secret (webhook nudge / ops), or a single-use 2-minute wake token minted by the database scheduler.
// Does nothing unless VAULT_MENTORING_ENABLED=true and all delivery settings exist.
Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const secret = Deno.env.get('VAULT_ONBOARDING_JOB_SECRET');
  const bearerOk = !!secret && req.headers.get('Authorization') === `Bearer ${secret}`;
  const wake = req.headers.get('x-vault-wake') || '';
  let wakeOk = false;
  if (!bearerOk && /^[0-9a-f]{64}$/.test(wake)) {
    const { data } = await db.rpc('consume_vault_mentoring_wake', { p_token: wake });
    wakeOk = data === true;
  }
  if (!bearerOk && !wakeOk) return new Response('Unauthorized', { status: 401 });
  const env = mentoringEnv(k => Deno.env.get(k));
  if (!mentoringReady(env)) return new Response('Mentoring delivery not enabled/configured', { status: 503 });
  const { data: jobs, error } = await db.rpc('claim_vault_mentoring_jobs');
  if (error) return new Response('Unable to claim jobs', { status: 500 });
  const store = supabaseMentoringStore(db);
  const outcomes: Record<string, number> = {};
  for (const job of jobs || []) {
    const o = await deliverMentoringJob(store, job, env);
    outcomes[o] = (outcomes[o] ?? 0) + 1;
  }
  return Response.json({ processed: jobs?.length || 0, outcomes });
});
