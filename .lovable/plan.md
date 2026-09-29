# Push / notification queue: configuration findings and deployment path

Read-only inspection done. Nothing was edited, applied, deployed or sent.

## Findings

**Secret names present (values not read):**
- APNs: `APNS_BUNDLE_ID`, `APNS_KEY_ID`, `APNS_PRIVATE_KEY`, `APNS_TEAM_ID`
- Firebase HTTP v1: `FIREBASE_SERVICE_ACCOUNT_JSON` (present). `FCM_SERVICE_ACCOUNT_JSON` absent; push-notify accepts either.
- `PUSH_WEBHOOK_SECRET`: present
- Optional `APNS_USE_SANDBOX`: absent, so production APNs is primary with sandbox retry on BadDeviceToken.
- Also present: `CRON_SECRET`, `SWEEP_CRON_TOKEN`, `ECON_CALENDAR_REFRESH_SECRET`.
- No dedicated "Vault push URL" secret exists. The database vault holds **zero** entries.

**Database:**
- Enabled: `pg_cron` 1.6.4, `pg_net` 0.19.5, `supabase_vault` 0.3.1.
- Notification triggers (all enabled):
  - `academy_notifications.push_notify_on_insert` calls push-notify through `net.http_post`. The URL is hardcoded, and the `x-push-secret` value is **written directly into the function body**, not read from vault. Errors are only logged as warnings, so nothing is queued or retried.
  - `academy_notifications.trg_inbox_announcement`
  - `academy_messages`: `academy_messages_ceo_notify`, `academy_messages_guest_signal_notify`
  - `dm_messages`: `trg_notify_operators_dm_message`, `trg_notify_user_on_operator_dm`
- Cron: 10 jobs. `vault-spy-pulse-health` is active and runs the SPY watchdogs. `vault-pulse-health` is inactive. There is no push/queue job yet.

**push-notify deployment:** Lovable can deploy it from the repo (`verify_jwt=false`, checks the shared secret in code). It was last deployed and health-checked with a 401 response when unauthenticated. The idempotency table `notification_push_dispatches` is already used.

## Safe deployment path for the forthcoming commit

1. You send the reviewed commit SHA. Lovable syncs that exact commit into the project through Git. There is no retyping.
2. **Diff check before applying anything:** confirm the commit leaves `workers/pulse-spy/**`, the SPY cron jobs and the `pulse_spy_*` functions/tables alone. The SPY Workers run on Cloudflare and Lovable never deploys them, so syncing their files changes nothing live.
3. **Migration:** submit the commit's SQL file verbatim through the migration tool as one additive transaction (entitlements plus queue table, GRANTs, RLS, worker function). If it conflicts with project rules (for example DROP, rename, or bucket SQL), report it instead of rewriting it.
4. **Secret handoff for the queue worker (prerequisite):** the new cron job and trigger should not embed secrets. Pick one:
   - (a) The cron job posts to a drain function using a new server-side secret name (for example `PUSH_QUEUE_CRON_SECRET`), which would be created with generate_secret. The cron SQL would read that value from the database vault. That requires adding one vault entry by migration, which Lovable can do but cannot read back.
   - (b) Reuse `CRON_SECRET`, following the same pattern as the existing cron jobs.
   Either way, the new trigger should only enqueue rows (no HTTP call), and a cron-driven drain should call push-notify.
5. **Cutover order:** deploy the functions (push-notify plus any drain function), then apply the migration. Then replace `push_notify_on_insert` with enqueue-only behavior in the same migration, so pushes never double-send. The existing `notification_push_dispatches` idempotency guards against duplicates during the switch.
6. **Verification without sending:** check that endpoints return 401 without credentials, that the queue table and cron job exist, and that the old trigger no longer calls `net.http_post`. Do not insert any test notification unless you explicitly approve a single-recipient test.

## Prerequisites / open items
- The exact commit SHA, and whether the drain uses a new secret (4a) or `CRON_SECRET` (4b).
- The hardcoded push secret in the current trigger should be retired by the migration. If the value ever needs rotating, `PUSH_WEBHOOK_SECRET` has to change at the same moment.
- No Cloudflare changes are needed.
