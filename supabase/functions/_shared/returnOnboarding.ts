// Shared paid-return welcome delivery. Used by the webhook (one immediate,
// targeted attempt right after the payment + outbox row commit) and by the
// authenticated sync-vault-onboarding worker (retry backstop).
// The CRM tag `vault-reactivation-paid` is the only trigger; nothing here
// sends email directly. CRM failures never touch billing/payment records.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { returnAccessValid } from './returnOffer.ts';

export const ONBOARDING_TAG = 'vault-reactivation-paid';
export const LEASE_MS = 5 * 60_000;
export const IMMEDIATE_TIMEOUT_MS = 4_000;
const GHL = 'https://services.leadconnectorhq.com';
/** Terminal "withheld" without a schema change: never due again. */
export const WITHHELD_AT = 'infinity';
const TERMINAL_STATUSES = ['canceled', 'incomplete_expired', 'unpaid', 'ended'];

export type OnboardingEnv = { enabled: boolean; ghlKey: string; locationId: string };
export type Job = { stripe_subscription_id: string; email: string; state: string; attempts: number; next_attempt_at: string; locked_until: string | null };
export type Membership = { paid_at: string | null; status: string; access_until: string } | null;
export type Outcome = 'sent' | 'retry' | 'withheld' | 'skipped';

export interface OutboxStore {
  getJob(sub: string): Promise<Job | null>;
  /** Atomic compare-and-set lease; returns the leased job or null if someone else holds/finished it. */
  tryLease(job: Job, now: Date): Promise<Job | null>;
  getMembership(sub: string): Promise<Membership>;
  markSent(sub: string, now: Date): Promise<void>;
  markRetry(sub: string, attempts: number, error: string, now: Date): Promise<void>;
  markWithheld(sub: string, reason: string): Promise<void>;
}

export function onboardingEnv(get: (k: string) => string | undefined): OnboardingEnv {
  return { enabled: get('VAULT_RETURN_ONBOARDING_ENABLED') === 'true', ghlKey: get('GHL_API_KEY') || '', locationId: get('GHL_LOCATION_ID') || '' };
}
export const onboardingReady = (e: OnboardingEnv) => e.enabled && !!e.ghlKey && !!e.locationId;
export const backoffMs = (attempts: number) => Math.min(3_600_000, 60_000 * 2 ** Math.min(Math.max(attempts, 0), 6));

/** Terminal when the membership can no longer become valid (canceled/expired). */
export function isTerminallyInvalid(m: Membership, now = Date.now()): boolean {
  if (!m) return false;
  if (TERMINAL_STATUSES.includes(m.status)) return true;
  const until = Date.parse(m.access_until);
  return Number.isFinite(until) && until <= now;
}

/** Deliver one ALREADY-LEASED job. Never throws. */
export async function deliverLeasedJob(store: OutboxStore, job: Job, env: OnboardingEnv, fetchFn: typeof fetch, timeoutMs: number, now = new Date()): Promise<Outcome> {
  const sub = job.stripe_subscription_id;
  try {
    const m = await store.getMembership(sub);
    if (isTerminallyInvalid(m, now.getTime())) { await store.markWithheld(sub, 'Membership canceled or expired; onboarding withheld'); return 'withheld'; }
    if (!returnAccessValid(m, now.getTime())) throw new Error('Paid membership not currently valid; onboarding withheld');
    const deadline = AbortSignal.timeout(timeoutMs);
    const headers = { Authorization: `Bearer ${env.ghlKey}`, Version: '2021-07-28', 'Content-Type': 'application/json' };
    const res = await fetchFn(`${GHL}/contacts/upsert`, { method: 'POST', headers, body: JSON.stringify({ locationId: env.locationId, email: job.email }), signal: deadline });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.contact?.id) throw new Error(`GHL contact upsert HTTP ${res.status}`);
    const tag = await fetchFn(`${GHL}/contacts/${encodeURIComponent(body.contact.id)}/tags`, { method: 'POST', headers, body: JSON.stringify({ tags: [ONBOARDING_TAG] }), signal: deadline });
    if (!tag.ok) throw new Error(`GHL tag HTTP ${tag.status}`);
    await store.markSent(sub, new Date());
    return 'sent';
  } catch (e) {
    try { await store.markRetry(sub, job.attempts, String((e as Error)?.name === 'TimeoutError' ? 'CRM timeout' : e).slice(0, 250), new Date()); } catch { /* lease expiry recovers */ }
    return 'retry';
  }
}

/**
 * Immediate targeted attempt after the payment + outbox commit. Never throws,
 * so a CRM problem can never fail or roll back the payment acknowledgement.
 */
export async function attemptImmediateOnboarding(store: OutboxStore, sub: string, env: OnboardingEnv, fetchFn: typeof fetch = fetch, timeoutMs = IMMEDIATE_TIMEOUT_MS): Promise<Outcome> {
  try {
    if (!onboardingReady(env)) return 'skipped';
    const now = new Date();
    const job = await store.getJob(sub);
    if (!job || job.state === 'sent' || job.next_attempt_at === WITHHELD_AT) return 'skipped';
    const leased = await store.tryLease(job, now);
    if (!leased) return 'skipped';
    return await deliverLeasedJob(store, leased, env, fetchFn, timeoutMs, now);
  } catch { return 'skipped'; }
}

/** Service-role PostgREST adapter. */
export function supabaseOutboxStore(db: any): OutboxStore {
  const T = 'vault_onboarding_outbox';
  const ok = ({ error }: any) => { if (error) throw error; };
  return {
    async getJob(sub) {
      const { data, error } = await db.from(T).select('stripe_subscription_id,email,state,attempts,next_attempt_at,locked_until').eq('stripe_subscription_id', sub).maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    async tryLease(job, now) {
      const { data, error } = await db.from(T)
        .update({ state: 'processing', locked_until: new Date(now.getTime() + LEASE_MS).toISOString(), attempts: job.attempts + 1 })
        .eq('stripe_subscription_id', job.stripe_subscription_id).eq('attempts', job.attempts).neq('state', 'sent')
        .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`)
        .select('stripe_subscription_id,email,state,attempts,next_attempt_at,locked_until');
      if (error) throw error;
      return data?.[0] ?? null;
    },
    async getMembership(sub) {
      const { data, error } = await db.from('vault_return_memberships').select('paid_at,status,access_until').eq('stripe_subscription_id', sub).maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    async markSent(sub, now) { ok(await db.from(T).update({ state: 'sent', sent_at: now.toISOString(), locked_until: null, last_error: null }).eq('stripe_subscription_id', sub)); },
    async markRetry(sub, attempts, err, now) {
      ok(await db.from(T).update({ state: 'pending', locked_until: null, last_error: err, next_attempt_at: new Date(now.getTime() + backoffMs(attempts)).toISOString() }).eq('stripe_subscription_id', sub).neq('state', 'sent'));
    },
    async markWithheld(sub, reason) {
      ok(await db.from(T).update({ state: 'pending', locked_until: null, last_error: `withheld: ${reason}`.slice(0, 250), next_attempt_at: WITHHELD_AT }).eq('stripe_subscription_id', sub).neq('state', 'sent'));
    },
  };
}
