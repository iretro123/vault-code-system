// Past-due payment recovery notice. The webhook enqueues one durable row per
// failed invoice (deduplicated by invoice id) after re-reading the CURRENT
// subscription from Stripe; the authenticated worker delivers it by tagging
// the account email in the existing CRM. Nothing here sends email directly,
// and delivery stays off unless VAULT_PAYMENT_RECOVERY_ENABLED === 'true'.
/* eslint-disable @typescript-eslint/no-explicit-any */

export const RECOVERY_TAG = 'vault-payment-past-due';
/** Stable signed-in destination. Never a (short-lived) Stripe portal URL. */
export const RECOVERY_URL = 'https://member.vaulttradingacademy.com/academy/home?billing=recover';
const GHL = 'https://services.leadconnectorhq.com';
export const WITHHELD_AT = 'infinity';

export type RecoveryEnv = { enabled: boolean; ghlKey: string; locationId: string };
export type RecoveryJob = { stripe_invoice_id: string; stripe_subscription_id: string; auth_user_id: string | null; email: string; attempts: number };
export type RecoveryOutcome = 'sent' | 'retry' | 'withheld';

export function recoveryEnv(get: (k: string) => string | undefined): RecoveryEnv {
  return { enabled: get('VAULT_PAYMENT_RECOVERY_ENABLED') === 'true', ghlKey: get('GHL_API_KEY') || '', locationId: get('GHL_LOCATION_ID') || '' };
}
export const recoveryReady = (e: RecoveryEnv) => e.enabled && !!e.ghlKey && !!e.locationId;
export const recoveryBackoffMs = (attempts: number) => Math.min(3_600_000, 60_000 * 2 ** Math.min(Math.max(attempts, 0), 6));

/**
 * Enqueue only when the failure is still current: a delayed/replayed
 * invoice.payment_failed after the member already paid must not notify.
 */
export function shouldEnqueueRecovery(eventType: string, currentSubscriptionStatus: string | null | undefined): boolean {
  return eventType === 'invoice.payment_failed' && currentSubscriptionStatus === 'past_due';
}

/** Idempotent: the invoice id primary key makes replays a no-op. */
export async function enqueueRecovery(db: any, job: { invoiceId: string; subscriptionId: string; authUserId: string | null; email: string }) {
  const { error } = await db.from('vault_payment_recovery_outbox').upsert({
    stripe_invoice_id: job.invoiceId,
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
  try {
    if (!job.auth_user_id || !(await store.isStillLocked(job))) {
      await store.markWithheld(id, 'Payment already resolved or account not locked');
      return 'withheld';
    }
    const signal = AbortSignal.timeout(timeoutMs);
    const headers = { Authorization: `Bearer ${env.ghlKey}`, Version: '2021-07-28', 'Content-Type': 'application/json' };
    const res = await fetchFn(`${GHL}/contacts/upsert`, { method: 'POST', headers, body: JSON.stringify({ locationId: env.locationId, email: job.email }), signal });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.contact?.id) throw new Error(`GHL contact upsert HTTP ${res.status}`);
    const tags = `${GHL}/contacts/${encodeURIComponent(body.contact.id)}/tags`;
    // Remove-then-add so a later failed invoice can trigger the workflow again.
    await fetchFn(tags, { method: 'DELETE', headers, body: JSON.stringify({ tags: [RECOVERY_TAG] }), signal }).catch(() => undefined);
    const tag = await fetchFn(tags, { method: 'POST', headers, body: JSON.stringify({ tags: [RECOVERY_TAG] }), signal });
    if (!tag.ok) throw new Error(`GHL tag HTTP ${tag.status}`);
    await store.markSent(id);
    return 'sent';
  } catch (e) {
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
