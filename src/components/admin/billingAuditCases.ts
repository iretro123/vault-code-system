export type Evidence = "VERIFIED" | "INFERRED" | "UNKNOWN" | "SYSTEM-GENERATED";
export type Actor = "USER" | "STRIPE" | "SYSTEM" | "AUTH" | "ADMIN";

export interface CaseEvent {
  utc: string;
  label: string;
  actor: Actor;
  evidence: Evidence;
  source: string;
  detail?: string;
  error?: string;
}

export interface AuditCase {
  name: string;
  email: string;
  userId: string;
  stripeCustomerId: string;
  subscriptionId: string;
  plan: string;
  priceId: string;
  classification: string;
  summary: string;
  facts: { label: string; value: string; evidence: Evidence }[];
  answers: { q: string; a: string }[];
  events: CaseEvent[];
  warnings: string[];
  limits: string[];
}

/** Findings recorded from the read-only investigation on Sep 25, 2026. */
export const AUDIT_CASES: AuditCase[] = [
  {
    name: "Edgar Lopez",
    email: "lopezedgar1994@gmail.com",
    userId: "9ccdfe55-28f8-4937-852e-7aee4934d44d",
    stripeCustomerId: "cus_V4wIFYTQ4Pjwoj",
    subscriptionId: "sub_1U4mQ3AMsd1FtcvLeLzAo2aB",
    plan: "VTA - Vault OS (Subscription) · $97.00 / month",
    priceId: "price_1U4KjQAMsd1FtcvLWr8nktLG",
    classification: "D — Deleted Vault account without canceling Stripe",
    summary:
      "Stripe shows no cancellation of any kind: cancel_at_period_end false, canceled_at null, cancellation_details empty, status active. Vault account was deleted between 8:43:47 AM and ~9:20 AM ET on Sep 15, roughly 6 hours before the renewal invoice was created. Deleting a Vault account does not cancel Stripe.",
    facts: [
      { label: "Stripe status (live API)", value: "ACTIVE", evidence: "VERIFIED" },
      { label: "cancel_at_period_end", value: "false", evidence: "VERIFIED" },
      { label: "canceled_at / ended_at / cancel_at", value: "null / null / null", evidence: "VERIFIED" },
      { label: "cancellation_details", value: "empty (no reason, feedback, comment)", evidence: "VERIFIED" },
      { label: "Subscription created", value: "Aug 15, 2026 6:34:57 PM ET", evidence: "VERIFIED" },
      { label: "Current period", value: "Sep 15 → Oct 15, 2026", evidence: "VERIFIED" },
      { label: "Sep 15 invoice", value: "in_1UG1CMAMsd1FtcvLSB0Y7DzW · $97.00 · subscription_cycle", evidence: "VERIFIED" },
      { label: "Payment intent / charge", value: "pi_3UG291… / ch_3UG291…", evidence: "VERIFIED" },
      { label: "Vault account", value: "DELETED (no auth, profile, or student record remains)", evidence: "VERIFIED" },
      { label: "Deletion window", value: "Sep 15 12:43:47–13:20:06 UTC (8:43:47–9:20:06 AM ET)", evidence: "INFERRED" },
      { label: "Billing portal session", value: "No record found (function logs retained are too short)", evidence: "UNKNOWN" },
    ],
    answers: [
      { q: "1. Successfully canceled before Sep 15?", a: "NO — Stripe has no cancellation on record." },
      { q: "2. Attempted to cancel before Sep 15?", a: "UNKNOWN — no cancellation request reached Stripe; a portal visit cannot be ruled in or out." },
      { q: "3. Accessed Vault on Sep 15?", a: "YES — 7 page views 8:43:09–8:43:47 AM ET." },
      { q: "4. Does 8:43 AM prove he personally opened Vault?", a: "YES (strongly) — page views are written only by a signed-in browser as pages change (home → community → learn → home → settings over 38s). Not a background sync." },
      { q: "5. Deleted account before Sep 15?", a: "NO — deleted on Sep 15." },
      { q: "6. When deleted?", a: "Between 8:43:47 AM and 9:20:06 AM ET, Sep 15 (hourly sync matched him at 8:20 AM, not at 9:20 AM)." },
      { q: "7. Subscription active at deletion?", a: "YES." },
      { q: "8. $97 charge before or after deletion?", a: "AFTER — invoice created ~2:35 PM ET, paid 3:35 PM ET." },
      { q: "9. Did deleting Vault cancel Stripe?", a: "NO." },
      { q: "10. Did our system tell him Stripe was canceled?", a: "NO — the only message is \"Your account has been deleted.\"" },
      { q: "11. Software malfunction during an attempted cancellation?", a: "NO evidence. Separate bug: $97 price not recognized by webhooks (fixed going forward)." },
    ],
    events: [
      { utc: "2026-08-03T15:00:40Z", label: "Automatic access revoke (no membership row yet)", actor: "SYSTEM", evidence: "SYSTEM-GENERATED", source: "audit log" },
      { utc: "2026-08-07T15:00:13Z", label: "Old subscription sub_1Qf0AE… marked canceled (older account)", actor: "SYSTEM", evidence: "SYSTEM-GENERATED", source: "audit log" },
      { utc: "2026-08-15T18:35:05Z", label: "checkout.session.completed ($97)", actor: "STRIPE", evidence: "VERIFIED", source: "Stripe webhook", error: "Unknown Stripe price ID price_1U4KjQAMsd1FtcvLWr8nktLG" },
      { utc: "2026-08-15T18:35:05Z", label: "invoice.paid (first payment)", actor: "STRIPE", evidence: "VERIFIED", source: "Stripe webhook", error: "Unknown Stripe price ID price_1U4KjQAMsd1FtcvLWr8nktLG" },
      { utc: "2026-08-15T19:20:17Z", label: "Hourly sync granted Vault access", actor: "SYSTEM", evidence: "SYSTEM-GENERATED", source: "audit log" },
      { utc: "2026-09-13T04:00:00Z", label: "Sep 13–14: no activity recorded", actor: "USER", evidence: "VERIFIED", source: "user_activity" },
      { utc: "2026-09-15T12:20:16Z", label: "Hourly sync: Stripe active", actor: "SYSTEM", evidence: "SYSTEM-GENERATED", source: "audit log" },
      { utc: "2026-09-15T12:43:09Z", label: "Opened Vault — home / dashboard", actor: "USER", evidence: "VERIFIED", source: "user_activity" },
      { utc: "2026-09-15T12:43:39Z", label: "Viewed community, learn, home", actor: "USER", evidence: "VERIFIED", source: "user_activity" },
      { utc: "2026-09-15T12:43:47Z", label: "Opened Settings (last activity)", actor: "USER", evidence: "VERIFIED", source: "user_activity", detail: "page_view · settings" },
      { utc: "2026-09-15T12:44:00Z", label: "Manage Billing / Stripe portal — NO RECORD FOUND", actor: "USER", evidence: "UNKNOWN", source: "edge function logs (not retained)" },
      { utc: "2026-09-15T12:44:00Z", label: "Cancellation request — NO CANCELLATION REQUEST FOUND", actor: "STRIPE", evidence: "VERIFIED", source: "Stripe API" },
      { utc: "2026-09-15T13:00:00Z", label: "Account deleted (window 12:43:47–13:20:06 UTC)", actor: "USER", evidence: "INFERRED", source: "audit log gap + user_activity" },
      { utc: "2026-09-15T13:20:06Z", label: "Hourly sync no longer finds his account", actor: "SYSTEM", evidence: "SYSTEM-GENERATED", source: "audit log" },
      { utc: "2026-09-15T18:35:21Z", label: "customer.subscription.updated (renewal cycle)", actor: "STRIPE", evidence: "VERIFIED", source: "Stripe webhook", error: "Unknown Stripe price ID price_1U4KjQAMsd1FtcvLWr8nktLG" },
      { utc: "2026-09-15T19:36:03Z", label: "invoice.paid $97.00 renewal", actor: "STRIPE", evidence: "VERIFIED", source: "Stripe webhook", error: "Unknown Stripe price ID price_1U4KjQAMsd1FtcvLWr8nktLG" },
    ],
    warnings: [
      "ACCOUNT DELETED WHILE SUBSCRIPTION STILL ACTIVE",
      "Stripe active but Vault deleted — subscription still billing (next renewal Oct 15)",
      "Unknown Stripe price price_1U4KjQ… — 4 failed webhooks",
      "Subscription exists without membership record",
    ],
    limits: [
      "Sign-in and billing-portal function logs from Sep 15 are past log retention.",
      "Exact deletion second cannot be recovered (auth record removed; deletion function logs expired).",
      "Stripe does not expose whether a customer opened a portal session without changing anything.",
    ],
  },
];
