# Membership access policy

## Implemented rule

- Whitelisted authenticated members: Full Access without a subscription. Whitelist identity is matched against `auth.users.email`, not editable profile text. Stripe cancellation does not remove whitelist eligibility.
- Other customers: active approved Stripe subscription, or verified unexpired Apple subscription. Existing unexpired Google Play subscriptions remain supported, including a canceled auto-renewal whose paid period has not ended.
- Stripe trialing, past_due, unpaid, incomplete, paused, expired, or canceled: Free Basic unless a separate whitelist/native entitlement qualifies. Cancel-at-period-end remains eligible while Stripe still reports active.
- Free Basic: general chat/community rooms and `chapter-1-basic-bridge`; no paid signals, paid lesson content, private live-room links, Pulse, or playbook signed URLs.
- Staff/owner roles keep their explicit administrative access. Bans/revocations override customer and staff exemptions.

## Leaks addressed locally

1. Paid role strings previously overrode inactive billing. Client navigation, tier decisions, and upgrades now use `get_my_access_state`, backed by the canonical database decision.
2. Browser localStorage no longer authorizes paid access. Query errors fail closed and membership recovery explains that the user should not buy again just because verification failed.
3. Restrictive RLS boundaries protect paid message rooms, lessons, live links, and notification reads even when old permissive policies exist. Unknown message rooms default to paid.
4. Stripe revoke/sweep protection consults current whitelist/native eligibility. The earlier Apple protection queried a nonexistent `status` column; it now uses the canonical purchase records and expiry decision.
5. Paid notifications are filtered before insertion/push dispatch. Private-room mentions and staff messages use entitled recipients instead of public broadcasts.
6. Playbook signing no longer trusts a cached paid role or joins student-access records on the wrong user ID.
7. Room message caches are scoped by account, and late callbacks from the previous account are ignored.
8. Stripe invoice/subscription events reconcile current Stripe subscription state rather than blindly trusting an old event's status. Modern and legacy invoice subscription references are supported. Another active subscription for the same customer/product is preserved when an older one ends.
9. Recovery saves the Stripe subscription/price IDs as entitlement evidence and no longer provisions Whop-only memberships under the requested policy. Unknown/missing prices do not default to a paid plan.
10. Native restore refreshes the shared access query before navigation. Billing profile updates no longer clear revoked/banned status.

## Verification

- Isolated PostgreSQL/PGlite migration test: 108 entitlement/RLS matrix assertions, plus free-room read/write, paid-write rejection, notification recipient filtering, private helper permissions and anonymous denial checks.
- Full frontend suite: 567 tests passed across 88 files.
- Frontend TypeScript, production web build, scoped lint, and diff whitespace checks passed. Existing bundle warnings remain.
- SQL test command: `node scripts/qa-member-entitlements-db.mjs /path/to/@electric-sql/pglite/dist/index.js`.
- No production member records were changed and no actual purchase or notification was sent.

## Deployment status and required preflight

**Local implementation only. Not live yet.** The new migration and changed Edge Functions must be released together with the frontend. Publishing the frontend alone would leave the old server rule in place and could wrongly hide whitelist access.

1. Inspect the actual target schema, RLS policies, active Stripe price secret, whitelist and native receipt coverage; run a read-only membership comparison first. Confirm approved target/environment before changing live permissions.
2. Reconcile existing Stripe rows against Stripe, including duplicate customer records and multiple subscriptions. Historical rows lacking a subscription/customer ID will fail closed and need repair, not another payment. Native records missing verification metadata need restore/reverification, not an unconditional legacy role bypass.
3. Apply `20260928000100_canonical_member_entitlements.sql` on staging, then deploy the changed webhook, recovery, reconciliation, sync, sweep, playbook and native activation functions plus their shared helpers. Validate Edge Functions with Deno; frontend tsc does not type-check Deno entry points.
4. Verify current webhook delivery, scheduled reconciliation, Apple renewal/refund/revocation handling, and store restores. The database is a verified-provider snapshot, not a Stripe API request on each read. Missed provider updates remain an operational risk. Previously downloaded/publicly hosted media cannot be revoked retroactively by RLS.
5. Run actual test-account journeys: whitelist with canceled Stripe, active Stripe, canceled/past-due Stripe, Apple active/expired, free chat/course, direct paid reads, notification delivery, and account switching. Confirm no legitimate current payer loses access in the comparison.
6. Deploy database/backend/frontend/native changes in a coordinated release, monitor errors and denied paid reads, and retain a rollback plan. No production certification or deployment was performed in this pass.

The webhook changes follow [Stripe's subscription webhook guidance](https://docs.stripe.com/billing/subscriptions/webhooks): provider events update membership state; the client never grants access from a success URL or role label alone.
