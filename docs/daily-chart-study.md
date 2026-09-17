# Daily Quick Chart Study

Local-only dashboard change. No database migration, paid data subscription, scheduled agent, push, or deployment.

## Daily behavior

One deterministic study per America/New_York calendar date, shared across members with correctly set device clocks. Midnight Eastern changes the study (23/25 hours on DST transition dates, otherwise 24). The open component checks the date each second and on focus/visibility; returning after browser sleep catches up. Reveal state is keyed to the date and resets for the new day. Reloads preserve the daily example, not the revealed answer.

Ten authored scenario slots: demand, supply, bullish structure, bearish structure, highs sweep, lows sweep, bullish FVG, bearish FVG, confirmation, failed demand. Topics recur on a ten-day cycle with deterministic price variations; this is not an unlimited AI-generated lesson library. Source candles and annotations are computed together. FVG boundaries use candle one's and candle three's wick extrema. Liquidity examples explicitly avoid claiming that OHLC reveals actual stops or institutional intent.

All charts are labeled simulated. The existing economic-calendar function mentions Finnhub earnings, but no verified OHLC feed is wired to this feature. Real historical examples would need an approved data source, redistribution rights, instrument/timeframe/session timestamps, and validation of extracted patterns before replacing the simulation label. Do not disguise generated examples as real SPY/QQQ prices.

## References checked

- [CME: support and resistance](https://www.cmegroup.com/education/courses/technical-analysis/support-and-resistance) for previous swing levels.
- [Author's three-candle FVG indicator description](https://www.tradingview.com/script/w23KSvO4-3-Candle-Fair-Value-Gap-Alerts-Highlight/) for the explicit three-candle convention, not evidence of profitability or TradingView endorsement.

## Validation

Three tests cover Eastern calendar boundaries, DST, 30 days of deterministic charts, all ten scenario slots, candle/annotation consistency, sweep and FVG geometry, and automatic midnight rollover with cleared reveal. Vite build passes. No browser visual inspection performed for this change.
