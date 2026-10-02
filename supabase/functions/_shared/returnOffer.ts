// A paid introduction is not a free trial. All checks fail closed.
export const RETURN_CAMPAIGN = 'vault_return_199_30d';
export type ReturnConfig = { paymentLinkId: string; monthlyPriceId: string; introPriceId: string };
export function validReturnCheckout(s: any, lines: any[], config: ReturnConfig): boolean {
  if (!config.paymentLinkId || !config.monthlyPriceId || !config.introPriceId) return false;
  const link = typeof s.payment_link === 'string' ? s.payment_link : s.payment_link?.id;
  const monthly = lines.find(l => l.price?.id === config.monthlyPriceId);
  const intro = lines.find(l => l.price?.id === config.introPriceId);
  return link === config.paymentLinkId && s.mode === 'subscription' && s.payment_status === 'paid'
    && s.currency === 'usd' && s.amount_total === 199 && lines.length === 2
    && monthly?.quantity === 1 && intro?.quantity === 1
    && monthly.price.unit_amount === 9900 && monthly.price.currency === 'usd'
    && monthly.price.recurring?.interval === 'month' && monthly.price.recurring?.interval_count === 1
    && intro.price.unit_amount === 199 && intro.price.currency === 'usd' && !intro.price.recurring;
}
export function returnAccessValid(r: any, now = Date.now()): boolean {
  return !!r?.paid_at && ['active', 'trialing'].includes(r.status)
    && Number.isFinite(Date.parse(r.access_until)) && Date.parse(r.access_until) > now;
}
export function subscriptionEnd(s: any): number | null {
  const ends = s.items?.data?.map((i: any) => i.current_period_end).filter((n: any) => typeof n === 'number') || [];
  return s.status === 'trialing' ? s.trial_end : (s.current_period_end || (ends.length ? Math.min(...ends) : null));
}
