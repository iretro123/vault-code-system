# Pulse liquidity preview — not live

This candidate appends a display/learning layer to the existing SPY source. It is not installed on the hosted chart, compiled in TradingView, or connected to member liquidity notifications. Existing source and running alerts remain unchanged. App updates default OFF in the preview to prevent duplicate zone webhook delivery.

## Implemented in candidate source

- Prior completed regular-session daily high/low via offset daily request.
- Confirmed swing references; labels begin when pivots become knowable, not backdated to the pivot.
- Equal high/low pairing of consecutive confirmed pivots using configurable ATR tolerance (not a comprehensive order-pool model).
- Sweep/reclaim: excursion by a minimum tick distance, close back inside, preceding close on the original side. Confirm only at bar close.
- A close beyond the level consumes the reference as a close beyond, not a confirmed reversal/sweep.
- Zone confluence: swept bar overlaps the preceding active supply/demand boundaries and does not close beyond their invalidation edge. This is overlap evidence, not a trade entry or probability.
- Each reference consumed once, bounded references/labels and age-based expiry. Dual-side sweep is explicitly ambiguous; directional confluence alerts suppressed.
- Nearest remaining high/low references displayed as possible areas of interest, not guaranteed targets.
- Timestamped explanation and four optional TradingView alert conditions. These are NOT wired to the production zone webhook.

## Still required before release

1. Compile in Pine v6 and inspect drawings on 5m/15m; hosted browser control was disconnected during this turn.
2. Replay: delayed pivots; strict reclaim versus close beyond; gaps; dual-side bars; equal levels; retired zones; day boundary; holiday/short-session data; disabled layer; restart and reference expiry.
3. Compare all original zone events against unchanged source. New layer must not alter zone generation/deletion semantics.
4. Version liquidity snapshot schema, validate and persist it server-side, enforce entitlement, and implement per-user alert preferences/deduplication/expiry.
5. Recreate affected TradingView alerts with correct frozen script versions only after receiver compatibility. Do not replace existing active alerts prematurely.
6. Observe a real sweep, matching source chart and timestamp, and physical push receipt. No invented backtest success or win rates.

## Product direction

An evidence card should show level type, level price, timeframe, sweep time, close/reclaim status, zone overlap, higher-timeframe context, nearest opposing references, and explicit invalidation. The AI explanation consumes this validated structured evidence and cites it; it must not invent prices, order-book facts, targets or confidence percentages. Add exchange-calendar support and measured outcomes before ranking setups. OHLC cannot prove stops, institutional intent, or execution liquidity.

## References

- User-supplied https://howtotrade.com/wp-content/uploads/2024/03/Liquidity-Sweep-in-Trading.pdf (read all 10 pages via text extraction). Educational inspiration only; no reproduced charts or long prose. Marketing claims about manipulation/probability are not implemented as facts.
- https://www.tradingview.com/pine-script-docs/concepts/repainting/
- https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/
- https://www.tradingview.com/pine-script-docs/concepts/alerts/
