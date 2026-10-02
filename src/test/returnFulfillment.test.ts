import { describe, expect, it, vi } from 'vitest';
import { fulfillReturnCheckout, syncReturnSubscription } from '../../supabase/functions/_shared/returnFulfillment';

const config = { paymentLinkId: 'plink_return', monthlyPriceId: 'price_monthly', introPriceId: 'price_intro' };
function fixture() {
  const session = { id: 'cs_paid', payment_link: 'plink_return', mode: 'subscription', payment_status: 'paid', currency: 'usd', amount_total: 199, subscription: 'sub_paid', customer: 'cus_paid', customer_details: { email: ' RETURN@EXAMPLE.COM ' } };
  const lines = [
    { quantity: 1, price: { id: 'price_monthly', unit_amount: 9900, currency: 'usd', recurring: { interval: 'month', interval_count: 1 } } },
    { quantity: 1, price: { id: 'price_intro', unit_amount: 199, currency: 'usd' } },
  ];
  const sub = { id: 'sub_paid', customer: 'cus_paid', status: 'trialing', trial_start: 1800000000, trial_end: 1802592000, items: { data: [{ price: { id: 'price_monthly' }, current_period_end: 1805184000 }] } };
  const stripe = { checkout: { sessions: { listLineItems: vi.fn().mockResolvedValue({ data: lines }) } }, subscriptions: { retrieve: vi.fn().mockResolvedValue(sub) } };
  const db = { rpc: vi.fn().mockResolvedValue({ error: null }) };
  return { session, lines, sub, stripe, db };
}

describe('verified checkout fulfillment', () => {
  it('records the paid buyer and bounded access atomically', async () => {
    const f = fixture();
    expect(await fulfillReturnCheckout(f.session, f.stripe, f.db, config)).toBe(true);
    expect(f.db.rpc).toHaveBeenCalledWith('record_vault_return_payment', {
      p_subscription: 'sub_paid', p_checkout: 'cs_paid', p_customer: 'cus_paid', p_email: 'return@example.com', p_status: 'trialing', p_end: new Date(f.sub.trial_end * 1000).toISOString(),
    });
  });
  it('leaves unrelated checkouts to the existing billing handler', async () => {
    const f = fixture();
    expect(await fulfillReturnCheckout({ ...f.session, payment_link: 'plink_other' }, f.stripe, f.db, config)).toBe(false);
    expect(f.stripe.checkout.sessions.listLineItems).not.toHaveBeenCalled();
    expect(f.db.rpc).not.toHaveBeenCalled();
  });
  it('does not grant or queue an unpaid checkout', async () => {
    const f = fixture();
    expect(await fulfillReturnCheckout({ ...f.session, payment_status: 'unpaid' }, f.stripe, f.db, config)).toBe(true);
    expect(f.db.rpc).not.toHaveBeenCalled();
  });
  it('rejects discounted or changed amounts before retrieving a subscription', async () => {
    const f = fixture();
    await expect(fulfillReturnCheckout({ ...f.session, amount_total: 99 }, f.stripe, f.db, config)).rejects.toThrow('approved pricing');
    expect(f.stripe.subscriptions.retrieve).not.toHaveBeenCalled();
  });
  it.each([
    ['wrong customer', { customer: 'cus_other' }],
    ['canceled subscription', { status: 'canceled' }],
    ['shorter introduction', { trial_end: 1802505600 }],
    ['wrong subscription price', { items: { data: [{ price: { id: 'price_other' } }] } }],
  ])('rejects %s without granting access', async (_name, patch) => {
    const f = fixture();
    f.stripe.subscriptions.retrieve.mockResolvedValue({ ...f.sub, ...patch });
    await expect(fulfillReturnCheckout(f.session, f.stripe, f.db, config)).rejects.toThrow();
    expect(f.db.rpc).not.toHaveBeenCalled();
  });
  it('uses the current active subscription expiry when an event arrives late', async () => {
    const f = fixture();
    f.stripe.subscriptions.retrieve.mockResolvedValue({ ...f.sub, status: 'active' });
    await fulfillReturnCheckout(f.session, f.stripe, f.db, config);
    expect(f.db.rpc.mock.calls[0][1].p_end).toBe(new Date(1805184000 * 1000).toISOString());
  });
  it('surfaces a database failure so Stripe can retry instead of losing the buyer', async () => {
    const f = fixture();
    f.db.rpc.mockResolvedValue({ error: new Error('database unavailable') });
    await expect(fulfillReturnCheckout(f.session, f.stripe, f.db, config)).rejects.toThrow('database unavailable');
  });
});

describe('subscription status synchronization', () => {
  it('updates only the previously verified subscription and preserves expiry if absent', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    await syncReturnSubscription({ id: 'sub_paid', status: 'canceled' }, { from });
    expect(from).toHaveBeenCalledWith('vault_return_memberships');
    expect(update.mock.calls[0][0]).toMatchObject({ status: 'canceled' });
    expect(update.mock.calls[0][0]).not.toHaveProperty('access_until');
    expect(eq).toHaveBeenCalledWith('stripe_subscription_id', 'sub_paid');
  });
});
