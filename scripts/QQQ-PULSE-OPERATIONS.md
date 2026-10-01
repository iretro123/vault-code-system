# QQQ Pulse production — October 1, 2026

QQQ uses the shared production study, with one server alert for each of 5m and 15m. Member notification preferences are independent of SPY; QQQ defaults off. Only genuine new zones, entries, and confirmed breaks can notify. Heartbeats do not notify.

## Active alert generation

- `Vault Pulse QQQ 5m v1`
- `Vault Pulse QQQ 15m v1`
- Condition: the corrected shared study, **Any alert() function call**.
- Delivery: webhook only, `/webhook/qqq/v1/<existing private delivery token>`.
- TradingView currently shows November 30, 2026 expiration. Renew before then; these are not perpetual alerts.

The unversioned `/webhook/qqq/<token>` route is retired with HTTP 410 before any database or capture work. Older alerts, including names ending in `Production`, may remain Active in TradingView but cannot publish through that route. Do not restore acceptance of the old route or attach old study snapshots to the v1 route. No credential scope was expanded. SPY's existing route remains unchanged.

## Capture and recovery

Use only the existing Cloudflare browser session. Switch symbols and timeframes inside it; never open competing local TradingView charts. Release the hosted inspector after maintenance. Normal browser expiration recovers through the approved encrypted session backup. Account login challenges require owner action. Ordinary TradingView Connect is rate limited to once per ten minutes.

Zone delivery and screenshot capture have separate health checks. Exact symbol, timeframe, zone bounds, and freshness checks must pass before an image is attached. Never substitute a generated chart, a different zone, or a later image labeled as the original. No-zone heartbeats show the existing empty state.

## Verification

Local tests cover route retirement, receiver validation, capture retries, pending-image refresh, no-zone presentation, and symbol preference isolation. Production operator checks passed for all four SPY/QQQ timeframes on October 1 before the open. Operator checks are not market events and do not prove a member device received a push. Record actual session deliveries separately in the continuity checkpoint.

The regular-session adapter runs 09:30–16:00 America/New_York on weekdays and needs market ticks. Heartbeats target sixty seconds; state changes are rate limited to fifteen seconds. Do not describe this as zero latency or guaranteed availability.
