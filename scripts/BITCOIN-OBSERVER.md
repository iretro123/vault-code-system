# Supervised scheduled chart observer — local only

This procedure is NOT enabled simply because this file exists. A scheduled agent
must actually execute it. Periodic visual checks can miss brief price touches.

- Source: existing Codex in-app browser tab https://www.tradingview.com/chart/Uvf4q57J/.
  Use ONLY the in-app browser. Never use Safari or Chrome, OS screenshots of those
  apps, or their cookies. Discover tool tab IDs from the current browser inventory.
- Leave the original Vault Trading Academy - Supply And Demand indicator and all
  scripts/settings/saved layouts untouched. Never add a replacement indicator.
- Discover the Codex browser tab by exact TradingView URL. Do not inspect unrelated
  tabs. Keep browser windows open. Respect active user interaction.
- If TradingView shows its **Session disconnected** dialog, click **Connect** in the
  Codex in-app browser immediately, then verify that the dialog is gone before
  resuming observation. This is the approved recovery path for the user's own
  TradingView session. Never use Safari or Chrome to recover the session. Mark the
  monitor paused only when reconnecting fails or the chart cannot be verified.
- Verify COINBASE:BTCUSD, the visible original indicator, and 5m or 15m interval.
  Track each timeframe separately. Missing 5m coverage must not be called monitored.
- Read `.vault-zones-state/observer-state.json` if it exists. Compare current chart
  with previous per-timeframe screenshot and the feed's last real observation.
- Capture only the chart, including symbol/timeframe, price scale and attribution.
  Determine current geometry on each run; never reuse a crop after resize. Inspect
  the resulting PNG before posting. Exclude other tabs and personal information.
  If position sizes, P&L, account information or order overlays are visible, withhold
  the screenshot and report the privacy obstruction. Never click an order, cancel,
  close-position control or change trading settings to prepare a capture.
- Describe only clear visual facts: baseline zone, newly appearing zone, current
  price inside, wick touching, or zone no longer visible. Disappearance is not proof
  of a break. Never claim a confirmed break without completed-candle evidence.
- First observation is a baseline, not a newly formed zone. Do not guess exact
  prices/boundaries, confidence, trading instructions, or continuous coverage.
- Post only meaningful changes; unchanged checks are silent. Match each update to
  its previous zone and timeframe. Do not infer a touch between captures.
- Use beginner-friendly updates: "Bitcoin · 15-minute demand. Price touched the
  area and bounced back above it" rather than unexplained jargon. Describe forming
  candles as "this candle hasn’t finished yet." Describe invalidation as "a candle
  finished below demand / above supply." Never promise trading success or invent
  targets, stop prices, confidence, or risk/reward from screenshots. The UI provides
  three educational rules about reaction, planned loss/stop, and reward versus risk.
- Keep each future summary to one or two short sentences, ideally under 20 words.
  No long explanations, repeated ticker/timeframe paragraphs, or extra coaching.
  Put learning rules in the existing expandable UI, not in every update.
- For a follow-up, send zoneId equal to the original post's ID. Preserve the original
  chart and append new screenshot updates below it, not as unrelated new setups.
- Delivered means a visible reaction, not profit: after a verified touch, require a
  completed candle back outside the zone on the expected side before marking a
  completed reaction (above demand's upper edge / below supply's lower edge).
  Invalidation requires a completed candle beyond the opposite boundary (below
  demand's lower edge / above supply's upper edge). These are observer criteria,
  never edits to the indicator. An unfinished candle is only a reaction in progress.
  If the completed candle or boundary is unclear, leave status unconfirmed.
- Prefer TradingView's Take a snapshot > Download image in the Codex browser.
  Inspect the actual downloaded PNG, with symbol/timeframe and attribution intact.
- Chart presentation preference (supersedes earlier crop/landscape experiments):
  match the first verified chart window, 1048 × 1395, for subsequent captures.
  Every inline chart uses that same aspect ratio and available width; follow-ups
  must not have extra indentation that makes their charts smaller. Always contain
  the complete image, never crop, stretch, zoom, or omit candles/price labels.
  Existing different-shaped originals stay intact with padding. Future captures
  should match the first capture's viewport proportions before capture, not via
  image stretching afterward. If this cannot be achieved with supported browser
  controls, report that limitation. Keep full-original expansion available.
- Continue scheduled checks without needing another user message. Follow the same
  zone until verified reaction delivery or invalidation, post its final update
  once, then seek a distinct new zone. Do not repeatedly announce the same finished
  zone as new. Preserve prior evidence; automatic UI archiving is not implemented.

## Local posting

Repository: `/Users/user/Documents/New project/vault-os-codex`.
Read the admin token privately at runtime from `.vault-zones-state/credentials.json`.
Never print it or send it outside loopback. POST `http://127.0.0.1:4181/observation`
using `Authorization: Bearer <admin>` and JSON:

    {id: "visual-<unique lowercase alphanumeric-hyphen identifier>",
     symbol: "COINBASE:BTCUSD", timeframe: 5 or 15, side: "demand" or "supply",
     at: actual capture epoch milliseconds, summary: factual text under 300 characters,
     image: PNG base64}

The image must be fresh (under five minutes old). Verify successful delivery via
GET `http://127.0.0.1:4175/api/bitcoin-zones/`. Never post to production databases,
member chats, or push notifications. Do not fabricate a replacement image on failure.

Use apply_patch to retain per-timeframe last successful check time, screenshot path,
observed zone/price relationship, last posted ID and any failure in the ignored
`.vault-zones-state/observer-state.json`. A successful scheduler invocation alone is
 not a successful chart check. If logged out, wrong symbol, obstructed, unreadable,
 stale, user-busy, or still disconnected after the approved reconnect: skip claims,
 record failure and notify the user.

Notify only on meaningful verified zone changes, monitoring failure or required user
action. No routine no-change messages. Mac and services must remain available.
