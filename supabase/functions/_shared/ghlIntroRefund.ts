/* eslint-disable @typescript-eslint/no-explicit-any */
// Approved $1.99 intro refund policy (native GHL memberships only):
// a verified FULL refund of the exact intro PaymentIntent stops future renewal
// (cancels ONLY the subscription bound to that membership row) and revokes that
// membership's access. Separately paid mentoring is keyed by its own
// PaymentIntent and is never touched here. Idempotent and replay-safe.
import { GHL_SOURCE, type GhlConfig } from './ghlInvoiceFulfillment.ts';

export type IntroRefundOutcome = 'not_applicable' | 'partial' | 'mismatch' | 'revoked' | 'already_revoked';
const INTRO_CENTS = 199;
const id = (v: any): string | null => (typeof v === 'string' ? v : v?.id ?? null);

export async function refundGhlIntro(piId: string | null, stripe: any, db: any, cfg: GhlConfig): Promise<IntroRefundOutcome> {
  if (!cfg.enabled || !piId) return 'not_applicable';
  const { data: row, error } = await db.from('vault_return_memberships')
    .select('stripe_subscription_id,stripe_customer_id,stripe_price_id,status,access_until')
    .eq('source', GHL_SOURCE).eq('stripe_payment_intent_id', piId).maybeSingle();
  if (error) throw new Error('membership lookup failed');
  if (!row) return 'not_applicable';

  // Canonical re-read: never trust the webhook payload's refund amounts.
  const pi = await stripe.paymentIntents.retrieve(piId, { expand: ['latest_charge'] });
  const charge = pi?.latest_charge;
  if (id(pi?.customer) !== row.stripe_customer_id || pi.livemode !== cfg.expectedLivemode || pi.amount_received !== INTRO_CENTS) return 'mismatch';
  if (!charge || typeof charge !== 'object' || charge.refunded !== true || charge.amount_refunded < INTRO_CENTS) return 'partial';

  const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
  const priceOk = sub?.items?.data?.length === 1 && sub.items.data[0]?.price?.id === cfg.monthlyPriceId;
  if (id(sub?.customer) !== row.stripe_customer_id || !priceOk || row.stripe_price_id !== cfg.monthlyPriceId) return 'mismatch';

  const alreadyCanceled = sub.status === 'canceled' || sub.status === 'incomplete_expired';
  if (!alreadyCanceled) {
    await stripe.subscriptions.cancel(sub.id, {}, { idempotencyKey: `vault-intro-refund-${piId}` });
  }
  const now = new Date().toISOString();
  const { data: updated, error: upErr } = await db.from('vault_return_memberships')
    .update({ status: 'canceled', access_until: now, updated_at: now })
    .eq('stripe_subscription_id', row.stripe_subscription_id).eq('stripe_payment_intent_id', piId)
    .neq('status', 'canceled').select('stripe_subscription_id');
  if (upErr) throw new Error('membership revoke failed');
  return alreadyCanceled && (!updated || updated.length === 0) ? 'already_revoked' : 'revoked';
}
