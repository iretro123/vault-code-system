/* eslint-disable @typescript-eslint/no-explicit-any */
// Native GHL $1.99 checkout: Stripe invoice flow (no Checkout Session).
// Provisions a paid-intro return membership ONLY from the verified initial
// invoice of an allowlisted subscription. Every check re-reads canonical
// Stripe objects; the webhook payload is only used for routing.
import { invoiceSubscriptionId } from './membershipValidation.ts';
import { subscriptionEnd } from './returnOffer.ts';

export const GHL_APPROVED = {
  monthlyPriceId: 'price_1UOqHXAMsd1FtcvLBM7QdEOz',
  productId: 'prod_V4WTjozZfH9H82',
  locationId: 'G56txqjwbZBWWHuZmfo7',
} as const;
export const GHL_SOURCE = 'ghl_native_invoice';
const TRIAL_SECONDS = 30 * 86400;
const TRIAL_TOLERANCE = 3600; // GHL-created trials may not land on an exact second

export type GhlConfig = { enabled: boolean; monthlyPriceId: string; productId: string; locationId: string };
export type GhlOutcome = 'not_applicable' | 'provisioned' | 'replayed' | 'rejected';

export function ghlConfig(get: (k: string) => string | undefined): GhlConfig {
  return { enabled: get('VAULT_GHL_CHECKOUT_ENABLED') === 'true', ...GHL_APPROVED };
}

const id = (v: any): string | null => (typeof v === 'string' ? v : v?.id ?? null);
const linePrice = (l: any): string | null => id(l?.pricing?.price_details?.price) ?? id(l?.price);
const lineProduct = (l: any): string | null => id(l?.pricing?.price_details?.product) ?? id(l?.price?.product);

/** Routing only (unverified payload): does this invoice reference the allowlisted price? */
export function referencesGhlPrice(invoice: any, cfg: GhlConfig): boolean {
  return (invoice?.lines?.data ?? []).some((l: any) => linePrice(l) === cfg.monthlyPriceId);
}

export class GhlRejection extends Error {}
const reject = (reason: string): never => { throw new GhlRejection(reason); };

/** Pure validation of canonical objects. Throws GhlRejection with a safe reason. */
export function validateGhlInitialPayment(p: { invoice: any; lines: any[]; payments: any[]; pi: any; sub: any; cfg: GhlConfig }) {
  const { invoice: inv, lines, payments, pi, sub, cfg } = p;
  if (inv.livemode !== true) reject('non-live invoice');
  if (inv.billing_reason !== 'subscription_create') reject('not the initial subscription invoice');
  if (inv.status !== 'paid') reject('invoice not paid');
  if (inv.paid_out_of_band === true) reject('paid out of band');
  if (inv.currency !== 'usd' || inv.total !== 199 || inv.amount_due !== 199 || inv.amount_paid !== 199 || inv.amount_remaining !== 0) reject('invoice amount mismatch');
  if ((inv.starting_balance ?? 0) !== 0) reject('customer credit applied');
  const customer = id(inv.customer);
  if (!customer) reject('invoice customer missing');
  if (invoiceSubscriptionId(inv) !== sub.id) reject('invoice not tied to subscription');

  // Lines: exactly one $0 trial line for the approved monthly price; remaining one-time lines total $1.99.
  const recurring = lines.filter(l => linePrice(l) === cfg.monthlyPriceId);
  if (recurring.length !== 1 || recurring[0].quantity !== 1 || recurring[0].amount !== 0) reject('trial line mismatch');
  if (lineProduct(recurring[0]) && lineProduct(recurring[0]) !== cfg.productId) reject('product mismatch');
  const others = lines.filter(l => l !== recurring[0]);
  if (others.some(l => l.quantity !== 1 || l.currency !== 'usd' || (l.parent?.type === 'subscription_item_details'))) reject('unexpected invoice line');
  if (others.reduce((s, l) => s + (l.amount ?? 0), 0) !== 199) reject('setup fee mismatch');

  // Payment: exactly one settled PaymentIntent payment of $1.99 — no out-of-band or credit-only settlement.
  const paid = payments.filter(x => x.status === 'paid');
  if (paid.length !== 1 || paid[0].payment?.type !== 'payment_intent' || paid[0].amount_paid !== 199 || paid[0].currency !== 'usd') reject('invoice payment linkage mismatch');
  if (id(paid[0].payment.payment_intent) !== pi.id) reject('payment intent mismatch');
  if (pi.livemode !== true || pi.status !== 'succeeded' || pi.amount_received !== 199 || pi.currency !== 'usd' || id(pi.customer) !== customer) reject('payment intent not a settled $1.99 charge');
  if (pi.metadata?.altType !== 'location' || pi.metadata?.altId !== cfg.locationId) reject('foreign GHL location');

  // Subscription: one $99/month item, qty 1, 30-day trial, currently usable.
  if (id(sub.customer) !== customer) reject('subscription customer mismatch');
  const items = sub.items?.data ?? [];
  const item = items[0];
  if (items.length !== 1 || item.quantity !== 1 || item.price?.id !== cfg.monthlyPriceId || id(item.price?.product) !== cfg.productId
    || item.price?.unit_amount !== 9900 || item.price?.currency !== 'usd' || item.price?.recurring?.interval !== 'month' || item.price?.recurring?.interval_count !== 1) reject('subscription item mismatch');
  if (!sub.trial_start || !sub.trial_end || Math.abs(sub.trial_end - sub.trial_start - TRIAL_SECONDS) > TRIAL_TOLERANCE) reject('trial length mismatch');
  if (!['trialing', 'active'].includes(sub.status)) reject(`subscription ${sub.status}`);
  const end = subscriptionEnd(sub);
  if (!end || end * 1000 <= Date.now()) reject('subscription expiry missing');
  return { customer: customer as string, end: end as number, orderId: String(pi.metadata?.orderId ?? '') };
}

/**
 * Returns 'not_applicable' (flag off, other price, or not an initial invoice) so the
 * existing handlers run unchanged. 'rejected' = ours but invalid: never granted.
 * Transient Stripe/DB errors throw so Stripe retries.
 */
export async function fulfillGhlInvoice(eventInvoice: any, stripe: any, db: any, cfg: GhlConfig,
  afterCommit?: (subscriptionId: string) => Promise<unknown>, onReject?: (reason: string) => void): Promise<GhlOutcome> {
  if (!cfg.enabled || !eventInvoice?.id || !referencesGhlPrice(eventInvoice, cfg)) return 'not_applicable';
  const invoice = await stripe.invoices.retrieve(eventInvoice.id);
  if (invoice.billing_reason !== 'subscription_create') return 'not_applicable'; // renewals sync via subscription path
  try {
    const subId = invoiceSubscriptionId(invoice) ?? reject('subscription missing');
    const [sub, lines, payments] = await Promise.all([
      stripe.subscriptions.retrieve(subId),
      stripe.invoices.listLineItems(invoice.id, { limit: 100 }).then((r: any) => r.data),
      stripe.invoicePayments.list({ invoice: invoice.id, limit: 10 }).then((r: any) => r.data),
    ]);
    const piId = id(payments.find((x: any) => x.status === 'paid')?.payment?.payment_intent) ?? reject('payment intent missing');
    const pi = await stripe.paymentIntents.retrieve(piId);
    const v = validateGhlInitialPayment({ invoice, lines, payments, pi, sub, cfg });
    const customer = await stripe.customers.retrieve(v.customer);
    const email = String((customer?.deleted ? '' : customer?.email) || invoice.customer_email || '').trim().toLowerCase();
    if (!email) reject('billing email missing');
    const { data, error } = await db.rpc('record_vault_ghl_invoice_payment', {
      p_subscription: sub.id, p_invoice: invoice.id, p_payment_intent: pi.id, p_customer: v.customer, p_email: email,
      p_status: sub.status, p_end: new Date(v.end * 1000).toISOString(), p_price: cfg.monthlyPriceId, p_location: cfg.locationId, p_order: v.orderId,
    });
    if (error) throw error;
    if (afterCommit) { try { await afterCommit(sub.id); } catch { /* outbox worker retries */ } }
    return data === true ? 'provisioned' : 'replayed';
  } catch (e) {
    if (e instanceof GhlRejection) { onReject?.(e.message); return 'rejected'; }
    throw e;
  }
}
