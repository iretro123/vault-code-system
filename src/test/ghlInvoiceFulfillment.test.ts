import { describe, expect, it, vi } from 'vitest';
import { fulfillGhlInvoice, ghlConfig, ghlQaConfig, GhlPending, GHL_APPROVED } from '../../supabase/functions/_shared/ghlInvoiceFulfillment';
import { syncReturnSubscription } from '../../supabase/functions/_shared/returnFulfillment';

const cfg = { ...GHL_APPROVED, enabled: true, expectedLivemode: true };
const P = GHL_APPROVED.monthlyPriceId;
const now = Math.floor(Date.now() / 1000);

function fx() {
  const trialStart = now - 60, trialEnd = trialStart + 30 * 86400;
  const trialLine: any = { quantity: 1, amount: 0, currency: 'usd', period: { start: trialStart, end: trialEnd }, pricing: { type: 'price_details', price_details: { price: P, product: GHL_APPROVED.productId } }, parent: { type: 'subscription_item_details', subscription_item_details: { subscription: 'sub_1', subscription_item: 'si_1' } } };
  const setupLine: any = { quantity: 1, amount: 199, currency: 'usd', pricing: { type: 'price_details', price_details: { price: 'price_setup', product: 'prod_setup' } }, parent: { type: 'invoice_item_details', invoice_item_details: { invoice_item: 'ii_1' } } };
  const md = { altId: GHL_APPROVED.locationId, altType: 'location', orderId: 'ord_1' };
  const invoice: any = { id: 'in_1', livemode: true, billing_reason: 'subscription_create', status: 'paid', currency: 'usd', subtotal: 199, total: 199, amount_due: 199, amount_paid: 199, amount_remaining: 0, starting_balance: 0, ending_balance: 0, customer: 'cus_1', customer_email: 'x@y.z', metadata: { ...md }, parent: { subscription_details: { subscription: 'sub_1' } }, lines: { data: [trialLine, setupLine], has_more: false } };
  const payments: any[] = [{ status: 'paid', amount_paid: 199, currency: 'usd', payment: { type: 'payment_intent', payment_intent: 'pi_1' } }];
  const pi: any = { id: 'pi_1', livemode: true, status: 'succeeded', amount: 199, amount_received: 199, currency: 'usd', customer: 'cus_1', metadata: { ...md } };
  const sub: any = { id: 'sub_1', livemode: true, customer: 'cus_1', status: 'trialing', trial_start: trialStart, trial_end: trialEnd, metadata: { ...md }, items: { has_more: false, data: [{ quantity: 1, current_period_end: trialEnd, price: { id: P, type: 'recurring', product: GHL_APPROVED.productId, unit_amount: 9900, currency: 'usd', recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' } } }] } };
  const customer: any = { email: 'Buyer@Example.com ' };
  const stripe = {
    invoices: { retrieve: vi.fn(async () => invoice), listLineItems: vi.fn(async () => ({ data: invoice.lines.data, has_more: false })) },
    invoicePayments: { list: vi.fn(async () => ({ data: payments, has_more: false })) },
    paymentIntents: { retrieve: vi.fn(async () => pi) },
    subscriptions: { retrieve: vi.fn(async () => sub) },
    customers: { retrieve: vi.fn(async () => customer) },
  };
  const db = { rpc: vi.fn(async () => ({ data: true, error: null } as any)) };
  return { invoice, payments, pi, sub, customer, stripe, db };
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
    ['foreign location on invoice copy', f => { f.invoice.metadata.altId = 'otherLoc'; }],
    ['wrong altType', f => { f.pi.metadata.altType = 'company'; }],
    ['order id disagrees across objects', f => { f.sub.metadata.orderId = 'ord_other'; }],
    ['trial 1 hour long', f => { f.sub.trial_end += 3600; }],
    ['trial line period differs', f => { f.invoice.lines.data[0].period.end -= 86400; }],
    ['trial line wrong currency', f => { f.invoice.lines.data[0].currency = 'eur'; }],
    ['trial line wrong product', f => { f.invoice.lines.data[0].pricing.price_details.product = 'prod_x'; }],
    ['trial line for another subscription', f => { f.invoice.lines.data[0].parent.subscription_item_details.subscription = 'sub_x'; }],
    ['extra invoice line', f => { f.invoice.lines.data.push({ ...f.invoice.lines.data[1], amount: 0 }); }],
    ['truncated line list (has_more)', f => { f.stripe.invoices.listLineItems.mockResolvedValue({ data: f.invoice.lines.data, has_more: true }); }],
    ['truncated payment list (has_more)', f => { f.stripe.invoicePayments.list.mockResolvedValue({ data: f.payments, has_more: true }); }],
    ['ending balance credited', f => { f.invoice.ending_balance = -50; }],
    ['credit note applied', f => { f.invoice.pre_payment_credit_notes_amount = 199; }],
    ['trial already over', f => { f.sub.trial_start -= 31 * 86400; f.sub.trial_end -= 31 * 86400; f.invoice.lines.data[0].period = { start: f.sub.trial_start, end: f.sub.trial_end }; }],
    ['test-mode PaymentIntent in production', f => { f.pi.livemode = false; }],
    ['two paid payments', f => { f.payments.push({ ...f.payments[0] }); }],
    ['subscription customer mismatch', f => { f.sub.customer = 'cus_other'; }],
    ['wrong subscription price', f => { f.sub.items.data[0].price.id = 'price_other'; }],
    ['wrong product', f => { f.sub.items.data[0].price.product = 'prod_other'; }],
    ['quantity 2', f => { f.sub.items.data[0].quantity = 2; }],
    ['extra subscription item', f => { f.sub.items.data.push(f.sub.items.data[0]); }],
    ['7-day trial', f => { f.sub.trial_end = f.sub.trial_start + 7 * 86400; }],
    ['no trial', f => { f.sub.trial_start = null; }],
    ['setup fee changed', f => { f.invoice.lines.data[1].amount = 99; }],
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
    f.db.rpc.mockResolvedValueOnce({ data: null, error: new Error('db down') });
    await expect(fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg)).rejects.toThrow('db down');
  });
});

describe('retryable GHL timing gaps (Stripe must redeliver)', () => {
  const gaps: [string, (f: ReturnType<typeof fx>) => void][] = [
    ['PI metadata not yet written (invoice.paid precedes GHL update)', f => { f.pi.metadata = {}; f.invoice.metadata = {}; f.sub.metadata = {}; }],
    ['only orderId missing', f => { delete f.pi.metadata.orderId; }],
    ['customer email not yet set', f => { f.customer.email = null; }],
    ['payment linkage not yet visible', f => { f.payments.length = 0; }],
  ];
  it.each(gaps)('%s throws GhlPending, never rejected/processed', async (_n, mutate) => {
    const f = fx(); mutate(f); const onReject = vi.fn();
    await expect(fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg, undefined, onReject)).rejects.toBeInstanceOf(GhlPending);
    expect(onReject).not.toHaveBeenCalled(); expect(f.db.rpc).not.toHaveBeenCalled();
  });
  it('pending reasons never contain client secrets or metadata values', async () => {
    const f = fx(); f.pi.metadata = {}; f.pi.client_secret = 'pi_1_secret_abc';
    const err: any = await fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg).catch(e => e);
    expect(String(err.message)).not.toMatch(/secret|ord_1|G56/);
  });
  it('regression: first delivery before GHL metadata, redelivery after → exactly one membership + welcome', async () => {
    const f = fx(); const saved = { ...f.pi.metadata }; f.pi.metadata = {};
    const after = vi.fn();
    await expect(fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg, after)).rejects.toBeInstanceOf(GhlPending);
    f.pi.metadata = saved; // GHL POST-updated metadata ~6s later
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg, after)).toBe('provisioned');
    f.db.rpc.mockResolvedValueOnce({ data: false, error: null }); // later duplicate delivery
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg, after)).toBe('replayed');
    expect(f.db.rpc).toHaveBeenCalledTimes(2);
    expect(after).toHaveBeenCalledTimes(2); // the outbox lease makes the second attempt 'skipped'
  });
});

describe('isolated QA config', () => {
  it('production config is always livemode=true and allowlisted', () => {
    expect(ghlConfig(() => 'true')).toEqual({ enabled: true, ...GHL_APPROVED, expectedLivemode: true });
  });
  it('QA config validates a test-mode invoice with the test price; production config rejects it', async () => {
    const qa = ghlQaConfig({ monthlyPriceId: 'price_1UOqHXAMsd1FtcvLmsqrfFoB', productId: GHL_APPROVED.productId, locationId: GHL_APPROVED.locationId });
    const f = fx();
    for (const o of [f.invoice, f.pi, f.sub]) o.livemode = false;
    f.invoice.lines.data[0].pricing.price_details.price = qa.monthlyPriceId; f.sub.items.data[0].price.id = qa.monthlyPriceId;
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, f.db, qa)).toBe('provisioned');
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, { rpc: vi.fn() }, cfg)).toBe('not_applicable');
    expect(() => ghlQaConfig({ monthlyPriceId: '', productId: 'p', locationId: 'l' })).toThrow();
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
