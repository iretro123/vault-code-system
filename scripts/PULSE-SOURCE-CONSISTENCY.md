# Pulse source consistency — October 1, 2026

## Confirmed defect and deployed correction

The capture worker selected the legacy SPY study while QQQ used the shared study. The legacy source gates buySignal/sellSignal with Show Signals; those same variables delete used zones. Shared source only gates drawing markers. Therefore hiding markers can change legacy zone lifetime. The actual legacy saved input was not read, so this is not proof of its setting value.

Live legacy SPY5 returned supply 766.26–766.50 while the feed/shared study returned no zone. Capture now requires the shared study on both symbols, shows it, hides legacy, and reads only its Data Window row. Missing shared data fails rather than falling back. A read waits for all four shared zone fields, not an enclosing or hidden legacy row. Exact bounds, timeframe, quote, freshness, and before/after checks remain unchanged. No alert snapshot changed in this deployment.

The repository legacy Pine file also separates marker display from signal logic; that file edit is NOT automatically installed on TradingView.

## Why a browser restart is not the complete fix

TradingView alerts are independent saved snapshots of script, inputs and chart context. Editing a chart or source does not update an existing alert. Recreate alerts from the same saved source/settings, with generation-specific routes so older deliveries cannot overwrite the new source.

The current shared script also reads unfinished 15-minute close/EMA values through request.security. These values can differ after a reload. A continuously running server alert and a chart that switches symbols/timeframes can consequently disagree. This is a documented mechanism, not proof it caused the specific 11:18–11:28 QQQ incident. Dataset revisions and different historical starting points can also affect results.

Sources:
- https://www.tradingview.com/pine-script-docs/faq/alerts/#if-i-change-my-script-does-my-alert-change
- https://www.tradingview.com/pine-script-docs/concepts/repainting/#repainting-requestsecurity-calls
- https://www.tradingview.com/pine-script-docs/concepts/repainting/#dataset-variations

## Prepared v2 candidate — NOT installed or Pine-compiled

`scripts/vault-zone-pulse-multi-v2-staged.pine` is deliberately separate from the running source. It:
- uses prior confirmed HTF close/EMA with the documented [1] + lookahead_on pair (never lookahead_on without the offset);
- uses same-timeframe chart values directly and rejects lower-timeframe bias;
- commits pivot/zone creation, signal removal and invalidation only on confirmed chart candles;
- keeps quotes, location changes and heartbeat delivery intrabar at the existing rate limits;
- explicitly uses New York for the signal session;
- includes a numerical revision readout and version/settings in webhook payloads.

This changes trading semantics: a new 5m/15m zone becomes official at its candle close. Intrabar moves through an existing zone remain live. This is not a zero-delay screenshot promise. The candidate does not eliminate provider corrections, outages, historical dataset differences or screenshot latency.

## Required cutover, not yet completed

1. Compile v2 in the EXISTING hosted session and compare confirmed-bar behavior to a recorded dataset. No extra TradingView browser or account session.
2. Install the same revision and exact inputs for SPY/QQQ 5m/15m. Keep standard candles, session/data adjustment context identical. Verify chart revision and settings against alert payloads.
3. Add receiver enforcement/persistence of sourceRevision/sourceConfig and generation-specific routes before accepting v2. Current receiver does not enforce these new fields. Stage shadow deliveries without member notifications.
4. Recreate all four alerts from that installed source; editing the chart alone is insufficient. Atomically retire old routes when verified replacement heartbeats arrive. Keep rollback available.
5. Switch capture's exact study title/readout to v2 and enforce revision/config equality. Current deployed capture still targets the existing shared v1 title.
6. Verify real new-zone, entry, exit and removal events, genuine matching images, save/reload agreement, and member delivery for both symbols/timeframes. Do not synthesize market events to claim success. No-zone probes alone cannot prove this.

Do not activate this candidate piecemeal during an unresolved capture incident. Never loosen validation or draw replacement zones to conceal disagreement. Preserve source warnings and genuine prior images with their original timestamps.

## Additional confirmed capture timeout defect

A QQQ operator trace returned TargetCloseError after session 3,668 ms + viewport 271 ms + timeframe 12,848 ms + framing 10,714 ms + source 270 ms = 27,771 ms. The connection watchdog was configured to close the actual transport at 28,000 ms, regardless of whether work was progressing. That explains failures at different later stages; it was not proof of account logout.

The intermediate 34-second budget still failed on a slower QQQ5 cold switch. Browser work now has 50 seconds inside a 60-second exclusive database lease; ten seconds remain for disconnect/result persistence. Both queued capture and operator claim leases were migrated together, preserving all other function logic. The immediate HTTP fast path still passes its explicit 22-second limit and durable queue retries remain active. This does not increase the 90-second event freshness limit or remove the six-second individual-command timeout. A fake-timer regression verifies a 45-second capture is not killed and the connection still closes by 50 seconds.

After the intermediate deployment, the QQQ15 probe completed in approximately 33 seconds, with genuine demand 736.91–739.35 matching the live alert. Member UI independently loaded the original 2350×1438 image for that zone (captured 13:31:50 ET). This earlier member image was produced before the watchdog-budget deployment, so it must not be presented as proof of post-deployment latency. The successful 13:40 operator image is separate and not attached to the older event.

## Paused-capture queue gap fixed

A genuine QQQ5 zone arrived at 13:45:55 while maintenance capture was paused. The old AFTER INSERT trigger skipped creating a capture row entirely. Enabling capture later could not repair a nonexistent job. The existing genuine event was queued without changing its event time; the normal fresh-feed exact-zone recovery produced a `refresh` image at 13:48:15. Its member image loaded at 2350×1438 with that actual later timestamp.

Migration `20261001175000_pulse_queue_while_paused.sql` now durably queues fresh events even when execution is paused. The claim function still refuses to run while disabled, and expired original events still require the existing exact-active-zone refresh path. The SQL rollback test verifies queued-during-pause, no execution while paused, and rejection of old replay events. No test fixture was committed. This does not synthesize event-time images or attach operator-probe images to member events.

Final live sample: QQQ5 chart/feed demand743.01–743.76, QQQ15 demand736.91–739.35; SPY5/15 feeds empty, matching the earlier shared-study probes. All four feeds continued receiving. Earlier QQQ intermittent disagreement remains unproven as resolved until the source/alert migration and reload/event tests above are completed.
