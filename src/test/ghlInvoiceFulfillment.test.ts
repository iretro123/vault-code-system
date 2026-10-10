import { describe, expect, it, vi } from 'vitest';
import { fulfillGhlInvoice, ghlConfig, GHL_APPROVED } from '../../supabase/functions/_shared/ghlInvoiceFulfillment';
import { syncReturnSubscription } from '../../supabase/functions/_shared/returnFulfillment';

const cfg = { ...GHL_APPROVED, enabled: true };
const P = GHL_APPROVED.monthlyPriceId;
const now = Math.floor(Date.now() / 1000);

function fx() {
  const trialLine = { quantity: 1, amount: 0, currency: 'usd', pricing: { price_details: { price: P, product: GHL_APPROVED.productId } }, parent: { type: 'subscription_item_details' } };
  const setupLine = { quantity: 1, amount: 199, currency: 'usd', pricing: { price_details: { price: 'price_setup', product: 'prod_setup' } }, parent: { type: 'invoice_item_details' } };
  const invoice: any = { id: 'in_1', livemode: true, billing_reason: 'subscription_create', status: 'paid', currency: 'usd', total: 199, amount_due: 199, amount_paid: 199, amount_remaining: 0, starting_balance: 0, customer: 'cus_1', customer_email: 'Buyer@Example.com ', parent: { subscription_details: { subscription: 'sub_1' } }, lines: { data: [trialLine, setupLine] } };
  const payments: any[] = [{ status: 'paid', amount_paid: 199, currency: 'usd', payment: { type: 'payment_intent', payment_intent: 'pi_1' } }];
  const pi: any = { id: 'pi_1', livemode: true, status: 'succeeded', amount_received: 199, currency: 'usd', customer: 'cus_1', metadata: { altId: GHL_APPROVED.locationId, altType: 'location', orderId: 'ord_1' } };
  const sub: any = { id: 'sub_1', customer: 'cus_1', status: 'trialing', trial_start: now, trial_end: now + 30 * 86400, items: { data: [{ quantity: 1, price: { id: P, product: GHL_APPROVED.productId, unit_amount: 9900, currency: 'usd', recurring: { interval: 'month', interval_count: 1 } } }] } };
  const stripe = {
    invoices: { retrieve: vi.fn(async () => invoice), listLineItems: vi.fn(async () => ({ data: invoice.lines.data })) },
    invoicePayments: { list: vi.fn(async () => ({ data: payments })) },
    paymentIntents: { retrieve: vi.fn(async () => pi) },
    subscriptions: { retrieve: vi.fn(async () => sub) },
    customers: { retrieve: vi.fn(async () => ({ email: 'buyer@example.com' })) },
  };
  const db = { rpc: vi.fn(async () => ({ data: true, error: null })) };
  return { invoice, payments, pi, sub, stripe, db };
}

describe('GHL native $1.99 invoice fulfillment', () => {
  it('flag is off unless exactly "true"', () => {
    expect(ghlConfig(() => undefined).enabled).toBe(false);
    expect(ghlConfig(() => '1').enabled).toBe(false);
    expect(ghlConfig(() => 'true').enabled).toBe(true);
  });

  it('flag off: no Stripe or DB calls, existing path runs', async () => {
    const f = fx();
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, f.db, { ...cfg, enabled: false })).toBe('not_applicable');
    expect(f.stripe.invoices.retrieve).not.toHaveBeenCalled();
  });

  it('valid $1.99 initial invoice records truthful proof atomically and triggers immediate welcome', async () => {
    const f = fx(); const after = vi.fn();
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg, after)).toBe('provisioned');
    expect(f.db.rpc).toHaveBeenCalledWith('record_vault_ghl_invoice_payment', expect.objectContaining({
      p_subscription: 'sub_1', p_invoice: 'in_1', p_payment_intent: 'pi_1', p_customer: 'cus_1', p_email: 'buyer@example.com',
      p_status: 'trialing', p_price: P, p_location: GHL_APPROVED.locationId, p_order: 'ord_1',
    }));
    expect(after).toHaveBeenCalledWith('sub_1');
  });

  it('onboarding failure after commit never rolls back the payment', async () => {
    const f = fx();
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg, async () => { throw new Error('crm down'); })).toBe('provisioned');
  });

  const bad: [string, (f: ReturnType<typeof fx>) => void][] = [
    ['unpaid invoice', f => { f.invoice.status = 'open'; }],
    ['zero invoice', f => { Object.assign(f.invoice, { total: 0, amount_due: 0, amount_paid: 0 }); }],
    ['paid out of band', f => { f.invoice.paid_out_of_band = true; }],
    ['credit-only settlement', f => { f.invoice.starting_balance = -199; }],
    ['out-of-band payment record', f => { f.payments[0].payment = { type: 'out_of_band_payment' }; }],
    ['mismatched PI amount', f => { f.pi.amount_received = 99; }],
    ['PI not succeeded', f => { f.pi.status = 'processing'; }],
    ['PI customer mismatch', f => { f.pi.customer = 'cus_other'; }],
    ['foreign GHL location', f => { f.pi.metadata.altId = 'otherLoc'; }],
    ['missing location type', f => { delete f.pi.metadata.altType; }],
    ['subscription customer mismatch', f => { f.sub.customer = 'cus_other'; }],
    ['wrong subscription price', f => { f.sub.items.data[0].price.id = 'price_other'; }],
    ['wrong product', f => { f.sub.items.data[0].price.product = 'prod_other'; }],
    ['quantity 2', f => { f.sub.items.data[0].quantity = 2; }],
    ['extra subscription item', f => { f.sub.items.data.push(f.sub.items.data[0]); }],
    ['7-day trial', f => { f.sub.trial_end = f.sub.trial_start + 7 * 86400; }],
    ['no trial', f => { f.sub.trial_start = null; }],
    ['setup fee changed', f => { f.invoice.lines.data[1].amount = 99; f.invoice.total = 99; }],
    ['out-of-order cancel before initial paid event', f => { f.sub.status = 'canceled'; }],
    ['past_due before initial paid event', f => { f.sub.status = 'past_due'; }],
    ['invoice tied to another subscription', f => { f.invoice.parent.subscription_details.subscription = 'sub_x'; }],
    ['test-mode invoice', f => { f.invoice.livemode = false; }],
  ];
  it.each(bad)('rejects %s without granting or queueing', async (_n, mutate) => {
    const f = fx(); mutate(f); const after = vi.fn(); const onReject = vi.fn();
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg, after, onReject)).toBe('rejected');
    expect(f.db.rpc).not.toHaveBeenCalled(); expect(after).not.toHaveBeenCalled(); expect(onReject).toHaveBeenCalled();
  });

  it('other prices (legacy payment link, $99 generic) are left to the existing handlers', async () => {
    const f = fx(); f.invoice.lines.data = [{ quantity: 1, amount: 9900, pricing: { price_details: { price: 'price_legacy' } } }];
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg)).toBe('not_applicable');
    expect(f.stripe.invoices.retrieve).not.toHaveBeenCalled();
  });

  it('$99 renewal invoice never provisions or re-queues a welcome', async () => {
    const f = fx(); f.invoice.billing_reason = 'subscription_cycle';
    const after = vi.fn();
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg, after)).toBe('not_applicable');
    expect(f.db.rpc).not.toHaveBeenCalled(); expect(after).not.toHaveBeenCalled();
  });

  it('trusts canonical invoice over a tampered event payload', async () => {
    const f = fx(); const canonical = { ...f.invoice, status: 'open' };
    f.stripe.invoices.retrieve.mockResolvedValue(canonical);
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg)).toBe('rejected');
  });

  it('replay reports replayed (RPC no-op) and transient DB errors throw for Stripe retry', async () => {
    const f = fx(); f.db.rpc.mockResolvedValueOnce({ data: false, error: null });
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg)).toBe('replayed');
    f.db.rpc.mockResolvedValueOnce({ data: null, error: new Error('db down') } as any);
    await expect(fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg)).rejects.toThrow('db down');
  });
});

describe('subscription sync reports the bound membership source', () => {
  const mk = (data: any[]) => {
    const select = vi.fn().mockResolvedValue({ data, error: null });
    return { from: () => ({ update: () => ({ eq: () => ({ select }) }) }) };
  };
  it('returns ghl source so the generic price grant is skipped', async () => {
    expect(await syncReturnSubscription({ id: 's', status: 'active' }, mk([{ auth_user_id: null, source: 'ghl_native_invoice', access_until: new Date(Date.now() + 1e8).toISOString() }]))).toEqual({ source: 'ghl_native_invoice' });
    expect(await syncReturnSubscription({ id: 's', status: 'active' }, mk([]))).toBeNull();
  });
  it('canceled GHL membership still revokes the bound role', async () => {
    const onEnded = vi.fn();
    await syncReturnSubscription({ id: 's', status: 'canceled' }, mk([{ auth_user_id: 'u1', email: 'b@x.com', source: 'ghl_native_invoice', access_until: new Date(Date.now() + 1e8).toISOString() }]), onEnded);
    expect(onEnded).toHaveBeenCalledWith('u1', 'b@x.com');
  });
});
