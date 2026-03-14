

# Fix: Signals (and all rooms) can't load messages older than March 11

## Root Cause

The `useRoomMessages` hook fetches **all** messages from a room — including **thread replies** (`parent_message_id IS NOT NULL`) and **soft-deleted** messages (`is_deleted = true`). It fetches 40 per page.

However, `RoomChat` then **filters these out** in the UI:

```tsx
const filteredMessages = messages.filter((msg) => {
  if (msg.is_deleted) return false;
  if ((msg as any).parent_message_id) return false;
  return true;
});
```

So if a room has many thread replies, 40 raw messages might only yield 5-10 visible ones. The pagination cursor advances past all 40, but users only see a few days' worth. Clicking "Load older" fetches the next 40 raw messages — again mostly replies — and eventually runs out, never reaching March 10 or earlier.

## Fix

Add server-side filters to **both** the initial fetch and `loadMore` queries in `useRoomMessages.ts`:

```sql
.is("parent_message_id", null)
.eq("is_deleted", false)
```

This ensures every page of 40 contains **40 visible top-level messages**, so pagination works correctly and users can scroll back as far as messages exist.

### File: `src/hooks/useRoomMessages.ts`

1. **Initial fetch** (line ~72-77): Add `.is("parent_message_id", null).eq("is_deleted", false)` to the query
2. **Load more** (line ~101-107): Add the same two filters to the older-messages query

No other files need changes. The client-side filter in `RoomChat` line 840-843 can remain as a safety net.

