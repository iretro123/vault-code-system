import { describe, expect, it, vi } from 'vitest';
import { fulfillGhlInvoice, ghlConfig, ghlQaConfig, GhlPending, GHL_APPROVED } from '../../supabase/functions/_shared/ghlInvoiceFulfillment';

const cfg = { ...GHL_APPROVED, enabled: true, expectedLivemode: true };
const D = GHL_APPROVED.directPriceId;
const now = Math.floor(Date.now() / 1000);

function fx() {
  const start = now - 60, end = start + 30 * 86400;
  const md = { altId: GHL_APPROVED.locationId, altType: 'location', orderId: 'ord_9' };
  const line: any = { quantity: 1, amount: 9900, currency: 'usd', period: { start, end }, pricing: { type: 'price_details', price_details: { price: D, product: GHL_APPROVED.productId } }, parent: { type: 'subscription_item_details', subscription_item_details: { subscription: 'sub_9', subscription_item: 'si_9' } } };
  const invoice: any = { id: 'in_9', livemode: true, billing_reason: 'subscription_create', status: 'paid', currency: 'usd', subtotal: 9900, total: 9900, amount_due: 9900, amount_paid: 9900, amount_remaining: 0, starting_balance: 0, ending_balance: 0, customer: 'cus_9', metadata: { ...md }, parent: { subscription_details: { subscription: 'sub_9' } }, lines: { data: [line], has_more: false } };
  const payments: any[] = [{ status: 'paid', amount_paid: 9900, currency: 'usd', payment: { type: 'payment_intent', payment_intent: 'pi_9' } }];
  const charge: any = { id: 'ch_9', livemode: true, payment_intent: 'pi_9', paid: true, status: 'succeeded', captured: true, amount_captured: 9900, amount_refunded: 0, refunded: false, disputed: false, payment_method_details: { type: 'card' } };
  const pi: any = { id: 'pi_9', livemode: true, status: 'succeeded', amount: 9900, amount_received: 9900, currency: 'usd', customer: 'cus_9', metadata: { ...md }, latest_charge: charge };
  const sub: any = { id: 'sub_9', livemode: true, customer: 'cus_9', status: 'active', trial_start: null, trial_end: null, metadata: { ...md }, items: { has_more: false, data: [{ quantity: 1, current_period_start: start, current_period_end: end, price: { id: D, type: 'recurring', product: GHL_APPROVED.productId, unit_amount: 9900, currency: 'usd', recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed', trial_period_days: null } } }] } };
  const stripe = {
    invoices: { retrieve: vi.fn(async () => invoice), listLineItems: vi.fn(async () => ({ data: invoice.lines.data, has_more: false })) },
    invoicePayments: { list: vi.fn(async () => ({ data: payments, has_more: false })) },
    paymentIntents: { retrieve: vi.fn(async () => pi) },
    subscriptions: { retrieve: vi.fn(async () => sub) },
    customers: { retrieve: vi.fn(async () => ({ email: ' Buyer99@Example.com' })) },
  };
  const db = { rpc: vi.fn(async () => ({ data: true, error: null } as any)) };
  return { invoice, line, payments, pi, charge, sub, stripe, db, end };
}

describe('GHL native $99-from-day-one invoice', () => {
  it('production config carries the exact live direct price', () => {
    expect(ghlConfig(() => 'true').directPriceId).toBe('price_1UR1DwAMsd1FtcvL2q3fUjQE');
    expect(ghlConfig(() => 'true').monthlyPriceId).toBe('price_1UOqHXAMsd1FtcvLBM7QdEOz');
  });

  it('valid $99 initial invoice records direct proof, re-reads card charge, and triggers welcome', async () => {
    const f = fx(); const after = vi.fn();
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg, after)).toBe('provisioned');
    expect(f.stripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_9', { expand: ['latest_charge'] });
    expect(f.db.rpc).toHaveBeenCalledWith('record_vault_ghl_direct_invoice_payment', {
      p_subscription: 'sub_9', p_invoice: 'in_9', p_payment_intent: 'pi_9', p_customer: 'cus_9', p_email: 'buyer99@example.com',
      p_status: 'active', p_end: new Date(f.end * 1000).toISOString(), p_price: D, p_location: GHL_APPROVED.locationId, p_order: 'ord_9',
    });
    expect(after).toHaveBeenCalledWith('sub_9');
  });

  it('flag off: untouched', async () => {
    const f = fx();
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, f.db, { ...cfg, enabled: false })).toBe('not_applicable');
    expect(f.stripe.invoices.retrieve).not.toHaveBeenCalled();
  });

  it('renewal invoices are not fulfilled here', async () => {
    const f = fx(); f.invoice.billing_reason = 'subscription_cycle';
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg)).toBe('not_applicable');
    expect(f.db.rpc).not.toHaveBeenCalled();
  });

  it('unknown price is not routed', async () => {
    const f = fx(); f.line.pricing.price_details.price = 'price_other';
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg)).toBe('not_applicable');
  });

  const bad: [string, (f: ReturnType<typeof fx>) => void][] = [
    ['$1.99 amount on direct price', f => { Object.assign(f.invoice, { subtotal: 199, total: 199, amount_due: 199, amount_paid: 199 }); }],
    ['wrong line amount', f => { f.line.amount = 9800; }],
    ['wrong subscription price', f => { f.sub.items.data[0].price.id = 'price_other'; }],
    ['wrong unit amount', f => { f.sub.items.data[0].price.unit_amount = 7000; }],
    ['wrong product', f => { f.line.pricing.price_details.product = 'prod_x'; }],
    ['test mode invoice', f => { f.invoice.livemode = false; }],
    ['test mode charge', f => { f.charge.livemode = false; }],
    ['trial on subscription', f => { f.sub.trial_start = now - 60; f.sub.trial_end = now + 86400; }],
    ['trialing status', f => { f.sub.status = 'trialing'; }],
    ['price trial days', f => { f.sub.items.data[0].price.recurring.trial_period_days = 7; }],
    ['foreign GHL location', f => { f.pi.metadata.altId = 'loc_other'; }],
    ['setup fee line added', f => { f.invoice.lines.data.push({ quantity: 1, amount: 199, currency: 'usd', parent: { type: 'invoice_item_details' } }); }],
    ['mixed with intro price line', f => { f.invoice.lines.data.push({ ...f.line, amount: 0, pricing: { price_details: { price: GHL_APPROVED.monthlyPriceId, product: GHL_APPROVED.productId } } }); }],
    ['non-card charge', f => { f.charge.payment_method_details.type = 'customer_balance'; }],
    ['refunded charge', f => { f.charge.amount_refunded = 9900; f.charge.refunded = true; }],
    ['uncaptured charge', f => { f.charge.captured = false; }],
    ['charge from another PI', f => { f.charge.payment_intent = 'pi_other'; }],
    ['paid out of band', f => { f.invoice.paid_out_of_band = true; }],
    ['credit balance applied', f => { f.invoice.starting_balance = -9900; }],
    ['discount', f => { f.invoice.total_discount_amounts = [{ amount: 100 }]; }],
    ['subscription customer mismatch', f => { f.sub.customer = 'cus_other'; }],
    ['line period mismatch', f => { f.line.period.start -= 3600; }],
  ];
  it.each(bad)('rejects %s without recording', async (_n, mut) => {
    const f = fx(); mut(f); const after = vi.fn(); const onReject = vi.fn();
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg, after, onReject)).toBe('rejected');
    expect(f.db.rpc).not.toHaveBeenCalled(); expect(after).not.toHaveBeenCalled(); expect(onReject).toHaveBeenCalled();
  });

  it('missing GHL metadata is retryable, then fulfills once written', async () => {
    const f = fx(); f.pi.metadata = {};
    await expect(fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg)).rejects.toBeInstanceOf(GhlPending);
    f.pi.metadata = { altId: GHL_APPROVED.locationId, altType: 'location', orderId: 'ord_9' };
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg)).toBe('provisioned');
  });

  it('duplicate delivery replays; transient DB errors propagate (no 200)', async () => {
    const f = fx(); f.db.rpc.mockResolvedValueOnce({ data: false, error: null });
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg)).toBe('replayed');
    f.db.rpc.mockResolvedValueOnce({ data: null, error: { message: 'db down' } });
    await expect(fulfillGhlInvoice(f.invoice, f.stripe, f.db, cfg)).rejects.toThrow('db down');
  });

  it('isolated QA config accepts only its explicit test direct price, test mode', async () => {
    const qa = ghlQaConfig({ monthlyPriceId: 'price_1UOqHXAMsd1FtcvLmsqrfFoB', productId: 'prod_VPfbMOTfCWfgOw', locationId: GHL_APPROVED.locationId, directPriceId: 'price_1UR1DxAMsd1FtcvLL6wrcyeg' });
    const f = fx();
    for (const o of [f.invoice, f.pi, f.sub, f.charge]) o.livemode = false;
    f.line.pricing.price_details = { price: qa.directPriceId, product: qa.productId };
    Object.assign(f.sub.items.data[0].price, { id: qa.directPriceId, product: qa.productId });
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, f.db, qa)).toBe('provisioned');
    // Production (live-only) never accepts the same test objects.
    expect(await fulfillGhlInvoice(f.invoice, f.stripe, { rpc: vi.fn() }, cfg)).toBe('not_applicable');
    expect(() => ghlQaConfig({ monthlyPriceId: 'a', productId: 'p', locationId: 'l', directPriceId: 'a' })).toThrow();
  });
});
