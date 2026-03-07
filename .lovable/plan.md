

## Fix: One Persistent Thread Per Member

### The Bug (2 lines cause everything)

1. **`InboxDrawer.tsx` line 106**: `findThreadByUser(user.id)` — when admin clicks a notification from John Doe, `user.id` is the **admin's** ID, not John Doe's. This finds nothing, so it creates a new thread with `user_id = admin_id`.

2. **`useDirectMessages.ts` line 169-173**: `getOrCreateThread` filters by both `user_id` AND `inbox_item_id`. Different inbox items for the same user create separate threads.

### Changes

**1. DB migration**
- Delete duplicate/orphan `dm_threads` (threads where `user_id` is an operator, or duplicates per member — keep the one with most messages)
- Add `UNIQUE` constraint on `dm_threads(user_id)` to enforce 1 thread per member at DB level

**2. `src/hooks/useDirectMessages.ts`**
- Simplify `getOrCreateThread(userId)` to look up by `user_id` only (drop `inbox_item_id` param)
- Add `findOrCreateThreadForMember(memberId)` helper for admin use

**3. `src/components/academy/InboxDrawer.tsx`**
- Fix line 106: when user is admin and item has `sender_id`, use `item.sender_id` (the member) instead of `user.id` (the admin) for thread lookup
- This ensures admin always opens the member's single existing thread

**4. `src/components/admin/AdminDMsTab.tsx`**
- Add last-message body preview in thread list rows
- Add unread indicator dot on threads with unread messages

### Result
- 1 user = 1 thread, enforced by DB unique constraint
- Admin clicking any notification opens the correct member's thread
- No more duplicate threads regardless of inbox item changes
- Clean iMessage-style admin inbox

