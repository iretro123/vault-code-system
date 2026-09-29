# Vault Pulse — hosted operation

Connected September 24, 2026. This replaces the Mac-dependent receiver described in `SPX500-PULSE-TEST.md`.

## Deployment

- Existing Lovable project: `3f554d41-bb0c-4e4a-ac27-d63167a6e1a4` (Vault OS: Discipline System).
- Existing Lovable Cloud/Supabase project: `oemylhcjqncovnmvvgxh`.
- Receiver: Supabase Edge Function `pulse-receiver`; runs independently of member devices.
- Frontend route: `https://member.vaulttradingacademy.com/academy/community?tab=pulse`.
- Migration: `20260924151514_d179cfb2-8051-45b3-bdb2-2e7a418eb05a.sql`, applied through Lovable's migration runner.
- Lovable feature commit: `46ca52205e851a97d660a6b6c6791a10c40f41ec`.
- Member-view wording polish: `0ca5766f4cb55f24fa5031e522f98d1d87235682` (initial loading and paused-view states).
- Final web publish: deployment `9b58699b-fa10-43b8-8db4-aeb2ff7df8f5`; published pause/resume copy verified on the custom member domain.

The new tab uses the existing OS shell, membership, and Supabase session. Chat and Signals remain separate. Pulse does not insert chat messages or trigger their broadcast/push pipeline. Members read through the `pulse_feed` RPC and receive Realtime change notifications, with a 30-second refresh fallback.

## Source and schedule

The saved TradingView indicator copy **Vault Zone Pulse - Live Feed** supplies exact zone bounds, current price, and the last 60 OHLC candles from **CAPITALCOM:SPX500**, on 5m and 15m. This is the SPX500 test requested by the user, not SPY. The original indicator's zone calculations remain intact.

Active alerts:

- `Vault Pulse | SPX500 | 5m | Cloud` — displayed expiration November 22, 2026 at 23:45.
- `Vault Pulse | SPX500 | 15m | Cloud` — displayed expiration November 23, 2026 at 00:48.

Both use **Any alert() function call**, webhook-only delivery, and **Allow after-hours testing = false**. The two former Local test alerts are paused. The local receiver and quick tunnel were stopped after cloud receipt was verified.

Monitoring is weekdays 9 AM–4 PM America/New_York (DST aware). The schedule is not an exchange holiday/early-close calendar. Updates require a TradingView price tick: state changes have a 15-second throttle, unchanged snapshots arrive roughly once per minute, and candle closes trigger an update. This is not an every-tick quote service. Short-lived changes within the throttle can be missed.

The TradingView Essential plan requires expiration. Renew both Cloud alerts before November 22 and update `pulse_status.alert_expires_at` to the new dates. Open-ended alerts prompted a paid upgrade, which was not purchased. Editing the chart or indicator does not update an existing alert's saved script/inputs: recreate alerts after relevant script changes.

## Security and health

The ingress URL contains a scoped random 256-bit delivery token; only its SHA-256 hash is stored in `pulse_config`. The full URL is saved privately at `.vault-zones-state/spx-pulse/cloud-webhook-url.txt` (mode 0600), excluded from git. Never put it in frontend code, screenshots, public messages, or logs. The built-in Supabase service key stays in the Edge Function environment.

Anonymous users cannot read Pulse. Eligible active/trialing paid members and authorized staff can read; shared guests and banned accounts cannot. Browser writes and anonymous feed RPC calls are denied. Receiver state/config are service-only. Snapshots are strictly validated and committed atomically with revision checks; retries do not duplicate posts.

`vault-pulse-health` runs once a minute in the hosted database. After three minutes without deliveries during the configured session it creates one incident and an in-app CEO notification. New deliveries resolve that incident. It warns about expiration seven days ahead. This is an alert to an operator, not an automatic TradingView renewal or repair service. Historical events are retained for 30 days.

No model invents zone levels or market events. Plain-language lifecycle messages are deterministic. Charts draw the indicator's received candle data and exact zone edges; they are not screenshots from a continuously open browser. Historical posts retain their timestamps, while the current zone strip shows the latest state. A fresh feed with no active boxes says it is waiting for the next zone.

## Verification

- 33 focused Pulse tests pass, including validation, authentication, duplicate delivery, concurrent snapshots, break/return/removal lifecycle, missed-close recovery, and final-session close.
- TypeScript and production build pass.
- Lovable full suite: 458/461 pass; three existing Live routing tests expect the old Live heading, outside this feature's diff.
- Actual hosted endpoint rejects GET (405), wrong delivery credentials (401), and invalid payloads (400).
- Production database checks confirmed eligible member reads and nonmember denial through both RLS and RPC, without altering membership or inserting sample signals.
- Real 5m and 15m receipts arrived after the local receiver and tunnel were stopped, at 15:26:13 and 15:26:23 UTC. Measured snapshot-to-database delivery was approximately 0.9–1.1 seconds for those receipts.
- No simulated market posts or copied chart-review screenshots were inserted into the hosted channel.
- Published member route verified in the user's existing signed-in CEO account. Live quotes refreshed without a page reload; both sources reported connected. The phone breakpoint measured 390 CSS pixels with no horizontal overflow. Timeframe filtering and pause/resume were checked, then restored to All updates with monitoring visible.
- Hosted health checks ran successfully with zero unresolved incidents at verification.

Known-zone breaks can be recovered from the next snapshot's closed candles after a brief outage. Entire zones formed and removed during a longer outage cannot be reconstructed from candle history alone. The app marks stale feeds rather than claiming to be live. Native installed apps require their normal release/update process to receive frontend changes.
