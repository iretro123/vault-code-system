# Pulse liquidity: simple optional view

The private TradingView preview compiles and renders on actual SPY 5m/15m charts. The original live zone indicator and existing alert definitions are unchanged. `Send app updates` remains OFF in this preview.

## Display

- `Show liquidity` defaults OFF. Nearest untouched confirmed swing high above price and swing low below price only: at most two lines.
- Exact wick prices, with the line starting on the originating wick's bar. Detection remains delayed by the confirmation period (default three candles); anchoring is not an earlier signal.
- Plain labels: `Liquidity above` / `Liquidity below` and price. No assumed order quantity, institutional intent, target guarantee, or probability.
- `Show latest sweep` and `Show simple guide` separately optional and OFF. No wall of historic labels. EMAs and BOS default OFF; signal calculation remains unchanged to preserve zone deletion behavior.
- Levels expire or are consumed; strict bar-close return is distinguished from a close beyond. Dual-side sweeps suppress directional confluence. Levels are bounded to 100 internally but only the nearest two are drawn.
- PDF visual examples reviewed on pages 4, 7, 8 and 9: wick swings, equal highs/lows, supply/demand context, return versus continuation. The simple map does not add trendlines, Fibonacci, automatic orders or claimed stops. Same-price confirmed highs/lows share one level.

## Pulse app

`PulseLiquidityChart` defaults OFF and offers a per-chart switch only when a matching private TradingView liquidity capture is provided. It checks the exact base-capture timestamp and maximum 90-second pair gap; changes of timeframe/base capture reset OFF. No screenshot markup is guessed by the frontend. Both versions retain their real capture timestamps, original full-size viewer and signed member-only image URLs.

Migration `20260930033500_pulse_optional_liquidity_view.sql` was applied live. Current closing snapshots for Sep29 4PM have manually captured later chart pairs, clearly labeled as later views. The source images are 960x589 browser chart captures (not the 2350x1438 automatic capture pipeline). Neither old event images nor event timestamps were rewritten.

## Remaining integration / release gates

Automatic future paired liquidity captures are NOT wired into the capture worker or event finish RPC. On new updates with no matching pair, the app hides the switch rather than reusing stale liquidity. No liquidity push notifications are enabled. Before automatic rollout: implement and test both captures in the dedicated hosted session, preserve event-source/freshness validation and serialize capture operations. Restore 2x HD paired captures; the current manual examples are preview quality.

Pine replay still needed: pivot delay/anchor, gaps, exact touch, strict return vs close-beyond, double-side sweeps, stale/consumed levels, zone overlap and restart. Existing zone alerts must not be replaced until parity and receiver compatibility are validated. Native Chrome chart can conflict with hosted capture, so leave it off a chart after previewing.

## Sources

- https://howtotrade.com/wp-content/uploads/2024/03/Liquidity-Sweep-in-Trading.pdf
- https://www.tradingview.com/pine-script-docs/concepts/repainting/
- https://www.tradingview.com/pine-script-docs/concepts/alerts/
