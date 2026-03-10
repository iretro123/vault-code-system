

## Plan: Production-Grade Community Notifications — COMPLETED

### What was done

**Database:**
- Added monotonic `seq bigint` column to `academy_messages` with auto-increment sequence, backfilled existing rows
- Created `academy_room_reads` table (user_id, room_slug, last_read_seq) with RLS + realtime publication
- Added `sounds_enabled boolean` to `user_preferences`

**`src/hooks/useUnreadCounts.ts`** — Full rewrite:
- DB-backed unread counts via `seq > last_read_seq` (no more localStorage)
- Realtime subscriptions on `academy_messages` (INSERT) + `academy_room_reads` (cross-tab sync) + `user_preferences` (sounds toggle)
- Reconciliation on `visibilitychange` + `window.focus`
- Programmatic two-tone chime (Web Audio API, no external file)
- `setUnreadIsAtBottom()` export for scroll-aware auto-mark-read
- Own messages always filtered out

**`src/hooks/useUserPreferences.ts`** — Added `sounds_enabled` to interface + defaults

**`src/components/settings/SettingsNotifications.tsx`** — Added "Message Sounds" toggle

**`src/pages/academy/AcademyCommunity.tsx`** — No structural changes needed; markRead now persists to DB
