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
