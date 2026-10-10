# $49 Private Mentoring: Connection Check Findings and Plan

## Findings from read-only checks

**Calendly: blocked, nothing verified**
- `GET /users/me` returned HTTP 401 "The access token is invalid". So `event_types` could not be listed. Event URI, active/secret status, duration, locations and availability are all still unverified.
- Recheck (14:30 UTC): the secret exists, its format is not a valid Calendly personal access token, and `GET /users/me` returned 401 again.
- Recheck after the owner replaced it (14:40 UTC): `GET /users/me` still returned 401, so I stopped there. My build workspace may still hold the value it loaded at session start, so it may not have picked up the replacement. Only a check run inside the live backend reads the secret as currently saved.

**Proposed first step (needs approval): a temporary read-only Calendly check**
- Add a small backend function, `calendly-readonly-check`, that only staff can call.
- It makes only documented Calendly read requests (`GET /users/me`, `GET /event_types`, `GET /event_type_available_times`) and sends no custom User-Agent.
- It returns only HTTP statuses plus the exact event's link, name, active, secret, duration, location type and number of open slots in the next 7 days. It never returns or logs the key.
- Deploy it, call it once, report the result, then delete it. No other change is made.
- Fix: in Calendly go to Integrations → API & Webhooks → Personal Access Tokens and generate one token. Replace the secret value in Project Settings → Secrets. The value was never printed.
- Note: the sandbox's default Python client gets an HTML 403 from Calendly. The check must send a normal User-Agent, and the real check should run inside a backend function anyway.

**Stripe (live, read-only)**
- Product found: `prod_VPfh2LqYPkPMap`, "Private 2-Hour Trading Mentoring". It is live, active, a service, and created at nearly the same time as the new $99 price.
- It has no prices, neither active nor archived, and no default price. So there is no LIVE price ID to allowlist yet.
- GHL most likely charges this item with an inline amount. Live charges would then show the product only on invoice or PaymentIntent lines, with no price object.
- Product metadata is hidden from this connection, so I could not confirm the link to GHL catalog product `6ac9a7c915dafb910f718050`.
- The only live $49 price I found is `price_1UF0VKAMsd1FtcvLpSXSZo7G`. It is a recurring 30-day price on another product, `prod_N6VL5dZUHwKUBg`, and is not the mentoring item.

## What is needed before building

1. A valid Calendly token, then rerun the read-only check. It must confirm the scheduling URL, name, 120 minutes, active, Secret (intended), location type, and open slots in the next 7 days.
2. Test proof received: PaymentIntent `pi_3UOr5vAMsd1FtcvL0jZQkjrC`, $49 USD, no invoice, GHL location/contact/order details present. The PaymentIntent alone does not prove the product, so the GHL order is the proof source. GHL catalog price `6ac9a7c915dafb910f718058` corresponds to test product `prod_VPfh4JjoYgfXW1` and live product `prod_VPfh2LqYPkPMap`.
3. The GHL Orders API refused the existing GHL key (401, "The token is not authorized for this scope"). Add `payments/orders.readonly` (and `payments/transactions.readonly` for payment linkage) to the existing GHL private integration, then rerun the read-only order lookup.

## Recommended design (nothing is built yet; everything stays off)

**Payment proof: one booking per verified $49 payment**
- Add a backend-only table `mentoring_purchases`, keyed by the PaymentIntent ID, with unique invoice and charge IDs. It stores customer, email, location, order ID, amount, status (`pending_link | link_ready | sent | used | refunded | withheld`) and timestamps.
- Add a backend-only function `record_vault_mentoring_payment` that saves the purchase row and its outbox row together. An exact replay does nothing; a replay with different details errors. This mirrors the GHL $1.99 bridge.
- In the existing `stripe-webhook`, add a branch behind a new switch, `VAULT_MENTORING_ENABLED`, off by default. Following the payment event GHL actually fires (confirmed by item 2), it re-reads the payment from Stripe and checks:
  - succeeded, live, exactly 4900 USD
  - customer matches
  - the allowlisted product or price
  - our GHL location
  - not paid outside Stripe, no credit applied
  
  Missing GHL details are treated as retry-later; wrong values are a permanent rejection. The existing $1.99 and generic paths are not touched.
- On a refund or dispute, mark the purchase refunded and withhold any unsent booking link.

**Availability guard**
- Before sending a link, call `event_type_available_times` for the confirmed event URI over the next 14 days, and confirm the event is still active.
- With no open slots or an inactive event, the email is held and retried, with a staff alert. A booking link is never sent to a calendar with no openings.

**One-use booking link**
- Calendly `POST /scheduling_links` with `max_event_count=1`, owner = the event URI, so each payment gets one single-use link instead of the public URL.
- The token needs `scheduling_links:write`, and creating links needs approval. Until approved, a fallback could send the public scheduling URL plus an invitee email check through a Calendly webhook, which needs the Standard plan or higher. That fallback is weaker.
- When a booking happens (Calendly `invitee.created` webhook, signed), mark the purchase used.

**Branded email**
- Reuse the onboarding-outbox pattern: lease, backoff, withhold, and one send attempt right after saving.
- Delivery goes through GHL: add a tag such as `vault-mentoring-paid` and set a custom field holding the single-use link. A GHL workflow, published separately and left unpublished for now, sends the branded email.
- No email is sent from our code directly, and nothing is sent while the switch is off.

**Settings (names only)**
- New: `VAULT_MENTORING_ENABLED` (unset), `CALENDLY_PERSONAL_ACCESS_TOKEN` (replace the value), `CALENDLY_WEBHOOK_SIGNING_KEY` (later).
- Reused: `GHL_API_KEY`, `GHL_LOCATION_ID`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

## Technical details

- Files to add on approval:
  - `supabase/functions/_shared/mentoringFulfillment.ts`
  - `supabase/functions/_shared/calendlyLink.ts`
  - a webhook branch in `stripe-webhook/index.ts`
  - `sync-vault-mentoring` worker, or an extension of the existing onboarding worker
  - a `calendly-webhook` function for marking links used
- Tests:
  - valid $49, wrong amount, location or product, out-of-band, refunded, replay and concurrent delivery
  - missing metadata retried later
  - no availability holds the email
  - a link is used once
  - existing regressions
- Out of scope: front-end changes, enabling anything, sending email, creating Calendly links or bookings.
