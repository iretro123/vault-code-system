# Vault payment-first onboarding — not deployed

Verified Safari CRM: Vault Trade Academy, Holiday, Florida; location `G56txqjwbZBWWHuZmfo7`.

## Customer journey
Email -> approved Stripe Payment Link -> `/activate-return` -> secure email verification -> claim paid membership -> download/sign in. Customers can revisit the activation URL at any time. Do not email passwords or put bearer tokens/session IDs in invoices.

## Stripe setup
Use isolated sandbox first. `scripts/create-vault-return-offer.mjs` creates an idempotent sandbox Payment Link with a $1.99 one-time line item and $99 monthly subscription, delayed exactly 30 days. It requires the approved sandbox $99 price and a sandbox restricted key. No live link has been created.

Secrets: `STRIPE_VAULT_RETURN_PAYMENT_LINK_ID`, `STRIPE_VAULT_RETURN_INTRO_PRICE_ID`, existing `STRIPE_VAULT_OS_MONTHLY_PRICE_ID`, existing Stripe key and webhook signing secret. Approved Payment Link ID AND both actual prices/payment totals are checked; metadata alone never grants access.

Enable successful-payment/paid-invoice customer email notifications in Stripe. Confirm the receipt is actually delivered in the live verification; sandbox does not establish live delivery. Add `invoice.created` to the webhook subscription alongside existing payment/subscription events. The invoice handler adds the access instructions footer to subscriptions carrying the dedicated campaign metadata and approved monthly price. Preview the first invoice and renewal invoice. An actual test proved a finalized first invoice cannot accept a later footer update. Set backup instructions before finalization; do not assume invoice.created can modify the immediate first checkout invoice. Receipt body customization is different from invoice customization; do not promise that the footer appears in every receipt email.

Backup invoice footer:
Access Vault OS: https://member.vaulttradingacademy.com/activate-return — use the email entered at checkout. Verify your email to connect your membership, then download Vault OS for iPhone or Android. Help: vault@vaulttradingacademy.com. No second payment is needed.

## Backend deployment order
1. Apply `20261002000100_vault_return_onboarding.sql` before deploying changed webhook. Adds private paid-intro records, canonical expiry-bounded RLS entitlement, and durable GHL outbox.
2. Deploy `stripe-webhook`, `activate-stripe-return`, and `sync-vault-onboarding` with matching environment secrets. Existing app price mapping must match the recurring price.
3. Deploy web `/activate-return`. Add exact URL to Supabase auth redirect allowlist and confirm email-verification template/SMTP. Public signup must be enabled for new members. Never trust a session ID as account ownership.
4. Schedule authenticated worker POST every minute using `VAULT_ONBOARDING_JOB_SECRET`. Do not put this secret in frontend code. Set `GHL_LOCATION_ID` to verified location; confirm private-integration API key belongs there. Leave `VAULT_RETURN_ONBOARDING_ENABLED` unset until draft workflow and sandbox handoff verified. Record scheduler job and health alert before launch.
5. Claims require confirmed account email, matching checkout email, an unexpired paid subscription, and a non-banned profile. Trialing by itself does not grant access. Other trial/free users are untouched.

## GoHighLevel workflow
Name: Vault OS — Paid Return Onboarding.
Saved draft: https://app.gohighlevel.com/v2/location/G56txqjwbZBWWHuZmfo7/automation/workflow/d8b9e95e-81bf-4061-b96d-2bb83f92d516
Safari draft contains the exact tag trigger and a saved welcome email with subject "Your Vault payment is confirmed" and preview "Connect your membership, then download Vault OS." Both re-entry and multiple opportunities are OFF. Publishing is OFF. Sender fields use defaults. Safari verified the dedicated header is "RZ - Vault Trading Academy" / `Contact@vaulttradingacademy.com`, domain `contact.vaulttradingacademy.com`, with SPF and DKIM verified. DMARC is Not Verified and neither root nor sending-subdomain DMARC returned a TXT record in DNS checks. Domain is in warmup Stage 2. No contacts were enrolled. A manual test send was submitted to the approved test recipient; user screenshot and Safari Gmail confirmed Inbox receipt. Automatic payment-triggered delivery remains unverified.
Trigger: Contact Tag added, exact `vault-reactivation-paid`. Re-entry OFF.
Actions: remove from the specific Vault winback workflow (not all unrelated workflows); send the transactional email in `welcome-email.html`. Leave draft until tested. No recipient list/broadcast. An idempotent tag addition starts onboarding; a successful API response only confirms CRM acceptance, not email delivery. Verify GHL delivery logs separately.
Worker claims jobs with a 5-minute lease and exponential retries capped at 1 hour. A failed CRM request never deletes billing data. Monitor jobs with attempts >= 5 or no worker run; human review needed. Queue state `sent` means CRM tag acknowledged, not inbox delivery.

## Required launch checks still pending
Sandbox $1.99 checkout and $99 renewal after 30 days passed in an isolated Stripe sandbox; see `sandbox-verification.md`. Local payment validation, fulfillment failure/retry behavior, and SQL/RLS tests passed. Still pending in connected staging: first invoice footer; verified new and existing account activation; wrong-email rejection; app login both platforms; expired/canceled RLS denial; GHL contact/tag/welcome delivery; CRM outage replay; checkout browser closure; invoice/receipt backup link; billing-portal cancellation. Check password reset and email OTP delivery with actual provider settings, fix DMARC, and confirm automatic payment-triggered welcome receipt. These require connected Stripe/Supabase/GHL environments.

Promotion is a shareable payment link: it does NOT enforce former-member eligibility or one purchase per email before payment. Exclude active subscribers from the email list; repeat-purchase/eligibility restrictions require an authenticated eligibility checkout if strict enforcement is desired. Do not describe those controls as implemented. Refund/dispute-based automatic revocation and CRM renewal/cancellation tags are not included in this change; keep refund operations tied to subscription cancellation until implemented/tested. Do not launch while those operational choices are unresolved.
