// Unknown (unmapped) Stripe prices are NEVER mapped to a paid plan. The only
// thing an unknown price may do is reconcile the status of an EXISTING
// student_access row already bound to the same subscription, customer and
// Vault product. New users / unbound subscriptions get nothing.
/* eslint-disable @typescript-eslint/no-explicit-any */

export type AccessRow = { user_id: string; product_key: string; tier: string; status: string; stripe_subscription_id: string | null; stripe_customer_id: string | null };

const VAULT_PRODUCTS = ['vault_os', 'vault_academy'];

export function unknownPriceReconcileTarget(rows: AccessRow[], sub: { id: string; customer: string | { id: string } | null }): AccessRow | null {
  const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;
  if (!sub.id || !customer) return null;
  const matches = rows.filter((r) => r.stripe_subscription_id === sub.id && r.stripe_customer_id === customer && VAULT_PRODUCTS.includes(r.product_key));
  // Ambiguous bindings fail closed.
  return matches.length === 1 ? matches[0] : null;
}

/** Allowlist rows with a Stripe customer are admission only; only rows without one are complimentary grants. */
export function complimentaryAllowlistEmails(rows: Array<{ email: string | null; stripe_customer_id?: string | null }>): Set<string> {
  return new Set(rows.filter((r) => !r.stripe_customer_id).map((r) => (r.email || '').trim().toLowerCase()).filter(Boolean));
}

/**
 * Sweep may only apply a subscription's status to a row it is bound to: same
 * customer, and (when the row stores one) the same subscription id. Price is
 * never consulted, so legacy/unknown prices reconcile status but never grant.
 */
export function sweepSubscriptionBound(
  row: { stripe_subscription_id: string | null },
  customerId: string,
  sub: { id: string; customer: string | { id: string } | null } | null,
): boolean {
  if (!sub) return true; // no subscription at all -> canceled path
  const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;
  if (customer !== customerId) return false;
  return !row.stripe_subscription_id || row.stripe_subscription_id === sub.id;
}
