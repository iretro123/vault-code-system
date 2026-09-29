# SPX500 Pulse — live local test

> Superseded September 24, 2026 by [hosted Vault Pulse](VAULT-PULSE-HOSTED.md). The cloud alerts now deliver directly to Lovable Cloud. The old local alerts are paused and local receiver/tunnel are stopped. The material below records the earlier prototype and repair history.

The private Community preview is at `http://127.0.0.1:4175/pulse-test.html`.
It follows **CAPITALCOM:SPX500**, not SPY. No member posts or member notifications are sent.

## Connected on September 24, 2026

TradingView has two active webhook alerts using the saved **Vault Zone Pulse - Live Feed** script:

- `Vault Pulse | SPX500 | 5m | Local test`
- `Vault Pulse | SPX500 | 15m | Local test`

Both use **Any alert() function call** and webhook-only delivery. Both expire October 25, 2026. Actual authenticated snapshots from both timeframes were received and persisted, including 60 OHLC candles, current price, and the indicator's exact active zones. Follow-up deliveries continued without browser interaction. No fabricated indicator events were inserted into the live feed.

The separate Pine copy is `scripts/vault-zone-pulse-live.pine`. The original indicator's zone calculations and box mutation rules are unchanged. Added origin metadata identifies zones; the notification adapter observes their final state. The original saved indicator is preserved.

## What creates a post

`src/lib/pulseSnapshots.ts` describes changes to the indicator's exact zones:

- First observation, zone entry, and zone exit.
- Price crossing the invalidation edge while a candle is open.
- A return before that break confirms.
- A confirmed close beyond the supply high or demand low.
- Zone removal for another reason, described separately from a break.
- A later closed candle still inside the zone.

A disappearing box on an open candle is retained as pending, because the chart can restore it before the candle closes. A confirmed break closes that zone's lifecycle. A subsequent snapshot can recover a missed closing update from its verified closed candles. Retries, unchanged observations, and repeated same-bar event IDs do not create duplicate posts.

The script sends a combined snapshot on state changes, subject to a 15-second minimum between change notifications, on candle close, and about once a minute while unchanged. TradingView must receive a price update before Pine executes. This is not an every-tick market-data stream. The frontend shows feed age and marks a timeframe disconnected after 90 seconds without a new receipt.

## Chart and copy

Posts use short deterministic sentences such as “In 15m supply,” “Price above 7,664.1. Waiting for the 15m close,” and “15m supply broke. Closed above 7,664.1.” Exact numbers come from indicator data, never screenshot-coordinate estimates or AI guesses.

Automatic posts draw candles and zone boundaries from authenticated TradingView data in `PulseCandleChart.tsx`. They are clearly labeled as charts drawn from indicator candle data. Older supervised posts retain their original TradingView screenshots. The feed keeps the current quote and active-zone state separate from historical posts.

The pre-connection 15m zone (7,656.7–7,664.1) was reconciled through the private review endpoint against the real incoming candles. Its 06:30–06:45 ET candle closed at 7,665.1. The catch-up post is explicitly a reviewed observation with its actual 06:45 candle-close time stored separately from its later report time.

## Running services

- Vite: loopback `4175`, browser read-only API proxy.
- Node receiver: authenticated administration/SSE on loopback `4191`.
- Webhook ingestion only: loopback `4192`, exposed through a Cloudflare quick tunnel.
- SQLite, credentials, snapshots, and the private webhook URL: ignored `.vault-zones-state/spx-pulse/`.

Only the ingestion port is exposed. Public reads of `/feed` return 404, and invalid authenticated payloads return 400. The browser never receives the webhook capability or admin credential. The endpoint must respond promptly; incoming snapshots are validated, persisted transactionally, and broadcast through local SSE.

Start the receiver with Node 24 or later:

```
node scripts/spx-pulse-server.mjs
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4175 --strictPort
```

The current supervised early-morning test uses `PULSE_AFTER_HOURS_UNTIL=2026-09-24T13:00:00Z`. After that fixed deadline, the receiver accepts indicator updates only during weekdays 9 AM–4 PM America/New_York. The Pine alerts have their after-hours test input enabled for the initial test; before a production rollout, recreate them with that input disabled. This monitoring window is not an exchange holiday/early-close calendar.

The local Mac, receiver, and tunnel must remain online. A quick tunnel is a temporary test address; restarting it can change the destination, requiring both alerts to be updated. This is real automation in a local preview, not a production-hosted member service. Production needs stable hosting, a stable authenticated endpoint, holiday handling, data-distribution rights, member authorization, and operational monitoring.

## September 24 delivery repair

The original quick tunnel stopped delivering at 07:56 ET while TradingView continued triggering. Its logs showed repeated QUIC connection failures. At 09:02–09:03 ET a replacement tunnel using `--protocol http2` was connected to the same ingestion-only port, and both existing alert destinations were updated. Real snapshots from both timeframes resumed. The current tunnel log is `tunnel-recovery.log`; the current destination remains saved privately in `webhook-url.txt`.

The first recovered 5m snapshot automatically caught the earlier supply break above 7,670.3 using its closed candle history. Delayed confirmed posts now say “Earlier move” and retain the actual candle-close time. A prominent interruption warning appears when a monitored timeframe has no fresh data for 90 seconds. Current zone strips show exact bounds; when both fresh feeds have no zones, the preview explicitly says it is waiting for the next zone. Historical cards are not presented as current active zones.

HTTP/2 repaired this connection, but it does not make a temporary tunnel or sleeping/offline Mac a reliable production host. Move the receiver to always-on hosting with a stable endpoint before member rollout. Candles can recover breaks in previously known zones; they cannot reconstruct every zone that formed and disappeared during a delivery outage.

## Validation

26 focused tests cover symbol/session validation, source integrity, stale and inconsistent snapshots, unconfirmed crossings, returns, supply and demand breaks, missed-close recovery, recovery after an hour offline with a replacement zone, removal versus invalidation, quiet unchanged states, deduplication, exact bounds, and reviewed catch-up breaks. TypeScript and production build checks are run after the changes. Pine compiled successfully and both running TradingView alerts delivered real data. The preview displays both connections and the confirmed break. No synthetic market events were posted for testing.
