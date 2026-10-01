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
