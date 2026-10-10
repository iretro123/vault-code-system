/* eslint-disable @typescript-eslint/no-explicit-any */
// Native GHL $1.99 checkout: Stripe invoice flow (no Checkout Session).
// Provisions a paid-intro return membership ONLY from the verified initial
// invoice of an allowlisted subscription. Every check re-reads canonical
// Stripe objects; the webhook payload is only used for routing.
//
// Outcomes:
//  - GhlRejection  (terminal): definitively wrong (foreign location, wrong amount…). Never granted.
//  - GhlPending    (retryable): GHL writes metadata seconds AFTER invoice.paid, and email/payment
//    linkage can lag. Thrown to the webhook so the event is marked failed and Stripe redelivers.
import { invoiceSubscriptionId } from './membershipValidation.ts';

export const GHL_APPROVED = {
  monthlyPriceId: 'price_1UOqHXAMsd1FtcvLBM7QdEOz',
  productId: 'prod_V4WTjozZfH9H82',
  locationId: 'G56txqjwbZBWWHuZmfo7',
} as const;
export const GHL_SOURCE = 'ghl_native_invoice';
export const TRIAL_SECONDS = 30 * 86400;
/** Stripe computes trial_end = trial_start + N days exactly; allow only clock-rounding slack. */
export const TRIAL_TOLERANCE_SECONDS = 5;
const INTRO_CENTS = 199;
const MONTHLY_CENTS = 9900;

export type GhlConfig = {
  enabled: boolean; monthlyPriceId: string; productId: string; locationId: string;
  /** Production is always true. Only an isolated QA handler may pass false explicitly. */
  expectedLivemode: boolean;
};
export type GhlOutcome = 'not_applicable' | 'provisioned' | 'replayed' | 'rejected';

/** Production config: fixed allowlist, fixed livemode=true. */
export function ghlConfig(get: (k: string) => string | undefined): GhlConfig {
  return { enabled: get('VAULT_GHL_CHECKOUT_ENABLED') === 'true', ...GHL_APPROVED, expectedLivemode: true };
}
/** Isolated QA only (separate test-mode handler + key). Never used by the production webhook. */
export function ghlQaConfig(p: { monthlyPriceId: string; productId: string; locationId: string }): GhlConfig {
  if (!p.monthlyPriceId || !p.productId || !p.locationId) throw new Error('QA config incomplete');
  return { enabled: true, ...p, expectedLivemode: false };
}

export class GhlRejection extends Error {}
export class GhlPending extends Error {}
const reject = (reason: string): never => { throw new GhlRejection(reason); };
const pending = (reason: string): never => { throw new GhlPending(`GHL fulfillment pending: ${reason}`); };

const id = (v: any): string | null => (typeof v === 'string' ? v : v?.id ?? null);
// Basil (2025-03-31+) line shape: pricing.price_details.{price,product}; older: price.{id,product}.
const linePrice = (l: any): string | null => id(l?.pricing?.price_details?.price) ?? id(l?.price);
const lineProduct = (l: any): string | null => id(l?.pricing?.price_details?.product) ?? id(l?.price?.product);
const lineSubscription = (l: any): string | null => id(l?.parent?.subscription_item_details?.subscription) ?? id(l?.subscription);
const blank = (v: unknown) => v === undefined || v === null || v === '';

/** Routing only (unverified payload): does this invoice reference the allowlisted price? */
export function referencesGhlPrice(invoice: any, cfg: GhlConfig): boolean {
  return (invoice?.lines?.data ?? []).some((l: any) => linePrice(l) === cfg.monthlyPriceId);
}

/** GHL metadata on one object: empty = pending (written after paid); present-but-wrong = reject. */
function checkGhlMetadata(md: any, cfg: GhlConfig, label: string, required: boolean): string | null {
  const altId = md?.altId, altType = md?.altType, orderId = md?.orderId;
  if (!blank(altId) && altId !== cfg.locationId) reject(`foreign GHL location on ${label}`);
  if (!blank(altType) && altType !== 'location') reject(`unexpected GHL altType on ${label}`);
  if (required && (blank(altId) || blank(altType) || blank(orderId))) pending(`${label} metadata not yet written`);
  return blank(orderId) ? null : String(orderId);
}

/** Pure validation of canonical objects. Throws GhlRejection or GhlPending with a safe reason. */
export function validateGhlInitialPayment(p: { invoice: any; lines: any[]; payments: any[]; pi: any; sub: any; cfg: GhlConfig; nowMs?: number }) {
  const { invoice: inv, lines, payments, pi, sub, cfg } = p;
  const nowS = Math.floor((p.nowMs ?? Date.now()) / 1000);
  if (inv.livemode !== cfg.expectedLivemode || pi.livemode !== cfg.expectedLivemode || sub.livemode !== cfg.expectedLivemode) reject('livemode mismatch');
  if (inv.billing_reason !== 'subscription_create') reject('not the initial subscription invoice');
  if (inv.status !== 'paid') reject('invoice not paid');
  if (inv.paid_out_of_band === true) reject('paid out of band');
  if (inv.currency !== 'usd' || inv.subtotal !== INTRO_CENTS || inv.total !== INTRO_CENTS || inv.amount_due !== INTRO_CENTS
    || inv.amount_paid !== INTRO_CENTS || inv.amount_remaining !== 0) reject('invoice amount mismatch');
  // Customer balance / credit notes must not have settled any part of the invoice.
  if ((inv.starting_balance ?? 0) !== 0 || (inv.ending_balance ?? 0) !== 0) reject('customer balance applied');
  if ((inv.pre_payment_credit_notes_amount ?? 0) !== 0 || (inv.post_payment_credit_notes_amount ?? 0) !== 0) reject('credit note applied');
  if ((inv.total_discount_amounts ?? []).some((d: any) => (d?.amount ?? 0) !== 0)) reject('discount applied');
  const customer = id(inv.customer) ?? reject('invoice customer missing');
  if (invoiceSubscriptionId(inv) !== sub.id) reject('invoice not tied to subscription');

  // Lines: exactly two — one $0 trial line for the approved price, one $1.99 one-time setup fee.
  if (lines.length !== 2) reject('unexpected invoice line count');
  const recurring = lines.filter(l => l?.parent?.type === 'subscription_item_details' || linePrice(l) === cfg.monthlyPriceId);
  if (recurring.length !== 1) reject('trial line mismatch');
  const r = recurring[0];
  if (linePrice(r) !== cfg.monthlyPriceId || lineProduct(r) !== cfg.productId || lineSubscription(r) !== sub.id
    || r.parent?.type !== 'subscription_item_details' || r.quantity !== 1 || r.amount !== 0 || r.currency !== 'usd') reject('trial line mismatch');
  if (r.period?.start !== sub.trial_start || r.period?.end !== sub.trial_end) reject('trial line period mismatch');
  const setup = lines.find(l => l !== r);
  if (setup.parent?.type !== 'invoice_item_details' || setup.quantity !== 1 || setup.amount !== INTRO_CENTS || setup.currency !== 'usd'
    || linePrice(setup) === cfg.monthlyPriceId) reject('setup fee mismatch');

  // Payment: exactly one settled PaymentIntent payment of $1.99.
  const paid = payments.filter(x => x?.status === 'paid');
  if (paid.length === 0) pending('invoice payment linkage not yet visible');
  if (paid.length !== 1 || paid[0].payment?.type !== 'payment_intent' || paid[0].amount_paid !== INTRO_CENTS || paid[0].currency !== 'usd') reject('invoice payment linkage mismatch');
  if (id(paid[0].payment.payment_intent) !== pi.id) reject('payment intent mismatch');
  if (pi.status !== 'succeeded' || pi.amount !== INTRO_CENTS || pi.amount_received !== INTRO_CENTS || pi.currency !== 'usd' || id(pi.customer) !== customer) reject('payment intent not a settled $1.99 charge');

  // Subscription: one $99/month item, qty 1, exact 30-day trial, future access.
  if (id(sub.customer) !== customer) reject('subscription customer mismatch');
  const items = sub.items?.data ?? [];
  const item = items[0];
  if (sub.items?.has_more || items.length !== 1 || item.quantity !== 1 || item.price?.id !== cfg.monthlyPriceId || id(item.price?.product) !== cfg.productId
    || item.price?.unit_amount !== MONTHLY_CENTS || item.price?.currency !== 'usd' || item.price?.type !== 'recurring'
    || item.price?.recurring?.interval !== 'month' || item.price?.recurring?.interval_count !== 1 || item.price?.recurring?.usage_type !== 'licensed') reject('subscription item mismatch');
  if (!Number.isInteger(sub.trial_start) || !Number.isInteger(sub.trial_end)
    || Math.abs(sub.trial_end - sub.trial_start - TRIAL_SECONDS) > TRIAL_TOLERANCE_SECONDS) reject('trial length mismatch');
  if (!['trialing', 'active'].includes(sub.status)) reject(`subscription ${sub.status}`);
  const end = sub.status === 'trialing' ? sub.trial_end : (item.current_period_end ?? sub.current_period_end);
  if (!Number.isInteger(end) || end <= nowS) reject('no future access period');

  // GHL metadata: the PaymentIntent must carry it; invoice/subscription copies must agree when present.
  const order = checkGhlMetadata(pi.metadata, cfg, 'payment', true);
  for (const [md, label] of [[inv.metadata, 'invoice'], [sub.metadata, 'subscription']] as const) {
    const o = checkGhlMetadata(md, cfg, label, false);
    if (o && o !== order) reject(`GHL order mismatch on ${label}`);
  }
  return { customer: customer as string, end: end as number, orderId: order as string };
}

async function listAll(page: Promise<any>, label: string): Promise<any[]> {
  const r = await page;
  // Never validate a partial list: the approved shape has 2 lines / 1 payment.
  if (r?.has_more) reject(`${label} list exceeds approved shape`);
  return r?.data ?? [];
}

/**
 * 'not_applicable': flag off, other price, or not an initial invoice — existing handlers run unchanged.
 * 'rejected': ours but definitively invalid — never granted, event may be marked processed.
 * Throws (GhlPending or transient errors) so the webhook returns 500 and Stripe redelivers.
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
      listAll(stripe.invoices.listLineItems(invoice.id, { limit: 100 }), 'invoice line'),
      listAll(stripe.invoicePayments.list({ invoice: invoice.id, limit: 100 }), 'invoice payment'),
    ]);
    const settled = payments.filter((x: any) => x?.status === 'paid');
    if (settled.length === 0) pending('invoice payment linkage not yet visible');
    if (settled.length !== 1 || settled[0].payment?.type !== 'payment_intent') reject('invoice payment linkage mismatch');
    const piId = id(settled[0].payment.payment_intent) ?? reject('payment intent missing');
    const pi = await stripe.paymentIntents.retrieve(piId);
    const v = validateGhlInitialPayment({ invoice, lines, payments, pi, sub, cfg });
    const customer = await stripe.customers.retrieve(v.customer);
    if (customer?.deleted) reject('customer deleted');
    const email = String(customer?.email || '').trim().toLowerCase();
    if (!email) pending('customer email not yet set');
    const { data, error } = await db.rpc('record_vault_ghl_invoice_payment', {
      p_subscription: sub.id, p_invoice: invoice.id, p_payment_intent: pi.id, p_customer: v.customer, p_email: email,
      p_status: sub.status, p_end: new Date(v.end * 1000).toISOString(), p_price: cfg.monthlyPriceId, p_location: cfg.locationId, p_order: v.orderId,
    });
    if (error) throw new Error(`GHL membership record failed: ${String(error.message ?? 'database error').slice(0, 120)}`);
    if (afterCommit) { try { await afterCommit(sub.id); } catch { /* outbox worker retries */ } }
    return data === true ? 'provisioned' : 'replayed';
  } catch (e) {
    if (e instanceof GhlRejection) { onReject?.(e.message); return 'rejected'; }
    throw e;
  }
}
