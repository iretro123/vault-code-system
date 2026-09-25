# Pulse production repair — September 25, 2026

## Cause and frontend repair

Production followed CAPITALCOM:SPX500 while the local design preview displayed saved SPY screenshots. Production events had no original chart images, and the old card drew a synthetic candle-chart fallback.

The published member UI now uses only original image cards, identifies the instrument from server data, separates event and capture timestamps, and states clearly when chart capture is unavailable. It fetches the last 100 events and listens for updates as well as inserts, so later image attachments can reach an already-open member page. The original publication was Lovable deployment `66d31096-1ada-40c4-aa69-307e854cf3fa` from commit `ce70d60a`.

## Live SPY service verified

The owner explicitly authorized official Wrangler access to this Cloudflare account. OAuth succeeded using the OS Keychain. No service-role key, personal browser cookies or password was copied.

- Account: `ea807657aabd73d8f92b0c1aca9d8479`.
- Receiver: `vault-spy-pulse`, `https://vault-spy-pulse.iruben597.workers.dev`.
- Receiver version after capture-service binding: `5a790d3d-1b85-4f5e-a694-e3f20f657bf2`.
- Dedicated TradingView layout: `https://www.tradingview.com/chart/Db5ipsDu/`, named **Vault Pulse · SPY**.
- Correct private indicator: **Vault Zone Pulse - SPY Live**, v2.0, retaining the original zone calculations with SPY symbol/ID adaptations.
- Alerts: **Vault Pulse • SPY • 5m • Cloud** and **Vault Pulse • SPY • 15m • Cloud**, using Any alert() function call and the dedicated private webhook.
- Both delivered multiple genuine, automatic snapshots before the member symbol was changed to AMEX:SPY. No mock market events were published.
- SPX Cloud alerts were paused; the legacy database receiver and its health job were disabled. History is retained, never relabeled.
- The five-minute alert briefly showed stopped during UI setup; it was restarted and continued delivering successfully afterward.
- The actual custom-domain member page switched to SPY without reload. Quotes continued updating on both timeframes after deployment.

At approximately 12:22 PM ET the real 5m demand was 767.70–768.54 and the real 15m demand was 767.70–769.78. These are historical verification samples, not fixed levels or current-price promises.

TradingView displays this SPY chart as BATS:SPY / AMEX by Cboe One. Pine accepts AMEX or BATS SPY and uses AMEX:SPY as the canonical instrument identifier; this is not a claim of a separately purchased direct exchange feed.

The alerts show November 24, 2026 expiry: 5m at 04:45 and 15m at 03:44 in the operating-system timezone (America/New_York). Expiry timestamps were recorded for the seven-day renewal warning. The alerts are not open-ended. Backend checks run once per minute and notify the CEO if delivery is stale for three minutes during the configured weekday window.

## Screenshot pipeline deployed, activation pending

- Worker: `vault-spy-pulse-capture`, initial version `9fd1ecfa-f9a1-4fe9-8c51-9aab40c4b714` plus provisioned secrets.
- Private KV namespace: `VAULT_SPY_CHARTS`, ID `8b6525ab04e441518116ae70a8f462b0`.
- Browser binding and hosted minute timer are deployed. The receiver wakes this separate service after acknowledging durable alert receipt.
- Screenshot jobs use a database lease, at most two attempts, and a 90-second event-to-capture limit. No old-event backfill is queued.
- Only the dedicated TradingView layout, SPY, the requested timeframe and the Pulse indicator are eligible. Disconnected pages, mismatched quotes and expired events are rejected. Images are unmodified chart-widget screenshots, not generated candles.
- Images stay private and use hour-limited signed member-feed URLs. Private session keys cannot be addressed by the image endpoint.
- Capture health is separate from alert health, with its own freshness check and CEO notification. Image failures cannot block SPY zone delivery.
- Optional encrypted hosted-login recovery is implemented but **disabled**. It requires explicit approval to retain that dedicated TradingView session in Cloudflare. The password is never stored.

**Automatic screenshot capture is not yet active or verified end to end.** `capture_enabled=false`, `capture_connected=false`, `CAPTURE_SAVE_LOGIN=false`, and no capture-session binding is provisioned. No image has been captured automatically by this service. Two original charts were subsequently captured manually, hosted privately and verified in the member UI; see below. Automatic capture stays explicitly disconnected.

Cloudflare's current account plan is **Workers Free**, verified on the account plan page. It allows only 10 browser minutes per day. The Workers Paid checkout is open for the owner: $5/month plus usage. At the documented $0.09/additional browser hour and 10 included hours, one browser running 7 hours on 22 weekdays is about $18/month including the base fee, before other account usage or taxes. No upgrade was purchased.

A separate hosted browser reached TradingView and showed that the private chart requires sign-in. It then disconnected. The owner was asked to complete the Paid checkout, sign in to the hosted TradingView browser with 2FA, and decide whether to retain that session encrypted. No authentication was copied from the local browser. TradingView previously showed a single-active-session warning; activation must verify behavior when the owner uses another chart session.

## Finish activation

1. Verify the owner completed Workers Paid. Reopen a dedicated Browser Run session; have the owner sign into TradingView there. Do not reuse unrelated account sessions.
2. After sign-in, verify the private SPY layout with the correct Pulse indicator on both intervals. Provision only that session ID as `CAPTURE_SESSION_ID` in the capture Worker. Enable `CAPTURE_SAVE_LOGIN=true` only if the owner explicitly approves encrypted retention.
3. Enable capture and inspect genuine, timely 5m and 15m original screenshots. Check the actual chart, visible zones, price axis, source, bounds and capture timestamp. Capture selectors have unit/static validation, but real hosted render quality is still pending this test.
4. Verify a real zone-change post receives its matching image automatically in the actual Vault member page, and check recovery after a hosted-session restart. Do not label this fully working before that passes.

Private bindings are held outside Git under the original workspace's ignored `.vault-zones-state/spy-pulse/` folder, with owner-only file permissions. Never print these files or webhook URLs. Invocation URL logging is disabled.

## Validation

The original 41 focused tests, TypeScript, changed-file ESLint and production build passed. Six additional screenshot-policy tests pass, covering source/timeframe/indicator checks, stale/future events, disconnected charts, price mismatch, Eastern hours and private signed images. Changed Worker files and the new test pass ESLint; TypeScript and git whitespace checks pass. Both Workers deployed successfully.

Database checks verified authorization, member isolation, stale-job rejection, exclusive leases, rejection of wrong leases and wrong-instrument images, and bounded retry state. Test mutations were rolled back; no fabricated event or image was published to members. Fresh automatic SPY receipts and the actual member feed were rechecked after deployment.

Current monitoring uses the owner's weekday 9 AM–4 PM Eastern window, without an exchange holiday calendar. Pine emits changed state at a 15-second minimum, unchanged heartbeat snapshots roughly once a minute, and candle-close events when TradingView receives a tick. This is not an every-tick guarantee. Alert expiry and hosted login renewal still require maintenance.

## Original charts attached September 25, 2026

The actual member page now loads real SPY screenshots from the correct private Pulse indicator on both timeframes. Five-minute capture: 1:05:35 PM ET, demand 767.70–768.54. Fifteen-minute capture: 1:07:05 PM ET, demand 767.70–769.78. Both originals are 1024×1158 JPEGs, captured directly from the signed-in TradingView tab through the supported browser screenshot API. No candles or zones were generated or redrawn.

These captures occurred after the original 12:20/12:21 PM zone posts. Migration `20260925181000_pulse_chart_refresh_context.sql` explicitly marks them as `context=refresh`; the feed supplies their real capture times and the UI labels them as later views. The event timestamps, event types, indicator logic and automated 90-second capture limit remain unchanged. No new market signal was invented.

Images use the existing private KV/signed-URL path with 30-day retention. Both were verified loaded (natural dimensions 1024×1158) in the custom-domain member UI. Capture Worker version `b3ff1bb4-122a-49fa-a740-0082ca107c22` supports the correct JPEG response type while preserving PNG support. Code commit `6c2de6f8`; Lovable publishing was requested after GitHub synchronization.

The refresh-context test plus existing chart/policy checks pass: 14 tests; TypeScript, changed-file lint, Vite build and whitespace checks also pass. At 1:11 PM ET both automatic alert streams continued receiving real snapshots, with zero open incidents. `capture_enabled` remains false: manually attached original images are not proof of continuous hosted screenshot delivery.

## Delivery hardening after missing-chart report

Root cause was incomplete activation, not a missing frontend image tag: the live database had `capture_enabled=false`, `capture_connected=false`, no capture check timestamp, and only the two manual refresh records. Cloudflare Workers Free was reconfirmed in its dashboard. The paid checkout was reopened; purchasing the plan and retaining the dedicated TradingView login still require the owner's action/approval.

The capture worker now persists wakes in `vault-spy-pulse-charts` (five-minute message retention, one consumer at a time, bounded retries). Browser rendering runs in the queue consumer rather than an HTTP `waitUntil` task, which Cloudflare limits to 30 seconds. The hosted minute timer still recovers lost wakes. A drain handles multiple events from the same snapshot; database leases and the existing 90-second provenance limit remain in force.

Removed the bootstrap-session-ID gate so a valid KV session or explicitly authorized encrypted login can recover after a restart. Missing bindings and login failures are reported through the existing persisted health/CEO notification path instead of silently returning. A browser disconnect error no longer discards a completed capture result, and an expired database lease cannot be reported as successful.

Grounded exact-zone checks in the actual TradingView Data window: the Pulse row exposes Supply upper/lower and Demand upper/lower. Captures validate these prices before and after rendering, in addition to symbol, interval, indicator and quote checks. Missing zones are allowed only for breached/broken/retired updates; a newer different zone is rejected. Genuine 4 PM closing events receive their normal 90-second capture grace period.

The member card retries temporary image-load failures automatically (2/5/10/20/30 seconds, then a visible failure); missing-image HTTP responses are not cached. No fabricated events or screenshots were used for verification. Twenty-seven focused tests pass, covering persistence-before-ack, queue retries, restart recovery, missing configuration/login, changed zone boundaries, lease loss, multiple jobs and bounded image retries. TypeScript, lint, Vite build, Wrangler type generation and deployment dry-run pass. Full hosted screenshot QA remains pending the paid plan and dedicated login.

## Match the approved member design

The user’s local `pulse-design.html` was a separate, static entry with two saved September 25 10:21 AM screenshots and in-memory reactions. It was not the member channel. The production Pulse room now adopts that layout: SPY header, large 5 min / 15 min controls, latest post first, large original-image cards, earlier updates on demand and a direct link to the dedicated Pulse layout at the selected interval. The Pulse tab receives the quiet blue underline only while Pulse is selected; other Community tabs keep their existing appearance.

Removed replay, view pause, the All updates filter, duplicate quote cards and dense status rows. Kept a compact live quote/current-zone line and explicit chart-capture status. Card images remain tied to their own event with distinct capture timestamps; the UI never fills a new event using an older event’s image. Authenticated member reactions now persist in a separate SPY reaction table, using membership-gated RPCs that expose only totals and the caller’s selection, not other members’ identities.

At 1:37 PM ET, both SPY streams continued receiving genuine data. The server automatically posted a new 5m demand at 770.83–771.30 around 1:30 PM, an intrabar breach at 1:34 PM, and a confirmed break at 1:35 PM. The latest 5m snapshot had no active zone; 15m still carried demand 767.70–769.78. These are verification samples, not fixed current values.

Validation: 13 focused card/channel tests pass, including new posts, later image attachments without reload, timeframe isolation, no cross-event chart substitution and stale-heartbeat labeling. TypeScript using `tsconfig.app.json`, changed-file ESLint, whitespace checks and Vite production build pass. Database tests for membership, duplicate reaction idempotence, cross-user isolation and removal ran in a rolled-back transaction; no test reactions persisted. Screenshot activation remains blocked as documented above: capture_enabled=false, capture_connected=false, capture_checked_at=null.
