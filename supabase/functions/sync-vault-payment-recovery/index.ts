import { createClient } from 'npm:@supabase/supabase-js@2.94.1';
import { deliverRecoveryJob, recoveryEnv, recoveryReady, recoveryWorkflowPublished, supabaseRecoveryStore } from '../_shared/paymentRecovery.ts';
// Authenticated worker for past-due recovery notices. Separate from the
// welcome worker so the welcome queue and its scheduler are unchanged.
Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  const secret = Deno.env.get('VAULT_ONBOARDING_JOB_SECRET');
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
  const env = recoveryEnv(k => Deno.env.get(k));
  if (!recoveryReady(env)) return new Response('Payment recovery notices not enabled/configured', { status: 503 });
  // Never claim jobs unless the configured recovery workflow already exists and is published.
  if (!(await recoveryWorkflowPublished(env, fetch))) return new Response('Recovery workflow missing or not published', { status: 503 });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: jobs, error } = await db.rpc('claim_vault_payment_recovery_jobs');
  if (error) return new Response('Unable to claim jobs', { status: 500 });
  const store = supabaseRecoveryStore(db);
  let sent = 0;
  for (const job of jobs || []) if (await deliverRecoveryJob(store, job, env, fetch) === 'sent') sent++;
  return Response.json({ processed: jobs?.length || 0, sent });
});
