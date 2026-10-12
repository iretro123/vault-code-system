import { describe, expect, it, vi } from 'vitest';
import { refundGhlIntro } from '../../supabase/functions/_shared/ghlIntroRefund';
import { GHL_APPROVED } from '../../supabase/functions/_shared/ghlInvoiceFulfillment';

const cfg = { ...GHL_APPROVED, enabled: true, expectedLivemode: true };

function fx(o: { refunded?: number; full?: boolean; subStatus?: string; row?: boolean; rowStatus?: string; subCustomer?: string; price?: string } = {}) {
  const row = o.row === false ? null : { stripe_subscription_id: 'sub_1', stripe_customer_id: 'cus_1', stripe_price_id: GHL_APPROVED.monthlyPriceId, status: o.rowStatus ?? 'trialing' };
  const updates: any[] = [];
  const chain: any = {};
  let mode = 'select';
  Object.assign(chain, {
    select: vi.fn(() => chain), eq: vi.fn(() => chain), neq: vi.fn(() => chain),
    update: vi.fn((v: any) => { mode = 'update'; updates.push(v); return chain; }),
    maybeSingle: vi.fn(async () => ({ data: row, error: null })),
    then: (r: any) => r({ data: mode === 'update' && row && row.status !== 'canceled' ? [{}] : [], error: null }),
  });
  const db = { from: vi.fn(() => { mode = 'select'; return chain; }) };
  const sub: any = { id: 'sub_1', customer: o.subCustomer ?? 'cus_1', status: o.subStatus ?? 'trialing', items: { data: [{ price: { id: o.price ?? GHL_APPROVED.monthlyPriceId } }] } };
  const stripe = {
    paymentIntents: { retrieve: vi.fn(async () => ({ id: 'pi_1', livemode: true, customer: 'cus_1', amount_received: 199, latest_charge: { refunded: o.full ?? true, amount_refunded: o.refunded ?? 199 } })) },
    subscriptions: { retrieve: vi.fn(async () => sub), cancel: vi.fn(async () => ({ ...sub, status: 'canceled' })) },
  };
  return { db, stripe, updates };
}

describe('GHL $1.99 intro refund policy', () => {
  it('full refund cancels only the bound subscription and revokes access', async () => {
    const f = fx();
    expect(await refundGhlIntro('pi_1', f.stripe, f.db, cfg)).toBe('revoked');
    expect(f.stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_1', {}, { idempotencyKey: 'vault-intro-refund-pi_1' });
    expect(f.updates[0].status).toBe('canceled');
  });
  it('partial refund changes nothing', async () => {
    const f = fx({ refunded: 100, full: false });
    expect(await refundGhlIntro('pi_1', f.stripe, f.db, cfg)).toBe('partial');
    expect(f.stripe.subscriptions.cancel).not.toHaveBeenCalled();
  });
  it('unrelated PaymentIntent (e.g. $49 mentoring) is not applicable', async () => {
    const f = fx({ row: false });
    expect(await refundGhlIntro('pi_49', f.stripe, f.db, cfg)).toBe('not_applicable');
    expect(f.stripe.paymentIntents.retrieve).not.toHaveBeenCalled();
  });
  it('replay after cancellation does not cancel again', async () => {
    const f = fx({ subStatus: 'canceled', rowStatus: 'canceled' });
    expect(await refundGhlIntro('pi_1', f.stripe, f.db, cfg)).toBe('already_revoked');
    expect(f.stripe.subscriptions.cancel).not.toHaveBeenCalled();
  });
  it('customer or price mismatch never cancels', async () => {
    for (const o of [{ subCustomer: 'cus_x' }, { price: 'price_other' }]) {
      const f = fx(o);
      expect(await refundGhlIntro('pi_1', f.stripe, f.db, cfg)).toBe('mismatch');
      expect(f.stripe.subscriptions.cancel).not.toHaveBeenCalled();
    }
  });
  it('flag off is inert', async () => {
    const f = fx();
    expect(await refundGhlIntro('pi_1', f.stripe, f.db, { ...cfg, enabled: false })).toBe('not_applicable');
  });
});
