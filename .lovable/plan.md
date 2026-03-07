

## Realtime Read Receipts + Online Presence for DM System

### Current State
- **Read receipts exist** but are NOT realtime — `read_at` is set via `markThreadRead()` but the sender's UI only sees it on next fetch/reload, not instantly
- **Realtime subscription** exists for new message INSERTs only — does NOT listen for UPDATEs (read_at changes)
- **Online presence** does NOT exist — `useOnlineStatus` only checks browser network status, there's no user-level presence tracking
- No `last_seen_at` column or presence channel anywhere in the codebase

### Changes

**1. Realtime read receipt updates (`useDirectMessages.ts`)**
- Add a realtime subscription for `UPDATE` events on `dm_messages` (same channel), so when the other side marks messages as read, `read_at` updates flow instantly to the sender's UI
- When UPDATE payload arrives, merge the updated `read_at` into the local messages state
- Both InboxDrawer and AdminDMsTab already render read receipts from message data — they'll update automatically once the hook pushes updated state

**2. Auto-mark-as-read on thread open (both sides)**
- **InboxDrawer**: Already calls `markThreadRead` in useEffect — ensure it fires immediately on mount AND on every new incoming message
- **AdminDMsTab**: Same pattern — already has `markThreadRead` in useEffect on `messages.length` change
- Add: also mark the inbox_item as read when opening a DM thread (call `markRead` from `useInboxItems`)

**3. Show read timestamp instead of just "Read"**
- Update read receipt rendering in both `InboxDrawer.tsx` and `AdminDMsTab.tsx` to show "Read · 2m ago" format using `formatDistanceToNow`
- Apply to the last outgoing message in each conversation

**4. Online presence system (new)**
- **Database**: Add `last_seen_at timestamptz` column to `profiles` table
- **Heartbeat hook** (`usePresenceHeartbeat.ts`): New hook that updates `profiles.last_seen_at` every 60 seconds while the user is active. Uses `visibilitychange` + interval to pause when tab is hidden
- **Presence display**: Add a green/gray dot indicator next to the member name in:
  - AdminDMsTab thread header (admin sees if member is online)
  - InboxDrawer thread header (member sees if admin is online — always show admin as "online" or use admin's last_seen_at)
- **Online threshold**: User is "online" if `last_seen_at` is within the last 3 minutes
- **Realtime for presence**: Subscribe to `postgres_changes` on `profiles` for `last_seen_at` updates on the specific user being viewed — gives instant green dot toggle

### Files to create/modify
- **Create** `src/hooks/usePresenceHeartbeat.ts` — heartbeat interval + visibility listener
- **Modify** `src/hooks/useDirectMessages.ts` — add UPDATE subscription for read_at changes
- **Modify** `src/components/academy/InboxDrawer.tsx` — show "Read · time", green dot presence
- **Modify** `src/components/admin/AdminDMsTab.tsx` — show "Read · time", green dot presence  
- **Migration**: `ALTER TABLE profiles ADD COLUMN last_seen_at timestamptz;`

### Technical Notes
- Heartbeat updates `profiles.last_seen_at = now()` — profiles table already allows users to update own row
- The UPDATE realtime subscription uses the same channel as INSERT to avoid extra connections
- Green dot: `h-2.5 w-2.5 rounded-full bg-emerald-500` with subtle ring, gray when offline

