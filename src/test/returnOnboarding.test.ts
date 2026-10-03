// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { attemptImmediateOnboarding, backoffMs, deliverLeasedJob, LEASE_MS, WITHHELD_AT, type Job, type Membership, type OutboxStore } from '../../supabase/functions/_shared/returnOnboarding';
import { fulfillReturnCheckout } from '../../supabase/functions/_shared/returnFulfillment';

const SUB = 'sub_1';
const ENV = { enabled: true, ghlKey: 'k', locationId: 'loc' };
const valid = (): Membership => ({ paid_at: new Date().toISOString(), status: 'trialing', access_until: new Date(Date.now() + 86400e3).toISOString() });

function memStore(membership: Membership = valid()) {
  const job: Job = { stripe_subscription_id: SUB, email: 'b@example.com', state: 'pending', attempts: 0, next_attempt_at: new Date().toISOString(), locked_until: null };
  const s = { job, membership, error: null as string | null };
  const store: OutboxStore = {
    getJob: async () => ({ ...s.job }),
    tryLease: async (j, now) => { // atomic CAS like the PostgREST conditional update
      const cur = s.job;
      if (cur.attempts !== j.attempts || cur.state === 'sent' || (cur.locked_until && Date.parse(cur.locked_until) >= now.getTime())) return null;
      s.job = { ...cur, state: 'processing', attempts: cur.attempts + 1, locked_until: new Date(now.getTime() + LEASE_MS).toISOString() };
      return { ...s.job };
    },
    getMembership: async () => s.membership,
    markSent: async () => { s.job = { ...s.job, state: 'sent', locked_until: null }; },
    markRetry: async (_sub, attempts, err, now) => { if (s.job.state !== 'sent') { s.job = { ...s.job, state: 'pending', locked_until: null, next_attempt_at: new Date(now.getTime() + backoffMs(attempts)).toISOString() }; s.error = err; } },
    markWithheld: async (_sub, reason) => { s.job = { ...s.job, state: 'pending', locked_until: null, next_attempt_at: WITHHELD_AT }; s.error = reason; },
  };
  return { s, store };
}
const okCrm = () => vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith('/upsert') ? { contact: { id: 'c1' } } : {}), { status: 200 }));

describe('immediate paid-return welcome attempt', () => {
  it('sends once after commit and marks the job sent', async () => {
    const { s, store } = memStore(); const crm = okCrm();
    expect(await attemptImmediateOnboarding(store, SUB, ENV, crm as any)).toBe('sent');
    expect(crm).toHaveBeenCalledTimes(2);
    expect(String(crm.mock.calls[1][1].body)).toContain('vault-reactivation-paid');
    expect(s.job.state).toBe('sent');
  });

  it('switch off or CRM settings missing: no CRM call, job stays pending', async () => {
    for (const env of [{ ...ENV, enabled: false }, { ...ENV, ghlKey: '' }, { ...ENV, locationId: '' }]) {
      const { s, store } = memStore(); const crm = okCrm();
      expect(await attemptImmediateOnboarding(store, SUB, env, crm as any)).toBe('skipped');
      expect(crm).not.toHaveBeenCalled();
      expect(s.job).toMatchObject({ state: 'pending', attempts: 0 });
    }
  });

  it('payment commit failure: no CRM call and the error still reaches Stripe for retry', async () => {
    const crm = okCrm(); const after = vi.fn();
    const session = { id: 'cs', payment_link: 'pl', mode: 'subscription', payment_status: 'paid', currency: 'usd', amount_total: 199, subscription: SUB, customer: 'cus', customer_details: { email: 'b@example.com' } };
    const lines = [{ quantity: 1, price: { id: 'pm', unit_amount: 9900, currency: 'usd', recurring: { interval: 'month', interval_count: 1 } } }, { quantity: 1, price: { id: 'pi', unit_amount: 199, currency: 'usd' } }];
    const sub = { id: SUB, customer: 'cus', status: 'trialing', trial_start: 1, trial_end: 1 + 30 * 86400, items: { data: [{ price: { id: 'pm' } }] } };
    const stripe = { checkout: { sessions: { listLineItems: async () => ({ data: lines }) } }, subscriptions: { retrieve: async () => sub } };
    const db = { rpc: async () => ({ error: new Error('db down') }) };
    await expect(fulfillReturnCheckout(session, stripe, db, { paymentLinkId: 'pl', monthlyPriceId: 'pm', introPriceId: 'pi' }, after)).rejects.toThrow('db down');
    expect(after).not.toHaveBeenCalled();
    expect(crm).not.toHaveBeenCalled();
  });

  it('afterCommit failure never fails the payment acknowledgement', async () => {
    const session = { id: 'cs', payment_link: 'pl', mode: 'subscription', payment_status: 'paid', currency: 'usd', amount_total: 199, subscription: SUB, customer: 'cus', customer_details: { email: 'b@example.com' } };
    const lines = [{ quantity: 1, price: { id: 'pm', unit_amount: 9900, currency: 'usd', recurring: { interval: 'month', interval_count: 1 } } }, { quantity: 1, price: { id: 'pi', unit_amount: 199, currency: 'usd' } }];
    const sub = { id: SUB, customer: 'cus', status: 'trialing', trial_start: 1, trial_end: 1 + 30 * 86400, items: { data: [{ price: { id: 'pm' } }] } };
    const stripe = { checkout: { sessions: { listLineItems: async () => ({ data: lines }) } }, subscriptions: { retrieve: async () => sub } };
    const db = { rpc: async () => ({ error: null }) };
    await expect(fulfillReturnCheckout(session, stripe, db, { paymentLinkId: 'pl', monthlyPriceId: 'pm', introPriceId: 'pi' }, async () => { throw new Error('crm'); })).resolves.toBe(true);
  });

  it('duplicate / concurrent attempts call the CRM only once', async () => {
    const { s, store } = memStore(); const crm = okCrm();
    const r = await Promise.all([attemptImmediateOnboarding(store, SUB, ENV, crm as any), attemptImmediateOnboarding(store, SUB, ENV, crm as any)]);
    expect(r.sort()).toEqual(['sent', 'skipped']);
    expect(await attemptImmediateOnboarding(store, SUB, ENV, crm as any)).toBe('skipped'); // replayed event
    expect(crm).toHaveBeenCalledTimes(2); // one upsert + one tag
    expect(s.job.state).toBe('sent');
  });

  it('CRM timeout leaves the job pending with backoff for the worker', async () => {
    const { s, store } = memStore();
    const hang = vi.fn((_u: string, init: RequestInit) => new Promise<Response>((_, rej) => init.signal!.addEventListener('abort', () => rej(init.signal!.reason))));
    expect(await attemptImmediateOnboarding(store, SUB, ENV, hang as any, 20)).toBe('retry');
    expect(s.job.state).toBe('pending');
    expect(s.error).toBe('CRM timeout');
    expect(Date.parse(s.job.next_attempt_at)).toBeGreaterThan(Date.now() + 30_000);
    // worker retry later succeeds
    const leased = await store.tryLease(s.job, new Date());
    expect(await deliverLeasedJob(store, leased!, ENV, okCrm() as any, 1000)).toBe('sent');
  });

  it('CRM HTTP error stays pending, independent of payment', async () => {
    const { s, store } = memStore();
    const bad = vi.fn(async () => new Response('{}', { status: 502 }));
    expect(await attemptImmediateOnboarding(store, SUB, ENV, bad as any)).toBe('retry');
    expect(s.job.state).toBe('pending');
    expect(s.error).toContain('502');
  });

  it('canceled or expired membership is withheld terminally and never retried', async () => {
    for (const m of [{ ...valid()!, status: 'canceled' }, { ...valid()!, access_until: new Date(Date.now() - 1000).toISOString() }]) {
      const { s, store } = memStore(m); const crm = okCrm();
      expect(await attemptImmediateOnboarding(store, SUB, ENV, crm as any)).toBe('withheld');
      expect(crm).not.toHaveBeenCalled();
      expect(s.job.next_attempt_at).toBe(WITHHELD_AT);
      expect(await attemptImmediateOnboarding(store, SUB, ENV, crm as any)).toBe('skipped');
    }
  });
});
