import { createClient } from 'npm:@supabase/supabase-js@2.94.1';
import { deliverRecoveryJob, recoveryEnv, recoveryReady, recoveryWorkflowStatus, supabaseRecoveryStore } from '../_shared/paymentRecovery.ts';
// Authenticated worker for past-due recovery notices. Separate from the
// welcome worker so the welcome queue is unchanged. Accepted callers: the
// private job secret, or a single-use database wake token (no shared secret).
Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const secret = Deno.env.get('VAULT_ONBOARDING_JOB_SECRET');
  const bearerOk = !!secret && req.headers.get('Authorization') === `Bearer ${secret}`;
  const wake = req.headers.get('x-vault-recovery-wake') || '';
  let wakeOk = false;
  if (!bearerOk && /^pr[0-9a-f]{64}$/.test(wake)) {
    const { data } = await db.rpc('consume_vault_onboarding_wake', { p_token: wake });
    wakeOk = data === true;
  }
  if (!bearerOk && !wakeOk) return new Response('Unauthorized', { status: 401 });
  const env = recoveryEnv(k => Deno.env.get(k));
  if (!recoveryReady(env)) return new Response('Payment recovery notices not enabled/configured', { status: 503 });
  // Never claim jobs unless the configured recovery workflow exists and is published.
  const wf = await recoveryWorkflowStatus(env, fetch);
  if (!wf.ok) { console.error('[sync-vault-payment-recovery] workflow_check', wf.reason); return Response.json({ error: wf.reason }, { status: 503 }); }
  const { data: jobs, error } = await db.rpc('claim_vault_payment_recovery_jobs');
  if (error) return new Response('Unable to claim jobs', { status: 500 });
  const store = supabaseRecoveryStore(db);
  const outcomes: Record<string, string> = {};
  for (const job of jobs || []) outcomes[job.stripe_invoice_id] = await deliverRecoveryJob(store, job, env, fetch);
  console.log('[sync-vault-payment-recovery] done', JSON.stringify(outcomes));
  return Response.json({ processed: jobs?.length || 0, sent: Object.values(outcomes).filter(o => o === 'sent').length, outcomes });
});
