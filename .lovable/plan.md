

## Production-Grade Community Notifications

This is a full rewrite of the unread system — moving from localStorage timestamps to a DB-backed sequence approach that syncs across devices.

---

### Database Changes (3 migrations)

**1. Add monotonic `seq` to `academy_messages`**
- Add `seq bigint` column with a Postgres sequence as default
- Backfill existing rows ordered by `created_at`
- Create index on `(room_slug, seq)`

**2. Create `academy_room_reads` table**
```
academy_room_reads(
  user_id uuid NOT NULL,
  room_slug text NOT NULL,
  last_read_seq bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, room_slug)
)
```
- RLS: users can SELECT/INSERT/UPDATE own rows only
- Enable realtime publication for cross-tab sync

**3. Add `sounds_enabled` boolean to `user_preferences`**
- Default `true`

---

### Rewritten `useUnreadCounts.ts`

Replace current localStorage-based system entirely:

- **On mount**: Query unread count per room via `academy_messages.seq > academy_room_reads.last_read_seq` (one query per room, or a single RPC)
- **Realtime subscriptions**:
  - `academy_messages` INSERT → if `msg.user_id !== currentUser` and `msg.room_slug` is tracked, increment that room's count (unless room is active + user at bottom)
  - `academy_room_reads` UPDATE (filter by current user) → re-sync counts from the updated seq (handles cross-tab/device sync)
- **`markRead(slug)`**: Upsert `academy_room_reads` with the latest `seq` from that room. Optimistically set count to 0.
- **Reconciliation**: On `visibilitychange` (tab focus) and Supabase channel reconnect, re-fetch all counts from DB
- **Global store**: Keep `useSyncExternalStore` pattern — sidebar and community tabs share the same state
- **Remove all localStorage unread logic** (`unread_ts_*` keys)

---

### Sound System

- Store a royalty-free notification chime as a static asset (`/public/sounds/notify.mp3`)
- In the realtime INSERT handler, after incrementing count:
  - Check `user_preferences.sounds_enabled`
  - Check `document.hasFocus()` — only play when app is in foreground but room is not active
  - Use `new Audio()` with `.play().catch()` to respect autoplay policy
  - If app is in background + browser Notification API is granted, show a web notification instead
- No sound for own messages (already filtered)
- No sound if the active room is the one receiving the message and user is at the bottom

---

### Community Page Changes (`AcademyCommunity.tsx`)

- Pass a `isAtBottom` signal to the unread system (from the chat scroll container)
- On tab switch, call `markRead(newSlug)` which now upserts to DB
- Badge rendering stays the same (already working)

---

### Sidebar Changes

- No structural changes needed — already consumes `useUnreadCounts(null, userId)` correctly

---

### Files Modified/Created

| File | Action |
|------|--------|
| Migration: add `seq` to `academy_messages` | New |
| Migration: create `academy_room_reads` | New |
| Migration: add `sounds_enabled` to `user_preferences` | New |
| `public/sounds/notify.mp3` | New (royalty-free chime) |
| `src/hooks/useUnreadCounts.ts` | Full rewrite |
| `src/hooks/useUserPreferences.ts` | Add `sounds_enabled` to interface |
| `src/pages/academy/AcademyCommunity.tsx` | Minor — remove localStorage read-state logic |
| `src/components/layout/AcademySidebar.tsx` | No changes needed |

