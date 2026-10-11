/* eslint-disable @typescript-eslint/no-explicit-any */
// $49 Private 2-Hour Trading Mentoring (native GHL one-time order, Stripe PaymentIntent, no invoice).
// An entitlement is recorded only when ALL canonical sources agree:
//   Stripe PaymentIntent (re-read)  — succeeded, 4900 USD received, livemode, not refunded/disputed
//   GHL order (Orders API)          — completed/paid, one line, allowlisted catalog product+price, 49 USD, our location
//   GHL transaction (Transactions)  — succeeded, chargeId == this PaymentIntent, entityId == this order
// The webhook payload is only used for routing. Missing/late GHL data = GhlMentoringPending (retry);
// present-but-wrong data = MentoringRejection (terminal, never granted).

export const MENTORING_APPROVED = {
  locationId: 'G56txqjwbZBWWHuZmfo7',
  ghlProductId: '6ac9a7c915dafb910f718050',
  ghlPriceId: '6ac9a7c915dafb910f718058',
  /** Live Stripe product GHL maps this catalog item to (test: prod_VPfh4JjoYgfXW1). Reference only: PIs carry no product. */
  stripeProductId: 'prod_VPfh2LqYPkPMap',
  calendlyEventTypeUri: 'https://api.calendly.com/event_types/51854345-3709-4485-ba8d-567c6419511a',
  calendlySchedulingUrl: 'https://calendly.com/rz_/vault-os-private-2-hour-trading-mentoring',
  durationMinutes: 120,
} as const;
export const MENTORING_CENTS = 4900;
const GHL = 'https://services.leadconnectorhq.com';

export type MentoringConfig = {
  enabled: boolean; locationId: string; ghlProductId: string; ghlPriceId: string;
  calendlyEventTypeUri: string; expectedLivemode: boolean;
};
export type MentoringOutcome = 'not_applicable' | 'recorded' | 'replayed' | 'rejected';

/** Production: fixed allowlist, livemode required. */
export function mentoringConfig(get: (k: string) => string | undefined): MentoringConfig {
  const { locationId, ghlProductId, ghlPriceId, calendlyEventTypeUri } = MENTORING_APPROVED;
  return { enabled: get('VAULT_MENTORING_ENABLED') === 'true', locationId, ghlProductId, ghlPriceId, calendlyEventTypeUri, expectedLivemode: true };
}
/** Isolated QA handler only (separate test-mode key/project). Never used by the production webhook. */
export function mentoringQaConfig(p: { locationId: string; ghlProductId: string; ghlPriceId: string; calendlyEventTypeUri: string }): MentoringConfig {
  if (!p.locationId || !p.ghlProductId || !p.ghlPriceId || !p.calendlyEventTypeUri) throw new Error('QA config incomplete');
  return { enabled: true, ...p, expectedLivemode: false };
}

export class MentoringRejection extends Error {}
export class MentoringPending extends Error {}
const reject = (r: string): never => { throw new MentoringRejection(r); };
const pending = (r: string): never => { throw new MentoringPending(`mentoring pending: ${r}`); };
const id = (v: any): string | null => (typeof v === 'string' ? v : v?.id ?? null);
const blank = (v: unknown) => v === undefined || v === null || v === '';

/** Routing only (unverified payload). The $1.99 intro and other charges never match 4900. */
export function isMentoringCandidate(pi: any, cfg: MentoringConfig): boolean {
  return cfg.enabled && pi?.object === 'payment_intent' && pi?.amount === MENTORING_CENTS && pi?.currency === 'usd'
    && (blank(pi?.metadata?.altId) || pi.metadata.altId === cfg.locationId);
}

export function validateMentoringPayment(p: { pi: any; order: any; transactions: any[]; cfg: MentoringConfig }) {
  const { pi, order, transactions, cfg } = p;
  // Stripe PaymentIntent
  if (pi.livemode !== cfg.expectedLivemode) reject('livemode mismatch');
  if (pi.status !== 'succeeded' || pi.amount !== MENTORING_CENTS || pi.amount_received !== MENTORING_CENTS || pi.currency !== 'usd') reject('payment not a settled $49 charge');
  const charge = typeof pi.latest_charge === 'object' ? pi.latest_charge : null;
  if (!charge) reject('charge not expanded');
  if (charge.paid !== true || charge.status !== 'succeeded' || charge.amount !== MENTORING_CENTS || charge.captured !== true) reject('charge not settled');
  if ((charge.amount_refunded ?? 0) !== 0 || charge.refunded === true || charge.disputed === true) reject('charge refunded or disputed');
  const customer = id(pi.customer) ?? reject('payment customer missing');
  const md = pi.metadata ?? {};
  if (!blank(md.altId) && md.altId !== cfg.locationId) reject('foreign GHL location');
  if (!blank(md.altType) && md.altType !== 'location') reject('unexpected GHL altType');
  if (blank(md.altId) || blank(md.altType) || blank(md.orderId)) pending('payment metadata not yet written');
  const orderId = String(md.orderId);

  // GHL order (canonical product proof)
  if (!order) pending('GHL order not yet visible');
  if (order._id !== orderId) reject('GHL order id mismatch');
  if (order.altId !== cfg.locationId || order.altType !== 'location') reject('GHL order location mismatch');
  if (order.liveMode !== cfg.expectedLivemode) reject('GHL order livemode mismatch');
  if (order.markAsTest === true && cfg.expectedLivemode) reject('GHL order marked test');
  if (order.paymentStatus !== 'paid' || order.status !== 'completed') pending('GHL order not yet completed');
  if (String(order.currency).toUpperCase() !== 'USD' || order.amount !== 49) reject('GHL order amount mismatch');
  const items = order.items ?? [];
  if (items.length !== 1) reject('GHL order line count mismatch');
  const it = items[0];
  if (id(it.product) !== cfg.ghlProductId || id(it.price) !== cfg.ghlPriceId) reject('GHL order product mismatch');
  if ((it.qty ?? 1) !== 1 || it.price?.amount !== 49 || it.price?.type !== 'one_time' || String(it.price?.currency).toUpperCase() !== 'USD') reject('GHL order line mismatch');
  if (!blank(md.contactId) && !blank(order.contactId) && md.contactId !== order.contactId) reject('GHL contact mismatch');

  // GHL transaction links this exact PaymentIntent to this order
  const tx = transactions.filter(t => t?.entityId === orderId && t?.chargeId === pi.id);
  if (tx.length === 0) pending('GHL transaction not yet visible');
  if (tx.length !== 1) reject('GHL transaction ambiguous');
  const t = tx[0];
  if (t.status !== 'succeeded' || t.amount !== 49 || String(t.currency).toLowerCase() !== 'usd' || t.liveMode !== cfg.expectedLivemode
    || t.altId !== cfg.locationId) reject('GHL transaction mismatch');
  if (transactions.some(o => o?.chargeId === pi.id && o?.entityId !== orderId)) reject('payment linked to another order');

  return { customer: customer as string, orderId, chargeId: charge.id as string, transactionId: String(t._id), contactId: (order.contactId ?? md.contactId ?? null) as string | null };
}

/** Read-only GHL lookups. 404 = not visible yet; 401/403/5xx throw (retry, never grant). */
export async function fetchGhlOrderProof(orderId: string, cfg: MentoringConfig, ghlKey: string, fetchFn: typeof fetch = fetch) {
  const h = { Authorization: `Bearer ${ghlKey}`, Version: '2021-07-28', Accept: 'application/json' };
  const q = `altId=${encodeURIComponent(cfg.locationId)}&altType=location`;
  const o = await fetchFn(`${GHL}/payments/orders/${encodeURIComponent(orderId)}?${q}`, { headers: h, signal: AbortSignal.timeout(10_000) });
  if (o.status === 404) return { order: null, transactions: [] };
  if (!o.ok) throw new Error(`GHL order lookup HTTP ${o.status}`);
  const order = await o.json();
  const t = await fetchFn(`${GHL}/payments/transactions?${q}&entityId=${encodeURIComponent(orderId)}&limit=20`, { headers: h, signal: AbortSignal.timeout(10_000) });
  if (!t.ok) throw new Error(`GHL transaction lookup HTTP ${t.status}`);
  const tj = await t.json();
  const transactions = tj?.data ?? [];
  if ((tj?.totalCount ?? transactions.length) > transactions.length) reject('GHL transaction list exceeds approved shape');
  return { order, transactions };
}

export async function fulfillMentoringPayment(eventPi: any, stripe: any, db: any, cfg: MentoringConfig, ghlKey: string,
  opts: { fetchFn?: typeof fetch; afterCommit?: () => Promise<unknown>; onReject?: (r: string) => void } = {}): Promise<MentoringOutcome> {
  if (!isMentoringCandidate(eventPi, cfg)) return 'not_applicable';
  if (!ghlKey) throw new Error('GHL key not configured');
  try {
    const pi = await stripe.paymentIntents.retrieve(eventPi.id, { expand: ['latest_charge'] });
    const orderId = pi?.metadata?.orderId;
    const proof = blank(orderId) ? { order: null, transactions: [] } : await fetchGhlOrderProof(String(orderId), cfg, ghlKey, opts.fetchFn);
    const v = validateMentoringPayment({ pi, order: proof.order, transactions: proof.transactions, cfg });
    const customer = await stripe.customers.retrieve(v.customer);
    if (customer?.deleted) reject('customer deleted');
    const email = String(customer?.email || '').trim().toLowerCase();
    if (!email) pending('customer email not yet set');
    const { data, error } = await db.rpc('record_vault_mentoring_payment', {
      p_payment_intent: pi.id, p_charge: v.chargeId, p_customer: v.customer, p_order: v.orderId, p_transaction: v.transactionId,
      p_contact: v.contactId ?? '', p_location: cfg.locationId, p_product: cfg.ghlProductId, p_price: cfg.ghlPriceId, p_email: email,
      p_amount: MENTORING_CENTS, p_currency: 'usd', p_livemode: pi.livemode, p_event_type: cfg.calendlyEventTypeUri,
    });
    if (error) throw new Error(`mentoring record failed: ${String(error.message ?? 'database error').slice(0, 120)}`);
    if (opts.afterCommit) { try { await opts.afterCommit(); } catch { /* worker retries */ } }
    return data === true ? 'recorded' : 'replayed';
  } catch (e) {
    if (e instanceof MentoringRejection) { opts.onReject?.(e.message); return 'rejected'; }
    throw e;
  }
}

/** Refund/dispute on a mentoring charge ends the entitlement. Membership refunds never touch this table. */
export async function reverseMentoringPayment(paymentIntentId: string | null, reason: 'refund' | 'dispute', db: any): Promise<boolean> {
  if (!paymentIntentId) return false;
  const { data, error } = await db.rpc('mark_vault_mentoring_refunded', { p_payment_intent: paymentIntentId, p_reason: reason });
  if (error) throw new Error('mentoring reversal failed');
  return data === true;
}
