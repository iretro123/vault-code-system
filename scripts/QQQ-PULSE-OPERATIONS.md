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

## October 1, 11:30 ET follow-up: readiness is degraded

Fresh heartbeats on all four streams do not prove current chart agreement. QQQ 5m server alerts report supply 739.29–740.83 while an authenticated hosted operator check found both zone pairs empty. Its observed event at 11:08 has a genuine saved chart; later 11:18–11:28 entries/exits failed exact-zone validation. The member screen retains the exact-zone 11:08 original with its actual timestamp. QQQ 15m real observed/retired events and recent SPY15 events captured successfully.

Before the October 1 health migration, `capture_connected` conflated capture success with content mismatches. The deployed health migration separates these states. UI must say capture needs attention rather than asserting a disconnected browser. Preserve the warning and exact-zone checks. Do not mark QQQ screenshots fully healthy from quote freshness or a no-zone operator probe.

Investigate alert-snapshot/chart settings and higher-timeframe repainting before changing trading logic: the shared source uses unconfirmed request.security values, which TradingView documents can differ after a chart reload. This is a candidate explanation for the verified divergence, not a proven diagnosis. Fixing it may alter zone selection and requires explicit validation; do not silently loosen screenshot validation or substitute a generated zone.

Charts are event snapshots. New zone/state events enqueue captures, and a scheduled queue retries missing images for still-active exact zones. Successfully captured event images are not continuously replaced on a timer. Feed heartbeats and liquidity captures are separate.

## October 1 health hardening and recovery backup

Image health is now tracked separately per symbol/timeframe in `pulse_capture_health`. A successful idle browser probe or SPY screenshot cannot clear QQQ image failures. Connection health remains separate. Failure evidence stores only exact expected/observed numeric zone bounds; it never stores raw chart text, cookies, or URLs. Existing CEO incident alerts are deduplicated separately for each symbol/timeframe.

Encrypted cookie recovery expires at the fixed `CAPTURE_LOGIN_APPROVED_UNTIL` deadline (October 29, 00:00 UTC, within the original September 29 thirty-day authorization). Refreshing cookies does not renew authorization. An expired backup cannot launch another browser. Existing session use and normal bounded Connect behavior remain separate.

Operator recovery copies can be exported with `scripts/pulse-backup.py`: provide a reviewed database manifest of genuine image IDs, the existing private bindings file, and an output directory. The script verifies PNG signatures, size and SHA-256, keeps capture/event timestamps, and refuses to overwrite a differing image. It never includes credentials in the backup. The October 1 export contains seven genuine saved images plus database-function rollback definitions; this is a point-in-time local backup, not continuous independent cloud replication. Online images still use private Cloudflare KV with 30-day retention.

Do not erase the 11:18–11:28 QQQ mismatch from the incident history. At 11:35 the zone retired and later empty-zone probes agreed; that does not establish a fix to the intermittent indicator recalculation problem. No Pine rules or server-alert snapshots were changed by this health deployment.


## October 1 automatic independent archive and study isolation

Capture Worker scheduled runs now copy up to ten registered original images per minute from Cloudflare KV to a private Supabase archive, outside Cloudflare. No extra TradingView browser is used. The archive preserves immutable bytes, SHA-256, event/zone/timeframe identity, capture context and original timestamp. It accepts PNG and older JPEG originals without converting images. Retries are persisted with five-minute backoff; an archive failure cannot stop alert receipt or browser captures. Operator preflight images and session secrets are not archived. No automatic archive deletion is configured. Monitor archive size and unresolved archive checks; this is application-level second-copy protection, not a full database/PITR backup.

The existing signed image endpoint tries KV first, then the independent archive on a miss or outage. Signature validation remains first. The archive is not publicly readable and its RPCs require the existing private worker token. Recovery validates magic bytes, size, MIME and checksum; it never substitutes another image. SQL integration fixtures roll back. A real archived 239,702-byte original was recovered with an exact SHA-256 match while simulating a primary-store outage; no primary image was deleted for testing.

The hosted layout has both legacy SPY and shared SPY/QQQ studies attached. Capture now shows the intended study and hides the other for each symbol, through TradingView's existing legend controls. It excludes enclosing Data Window rows containing both studies. Operator diagnostics return only each study's numeric bounds and visibility state. This avoids displaying two competing studies, but does NOT by itself fix divergent indicator settings or historical recalculation.

Live checks after isolation: QQQ5 and QQQ15 report no zone, consistent with fresh feeds. SPY15 reports the exact 760.16–762.18 supply reported by its alert. SPY5 legacy still reports the old 766.26–766.50 supply while the shared study and alert feed report none. No local TradingView tab was opened. Actual legacy inputs have not yet been read: the hosted viewer rejected fractional iframe coordinate input when opening settings. The owner was asked to check Show Signals in that existing session. In the legacy Pine, this display-sounding input also gates signal-triggered deletion; the shared production code separates display from the underlying signal. This is a concrete candidate, not a proven setting mismatch.

Remaining choices, in order: (1) verify and align the saved legacy study inputs with its server-alert snapshot; (2) standardize both symbols on the shared study with versioned replacement SPY alerts after proof, retiring old deliveries before activation; (3) separately test confirmed higher-timeframe inputs or a persistent multi-pane layout in ONE hosted session to reduce reload recalculation. Do not change trading rules silently, open a competing local session, claim a no-zone probe proves every future zone, or weaken exact-zone checks to make a failure disappear.

## October 1 source-selection correction (supersedes per-symbol legacy selection)

Capture now requires the existing shared SPY/QQQ study for BOTH symbols, hides legacy, and reads only the shared Data Window row. It waits for all four bounds fields. It never falls back to stale legacy values when shared data is missing. Source-name metadata prefers shared when both legend names are present. Exact-zone/freshness validation remains in force. Initial SPY15 and SPY5 live probes match fresh empty feeds; these prove current alignment, not future zone-event or repainting correctness.

See `PULSE-SOURCE-CONSISTENCY.md` for the verified legacy code difference, TradingView's alert-snapshot/repainting documentation, and the separately staged v2 confirmed-zone candidate. The v2 source is NOT installed, Pine-compiled, or accepted by a version-enforcing receiver. Do not represent the live capture-selection correction as a complete source/alert migration. Existing alert snapshots have not changed.
