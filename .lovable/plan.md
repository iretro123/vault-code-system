

## Apply 5 Pending Migrations

The 5 migration files from your GitHub push are in the repo but have not been executed against the database. I'll apply them in order using Lovable's migration tool.

### Migrations (in order)

1. **`20260317224000_push_notifications.sql`** — Creates `device_tokens` table with RLS, `notify_ceo_message()` trigger on `academy_messages`, and `push_notify_on_insert()` trigger on `academy_notifications` (for `mention` and `rz_message` types).

2. **`20260317240000_live_session_push_notify.sql`** — Adds `live_notified_at` column to `live_sessions`, creates `notify_live_sessions()` function with a cron job running every minute to auto-notify when scheduled live sessions start.

3. **`20260317240010_push_notify_live_now.sql`** — Updates `push_notify_on_insert()` to also fire for `live_now` notification type.

4. **`20260317243000_disable_live_session_cron.sql`** — Removes the auto cron job from step 2, drops `notify_live_sessions()`, and removes `live_notified_at` column (switching to manual-only live notifications).

5. **`20260317244500_live_now_toggle.sql`** — Adds `is_manual_live` column to `live_sessions`, creates `start_live_now()`, `stop_live_now()`, and `cleanup_live_now()` functions (CEO-only), plus a cron job to auto-end manual sessions after 2 hours.

**Note:** Migration 3 (`notify_live_now_manual.sql` / `20260317243010`) also needs to be applied — it creates the `notify_live_now()` CEO-only function. That makes **6 total** migrations in this order:
1. `224000` → push notifications base
2. `240000` → live session push notify + cron
3. `240010` → add `live_now` to push trigger
4. `243000` → disable auto cron (manual only)
5. `243010` → `notify_live_now()` CEO function
6. `244500` → manual live toggle + cleanup cron

### Dependencies
- Requires `pg_cron` extension (for `cron.schedule`/`cron.unschedule`)
- Requires `pg_net` or `http` extension (for `extensions.http_post`)
- Requires existing `is_academy_ceo()` function
- Requires existing `academy_notifications` and `academy_messages` tables

### Plan
I will run each migration's SQL through the migration tool sequentially, in timestamp order. No code file changes are needed — this is purely database work.

