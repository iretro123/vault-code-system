// Past-due payment recovery notice. The webhook enqueues durable jobs after
// re-reading the CURRENT subscription from Stripe; the authenticated worker
// delivers them through the existing CRM. Nothing here sends email directly.
//
// Delivery semantics (at-least-once, idempotent at the CRM):
//  - 'notify' job (key = failed invoice id): ADD the recovery tag. Adding a tag
//    the contact already has is a no-op, so a retry after "CRM succeeded but the
//    DB acknowledgement failed" cannot trigger a second workflow email.
//  - 'clear' job (key = 'clear:<paid invoice id>'): REMOVE the tag once Stripe
//    reports the subscription active again, so a later past-due episode can
//    trigger the workflow once more. Removal failures are retried, never swallowed.
//  - Each job re-checks the live lock state before touching the CRM.
// Delivery is off unless VAULT_PAYMENT_RECOVERY_ENABLED === 'true' AND an
// existing published CRM workflow id is configured and verified.
/* eslint-disable @typescript-eslint/no-explicit-any */

export const RECOVERY_TAG = 'vault-payment-past-due';
/** Stable signed-in destination. Never a (short-lived) Stripe portal URL. */
export const RECOVERY_URL = 'https://member.vaulttradingacademy.com/academy/home?billing=recover';
const GHL = 'https://services.leadconnectorhq.com';
export const WITHHELD_AT = 'infinity';

export type RecoveryEnv = { enabled: boolean; ghlKey: string; locationId: string; workflowId: string };
export type RecoveryKind = 'notify' | 'clear';
export type RecoveryJob = { stripe_invoice_id: string; kind?: RecoveryKind; stripe_subscription_id: string; auth_user_id: string | null; email: string; attempts: number };
export type RecoveryOutcome = 'sent' | 'retry' | 'withheld' | 'unacknowledged';

export function recoveryEnv(get: (k: string) => string | undefined): RecoveryEnv {
  return {
    enabled: get('VAULT_PAYMENT_RECOVERY_ENABLED') === 'true',
    ghlKey: get('GHL_API_KEY') || '',
    locationId: get('GHL_LOCATION_ID') || '',
    workflowId: get('GHL_PAYMENT_RECOVERY_WORKFLOW_ID') || '',
  };
}
export const recoveryReady = (e: RecoveryEnv) => e.enabled && !!e.ghlKey && !!e.locationId && !!e.workflowId;
export const recoveryBackoffMs = (attempts: number) => Math.min(3_600_000, 60_000 * 2 ** Math.min(Math.max(attempts, 0), 6));
const ghlHeaders = (env: RecoveryEnv) => ({ Authorization: `Bearer ${env.ghlKey}`, Version: '2021-07-28', 'Content-Type': 'application/json' });

/** The configured workflow must already exist and be published in the CRM. */
export async function recoveryWorkflowPublished(env: RecoveryEnv, fetchFn: typeof fetch, timeoutMs = 10_000): Promise<boolean> {
  try {
    const res = await fetchFn(`${GHL}/workflows/?locationId=${encodeURIComponent(env.locationId)}`, { headers: ghlHeaders(env), signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return false;
    const body = await res.json().catch(() => ({}));
    return (body?.workflows ?? []).some((w: any) => w?.id === env.workflowId && w?.status === 'published');
  } catch { return false; }
}

/** Notify only while the re-read subscription is still past due (replay/out-of-order safe). */
export function shouldEnqueueRecovery(eventType: string, currentSubscriptionStatus: string | null | undefined): boolean {
  return eventType === 'invoice.payment_failed' && currentSubscriptionStatus === 'past_due';
}
/** Clear the tag only when the re-read subscription is active again. */
export function shouldEnqueueClear(eventType: string, currentSubscriptionStatus: string | null | undefined): boolean {
  return eventType === 'invoice.paid' && currentSubscriptionStatus === 'active';
}

/** Idempotent: the job key primary key makes webhook replays a no-op. */
export async function enqueueRecovery(db: any, job: { invoiceId: string; subscriptionId: string; authUserId: string | null; email: string; kind?: RecoveryKind }) {
  const kind = job.kind ?? 'notify';
  const { error } = await db.from('vault_payment_recovery_outbox').upsert({
    stripe_invoice_id: kind === 'clear' ? `clear:${job.invoiceId}` : job.invoiceId,
    kind,
    stripe_subscription_id: job.subscriptionId,
    auth_user_id: job.authUserId,
    email: job.email.trim().toLowerCase(),
  }, { onConflict: 'stripe_invoice_id', ignoreDuplicates: true });
  if (error) throw error;
}

export interface RecoveryStore {
  isStillLocked(job: RecoveryJob): Promise<boolean>;
  markSent(id: string): Promise<void>;
  markRetry(id: string, attempts: number, err: string): Promise<void>;
  markWithheld(id: string, reason: string): Promise<void>;
}

/** Deliver one already-leased job. Never throws. */
export async function deliverRecoveryJob(store: RecoveryStore, job: RecoveryJob, env: RecoveryEnv, fetchFn: typeof fetch, timeoutMs = 15_000): Promise<RecoveryOutcome> {
  const id = job.stripe_invoice_id;
  const kind: RecoveryKind = job.kind ?? 'notify';
  let crmDone = false;
  try {
    const locked = !!job.auth_user_id && await store.isStillLocked(job);
    if (kind === 'notify' && !locked) { await store.markWithheld(id, 'Payment already resolved or account not locked'); return 'withheld'; }
    if (kind === 'clear' && locked) { await store.markWithheld(id, 'Account is past due again; tag kept'); return 'withheld'; }
    const signal = AbortSignal.timeout(timeoutMs);
    const headers = ghlHeaders(env);
    const res = await fetchFn(`${GHL}/contacts/upsert`, { method: 'POST', headers, body: JSON.stringify({ locationId: env.locationId, email: job.email }), signal });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.contact?.id) throw new Error(`GHL contact upsert HTTP ${res.status}`);
    const tag = await fetchFn(`${GHL}/contacts/${encodeURIComponent(body.contact.id)}/tags`, {
      method: kind === 'notify' ? 'POST' : 'DELETE', headers, body: JSON.stringify({ tags: [RECOVERY_TAG] }), signal,
    });
    if (!tag.ok) throw new Error(`GHL tag ${kind} HTTP ${tag.status}`);
    crmDone = true;
    await store.markSent(id);
    return 'sent';
  } catch (e) {
    // CRM already acknowledged but our DB write failed: do NOT reschedule; the
    // lease expires and the idempotent tag operation is safely repeated.
    if (crmDone) return 'unacknowledged';
    try { await store.markRetry(id, job.attempts, String((e as Error)?.name === 'TimeoutError' ? 'CRM timeout' : e).slice(0, 250)); } catch { /* lease expiry recovers */ }
    return 'retry';
  }
}

export function supabaseRecoveryStore(db: any): RecoveryStore {
  const T = 'vault_payment_recovery_outbox';
  const ok = ({ error }: any) => { if (error) throw error; };
  return {
    async isStillLocked(job) {
      const { data, error } = await db.rpc('vault_payment_locked', { uid: job.auth_user_id });
      if (error) throw error;
      return data === true;
    },
    async markSent(id) { ok(await db.from(T).update({ state: 'sent', sent_at: new Date().toISOString(), locked_until: null, last_error: null }).eq('stripe_invoice_id', id)); },
    async markRetry(id, attempts, err) {
      ok(await db.from(T).update({ state: 'pending', locked_until: null, last_error: err, next_attempt_at: new Date(Date.now() + recoveryBackoffMs(attempts)).toISOString() }).eq('stripe_invoice_id', id).neq('state', 'sent'));
    },
    async markWithheld(id, reason) {
      ok(await db.from(T).update({ state: 'pending', locked_until: null, last_error: `withheld: ${reason}`.slice(0, 250), next_attempt_at: WITHHELD_AT }).eq('stripe_invoice_id', id).neq('state', 'sent'));
    },
  };
}
