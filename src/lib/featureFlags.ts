/**
 * App-wide feature flags.
 *
 * These flags are intentionally kept here (not in the database) so they can be
 * toggled instantly with a single code change without rebuilding data. Existing
 * billing data, edge functions, Stripe links, and DB records are preserved —
 * only the customer-facing UI is hidden when a flag is off.
 *
 * To re-enable billing UI in the future, set BILLING_VISIBLE to true.
 */
export const FEATURE_FLAGS = {
  /** When false, every customer-facing billing/subscription/upgrade/checkout
   *  surface is hidden across the app. Backend, DB, and edge functions are
   *  untouched. */
  BILLING_VISIBLE: false,

  /** Enables the "Continue as Guest" entry point on the login screen and the
   *  read-only guest preview experience. */
  GUEST_MODE_ENABLED: true,
} as const;

export const isBillingVisible = () => FEATURE_FLAGS.BILLING_VISIBLE;
export const isGuestModeEnabled = () => FEATURE_FLAGS.GUEST_MODE_ENABLED;
