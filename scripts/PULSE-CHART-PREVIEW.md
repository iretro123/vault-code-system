# Pulse chart preview

Open `/pulse-design.html` on the local Vite server. This entry uses the same `PulseChartPost` component as `ZonePulseCard`, with saved SPY captures and preview-only reactions. It does not connect to the receiver or post to members.

The displayed 5m and 15m images in `src/pulse-design/assets` are unmodified TradingView exports of **Vault Zone Pulse - Live Feed**, saved September 25, 2026 at 10:21:58 AM and 10:21:21 AM ET respectively. Neither displayed an active shaded zone at capture time. Neutral chart checks contain no zone prices or entry overlays. September 24 captures remain archived but are no longer displayed.

These are snapshots and do not refresh automatically; the preview says so and links to the live TradingView chart. TradingView disconnected the browser during capture work because another session opened in Safari. A browser snapshot is not a permanent live data connection.

- The original screenshot is the default. Do not replace it with drawn or generated candles.
- Optional entry examples are separate SVG overlays, explicitly labeled as examples. They do not establish a live confirmation.
- An overlay must match both the exact image URL and its native dimensions. A new capture resets the example.
- The full-size viewer always shows the original, without markup. Actual size starts centered and supports panning across the full capture on mobile.
- Missing or failed screenshots never fall back to a reconstructed chart.

The existing hosted receiver still has its separate SPX500 symbol contract. This UI change does not migrate its alerts to SPY, deploy a new capture worker, or publish a member-wide reactions backend.
