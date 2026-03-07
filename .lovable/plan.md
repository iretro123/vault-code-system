

## Root Cause: Why Admin Inbox Shows Multiple Cards Per User

### The Problem (with proof)

The UPSERT trigger only collapses messages when an **unread** (`read_at IS NULL`) inbox item exists. Here's what happens:

1. John Doe sends "hello?111" → trigger inserts new inbox item (no existing unread)
2. Admin opens inbox, clicks John Doe's card → `markRead()` sets `read_at` on that item
3. John Doe sends "hello" → trigger looks for unread items from John Doe → finds **none** (the old one is now read) → inserts a **new** card
4. Admin opens again → marks read again
5. John Doe sends "hi there." → another new card

This creates the exact spam pattern you see in your screenshot: 3 separate cards from the same person.

### 5 Reasons Why It IS Happening

1. **UPSERT filter is too strict** — `read_at IS NULL` means once you view a message, the next one always creates a new card
2. **`markRead` fires immediately on open** — the moment you click into a thread, all inbox items get marked read, breaking the UPSERT lookup
3. **No concept of "conversation" in inbox_items** — each inbox item is standalone; there's no `thread_id` linking items to a DM thread
4. **Multiple old items persist** — the dedup cleanup only removed exact duplicates, not items that were already read
5. **The user side works fine because** the user only has ONE inbox item from the admin (sender_id = admin), so the UPSERT finds it and updates it correctly — the admin is the one getting flooded because they read items between messages

### 5 Reasons Why Previous Fixes Couldn't Work

1. **UPSERT logic was correct in isolation** — it does collapse unread items; the flaw is the read/unread lifecycle
2. **Dedup cleanup ran once** — it removed duplicates at that moment but can't prevent future ones created by the read-then-new-message cycle
3. **Trigger function is deployed correctly** — verified in `pg_proc`, the UPSERT code is live
4. **User-side inbox works fine** — proves the trigger logic itself isn't broken, just the filter condition
5. **The real fix was never attempted** — changing from `read_at IS NULL` to a broader "find any recent item from this sender" lookup

### The Fix

**Change the UPSERT trigger to always update the most recent inbox item from the same sender, regardless of read status.** Drop the `read_at IS NULL` filter entirely. This means:

- John Doe sends 5 messages → always ONE card in admin inbox
- Admin reads it → card stays (gets updated on next message)
- Admin dismisses/deletes it → next message creates a fresh card (correct behavior)

Apply the same fix to all three notification triggers: `notify_operators_on_dm_message`, `inbox_on_coach_reply`, `notify_operators_on_new_ticket`, and `notify_user_on_operator_dm`.

Also clean up existing duplicate inbox items from John Doe (delete all but the most recent per sender).

### Changes

| Target | What |
|--------|------|
| DB migration | Remove `AND read_at IS NULL` from all 4 trigger functions' UPSERT lookup. Also reset `read_at` to `NULL` on update (so the card re-appears as unread when a new message arrives). |
| DB data cleanup | Delete duplicate inbox items per sender, keep only the most recent |
| No frontend changes | The inbox UI already handles everything correctly |

### Key SQL Change (applied to all triggers)
```sql
-- BEFORE (broken):
WHERE user_id = _op.user_id AND sender_id = NEW.sender_id
  AND type = 'coach_reply' AND read_at IS NULL

-- AFTER (fixed):
WHERE user_id = _op.user_id AND sender_id = NEW.sender_id
  AND type = 'coach_reply'
-- + reset read_at to NULL so it shows as unread again
UPDATE ... SET read_at = NULL, title = ..., body = ..., created_at = NOW()
```

