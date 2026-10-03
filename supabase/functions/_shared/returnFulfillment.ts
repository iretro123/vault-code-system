import { validReturnCheckout, subscriptionEnd, type ReturnConfig } from './returnOffer.ts';

/**
 * `afterCommit` runs only after record_vault_return_payment committed the
 * membership + outbox row. Its failures are swallowed: the payment stays
 * acknowledged and the outbox row stays pending for the worker.
 */
export async function fulfillReturnCheckout(session: any, stripe: any, db: any, config: ReturnConfig, afterCommit?: (subscriptionId: string) => Promise<unknown>): Promise<boolean> {
  const link = typeof session.payment_link === 'string' ? session.payment_link : session.payment_link?.id;
  const configuredLink = config.paymentLinkId;
  if (!configuredLink || link !== configuredLink) return false;
  // Let Stripe retry pending/failed deliveries; do not enqueue onboarding for unpaid checkout.
  if (session.payment_status !== 'paid') return true;
  const lines = (await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 })).data;
  if (!validReturnCheckout(session, lines, config)) throw new Error('Return offer payment does not match approved pricing');
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  if (!subscriptionId) throw new Error('Return subscription missing');
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  if ((typeof sub.customer === 'string' ? sub.customer : sub.customer?.id) !== customerId) throw new Error('Subscription customer mismatch');
  if (!['trialing','active'].includes(sub.status) || !sub.trial_start || sub.trial_end - sub.trial_start !== 30 * 86400
    || sub.items.data.length !== 1 || sub.items.data[0].price.id !== config.monthlyPriceId) {
    throw new Error('Return subscription terms mismatch');
  }
  const email = (session.customer_details?.email || session.customer_email || '').trim().toLowerCase();
  if (!email || !customerId) throw new Error('Return billing identity missing');
  const end = subscriptionEnd(sub);
  if (!end) throw new Error('Return subscription expiry missing');
  const { error } = await db.rpc('record_vault_return_payment', {
    p_subscription: sub.id, p_checkout: session.id, p_customer: customerId, p_email: email,
    p_status: sub.status, p_end: new Date(end * 1000).toISOString(),
  });
  if (error) throw error;
  if (afterCommit) { try { await afterCommit(sub.id); } catch { /* worker retries */ } }
  return true;
}

export async function syncReturnSubscription(sub: any, db: any): Promise<void> {
  // Only subscriptions with an independently verified $1.99 checkout can use this path.
  const end = subscriptionEnd(sub);
  const row: any = { status: sub.status, updated_at: new Date().toISOString() };
  if (end) row.access_until = new Date(end * 1000).toISOString();
  const { error } = await db.from('vault_return_memberships').update(row).eq('stripe_subscription_id', sub.id);
  if (error) throw error;
}
