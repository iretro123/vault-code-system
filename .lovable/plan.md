

## Fix: Make DM Chat Feel Like Real-Time Texting (Zero Delay)

### Problems Found

1. **Sender sees delay on their own message**: `sendDmMessage()` awaits the DB insert, then the realtime subscription delivers it back. No optimistic message — the sender stares at a spinner for 200-500ms per message.

2. **Inbox list updates are slow**: Every new DM triggers `fetchInbox()` which does a full query + profile join. For rapid-fire texting, this means N full re-fetches firing in quick succession, causing lag and stale timestamps.

3. **No throttle/debounce on inbox refetch**: If 5 messages arrive in 3 seconds, 5 full `fetchInbox()` calls fire simultaneously.

### Fix Plan

**1. Add optimistic messages to DM chat** (`src/components/academy/InboxDrawer.tsx`)

When the user hits Send, immediately append a local optimistic message (with a temp ID like `optimistic-{timestamp}`) to the messages array. Clear draft instantly. When the realtime INSERT arrives with the real message, replace the optimistic one (match by sender_id + body, same pattern used in `useRoomMessages`).

Changes to `InlineThreadView.handleSend`:
- Before calling `sendDmMessage`, create an optimistic message object and append it to a local `optimisticMessages` state
- Display `[...messages, ...optimisticMessages]` in the chat
- When realtime INSERT arrives, remove matching optimistic message

**2. Add optimistic message support to `useThreadMessages`** (`src/hooks/useDirectMessages.ts`)

Add an `addOptimisticMessage` function returned from the hook. The realtime INSERT handler already deduplicates by ID — extend it to also remove optimistic messages (match by `id.startsWith("optimistic-")` + same `sender_id` + same `body`).

**3. Debounce inbox refetch** (`src/contexts/AcademyDataContext.tsx`)

Instead of calling `fetchInbox()` directly on every realtime event, debounce it with a 500ms window. This collapses rapid-fire DM notifications into a single refetch.

**4. Optimistic inbox timestamp update** (`src/contexts/AcademyDataContext.tsx`)

When realtime UPDATE fires on `inbox_items`, before the full refetch, immediately update the local `created_at` of the matching item to `now()` so the "3 hours ago" text updates instantly.

### Files to Change

| File | Change |
|------|--------|
| `src/hooks/useDirectMessages.ts` | Add `addOptimisticMessage` + optimistic dedup in realtime handler |
| `src/components/academy/InboxDrawer.tsx` | Use optimistic messages in `handleSend` for instant display |
| `src/contexts/AcademyDataContext.tsx` | Debounce `fetchInbox` on realtime events + optimistic timestamp update |

### What This Achieves
- Messages appear **instantly** for the sender (no spinner wait)
- Receiver sees messages via realtime with no change (already works)
- Inbox list updates without N redundant fetches during rapid texting
- Timestamp in inbox list updates immediately, not after a full refetch

