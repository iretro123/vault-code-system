# Pulse production repair — September 25, 2026

## Verified cause

The member app and receiver followed `CAPITALCOM:SPX500`; the local design preview displayed saved SPY screenshots. Those are different instruments and different entry points. Production snapshots were arriving on both timeframes, but every production event lacked an original screenshot. `ZonePulseCard` rendered `PulseCandleChart` as a fallback. No hosted TradingView screenshot service existed.

## Applied repair

- The member feed uses the original-image card. Missing images are explicitly unavailable, never reconstructed candles.
- Source symbol comes from the server and each post. The app never relabels SPX500 history as SPY.
- Event time stays separate from image capture time.
- The member feed returns the last 100 events and listens for updates as well as inserts, so later chart attachments cannot be missed by an event-time cursor.
- Screenshot connection status is separate from indicator freshness.
- SPY tables, membership-protected reads, atomic commits, state and health checks are installed alongside SPX500. Existing deliveries and history remain intact.
- `pulse_feed_current` chooses the explicitly configured member symbol. It must not automatically substitute SPX500 during an SPY outage.

## Pending access and activation

Cloudflare rejected upload of the prepared `vault-spy-pulse` receiver with `No access to the specified resource`. Browser Run access also returned an authentication error. Lovable's editing agent reported no remaining credits. No software subscriptions were purchased and no credentials were copied from a personal browser.

The prepared receiver is `workers/pulse-spy/index.js`. It uses a dedicated delivery capability and a separate scoped database capability; it never receives the Supabase service-role key. Secrets are excluded from Git. Invocation request logging is disabled because webhook paths contain delivery credentials.

SPY is deliberately disabled and `member_symbol` remains `CAPITALCOM:SPX500` until both real SPY alerts deliver successfully. The member screen continues identifying SPX500 accurately. `scripts/vault-zone-pulse-spy.pine` is a separate SPY adapter using the original zone calculations; it still needs compiling and two webhook alerts in TradingView. It does not modify existing SPX alerts.

After Worker deployment access is restored:

1. Deploy the prepared Worker with its four bindings. Enable the private SPY config. Verify unauthorized payload rejection and durable receipt through real TradingView deliveries.
2. Compile/save the SPY Pine copy; create 5m and 15m “Any alert() function call” alerts on SPY with the new webhook destination and after-hours testing disabled. Record their actual expiry times in SPY status.
3. Verify two consecutive automatic deliveries for each timeframe. Check the current instrument and zone bounds. Only then set `pulse_spy_config.member_symbol='AMEX:SPY'`. Rollback is an explicit server choice, never a stale-feed fallback.
4. Finish and authorize a dedicated hosted TradingView browser session and screenshot pipeline. Require the matching Pulse indicator, instrument, timeframe and fresh capture time; never backfill an old event with today's picture. Store images privately, use leased jobs and bounded retries, and alert the operator when capture/authentication fails. This screenshot worker is **not implemented or connected** by the receiver repair.

The current receiver throttle is 15 seconds for changed state, about 60 seconds for unchanged heartbeats, plus candle closes when TradingView receives a tick. It cannot promise every tick or every transient change. Monitoring remains the owner's existing weekday 9 AM–4 PM ET window, not an exchange holiday calendar.

## Validation

41 focused tests, TypeScript, changed-file ESLint and production build pass. Tests cover SPY/SPX receiver isolation, retries/concurrency, lifecycle changes, original image preservation, unavailable images, and distinct event/capture times. Database membership reads of the unchanged live SPX feed were verified. SPY deployment and automatic screenshot completion must not be claimed until the pending steps pass.
