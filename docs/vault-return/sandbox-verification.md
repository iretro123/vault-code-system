# Vault return sandbox verification — 2026-10-02

Verified in Safari under Vault Trading Academy LLC (live account `acct_1K74aoAMsd1FtcvL`). Created isolated sandbox `Vault OS Return Onboarding QA`, account `acct_1UMCo6PJaKtHLOgO`.

Payment Link: `plink_1UMCuTPJaKtHLOgOx84lWHUx`
Sandbox URL: https://buy.stripe.com/test_dRm6oJ9YJ6W2cIUgyug7e00
Monthly price: `price_1UMCqePJaKtHLOgOInxbjbi5` ($99 USD/month).
Monthly product: `prod_VMwkiFisCUvFOb`. Intro product: `prod_VMwlAppjw7iR3d` ($1.99 USD one-time).
Quantity 1 each, no adjustable quantity, no promotion codes, 30-day trial on recurring price, payment method required.

Actual sandbox checkout with synthetic Visa 4242 succeeded for the approved test recipient. Stripe recorded:
- Payment `pi_3UMCy3PJaKtHLOgO0u0REt4e`: $1.99 USD, Succeeded.
- Customer `cus_VMwr6YTc3AbucX`.
- Subscription `sub_1UMCy5PJaKtHLOgOytk6KMbJ`: trialing, 30 days Oct 2 → Nov 1.
- Paid invoice `in_1UMCy3PJaKtHLOgOLZXmM93R`, number `Z2TBCL8G-0001`: $1.99.
- Advanced the Stripe test clock to Nov 2, 2026 at 20:25 UTC. Subscription became Active; renewal invoice `Z2TBCL8G-0002` is Paid for $99.00, created Nov 1 at 20:22. Current period Nov 1 → Dec 1; next invoice preview $99 on Dec 1. This proves an actual sandbox renewal, not just a preview.

Not an end-to-end production pass: this isolated sandbox is not connected to the application backend or GHL. No real payment was made. No paid live entitlement granted. Campaign remains unpublished.

Stripe receipt history showed no receipts sent. Manual Send receipt only offered the Stripe account owner, with a notice to activate the sandbox before emailing other addresses. Canceled that send rather than sending to an unapproved recipient. Earlier GHL test send was submitted to the approved Gmail address; inbox delivery remains unconfirmed. Mail's connected Google account shows a warning and the cached search had no matching message; this does not prove failure at Gmail.

Live database read confirmed canonical `vault_access_for_user(uuid)` exists but `vault_return_memberships` and `vault_onboarding_outbox` are absent. No migration was applied in this verification.
Local checkout/fulfillment tests: 28 passed across `returnOffer.test.ts` and `returnFulfillment.test.ts`, including unpaid and changed-price rejection, mismatched customer, canceled subscription, changed trial length, late checkout events, and database failure propagation for retry.
GHL Email Services verified the correct location's LeadConnector provider and dedicated header `Contact@vaulttradingacademy.com` / RZ - Vault Trading Academy. SPF, DKIM, tracking CNAME and MX show Verified. DMARC shows Not Verified; DNS queries for both root and sending-subdomain DMARC returned no TXT records. Warmup Stage 2; no sender/DNS changes made.
GHL has an existing integration named Vault (created Mar 5, last used Sep 24) with contacts.readonly and contacts.write, plus other existing permissions. Read-only review only; no changes or token rotation. Lovable Cloud already lists GHL_API_KEY and GHL_LOCATION_ID secrets, so a new credential may be unnecessary; location value/API behavior still needs verification. Existing Stripe key, webhook secret and monthly-price secret also exist. No values revealed or changed.
Production webhook log inspection found pre-existing failures on Oct 2 around 16:04–16:07 UTC: `invoice.paid` / `customer.subscription.updated` rejected price IDs `price_1MOVgRAMsd1FtcvLQSw1rSKN` and `price_1UBISpAMsd1FtcvLKoxyfOn3` as unknown. Do not blindly allow these IDs; verify the owning Vault account, products, amounts and intended membership first, then repair and replay failed events.
Pending: verify existing GHL backend location, isolated staging deployment and sandbox API access, webhook connection, invoice footer, activation, GHL automatic welcome delivery, both platform access, outage/replay, cancellation/refund, resolve existing price mapping failures, and live smoke test.
Prepared but did not create a restricted sandbox API key named `Vault Return QA Backend`. Intended scopes: customer/event/Checkout Session/subscription read, invoice write for backup footer testing. User-specific confirmation is pending because creating persistent API access through the browser requires confirmation at action time. No key value was obtained or saved. Checkout fulfillment configuration was passed explicitly from the Deno webhook so the shared validation code also type-checks in local app tests.

## User-confirmed and connected verification
User screenshot and Safari Gmail view confirmed the manual GHL test arrived in retronine82@gmail.com's Inbox, subject Your Vault payment is confirmed, sender Contact@vaulttradingacademy.com. This confirms this test's delivery only; it was not automatically triggered by payment.
User explicitly approved the restricted sandbox key. Created Vault Return QA Backend under the isolated sandbox; credential held in mode-600 temporary storage outside the repository, never printed. Actual Stripe API reads succeeded for Checkout Session, line items and subscription. Intro price is price_1UMCrVPJaKtHLOgOudiKBCFd. Session is complete/paid, USD199 cents, quantities1, approved monthly99 and intro1.99; exact30-day trial confirmed.
Executed shared checkout fulfillment against the actual sandbox Stripe API and a recording-only RPC stub. Passed buyer-email normalization, current active status and expiry2026-12-01T20:22:07Z. No live entitlement or CRM write occurred; this is not a connected backend/webhook pass.

Attempted the approved invoice-footer test on the already-paid sandbox first invoice. Stripe rejected it: Finalized invoices can't be updated in this way. No invoice changed. Configure backup instructions before invoice finalization; invoice.created handling alone is not yet proven for the immediate first checkout invoice. Renewal footer also remains unverified.
Lovable build-agent delegation approval requested explicitly before invoking it; code remains local, no deployment or live schema mutation.
