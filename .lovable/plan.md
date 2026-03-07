

## Fix: Admin Inbox — One Persistent Thread Per Member

### Confirmed Root Cause (from live data)

There are currently **2 threads** in the database:
- Thread `31b7...` → `user_id = John Doe` → **9 messages** (correct, this is the real thread)
- Thread `511e...` → `user_id = RZ (admin)` → **0 messages** (orphan, created by the bug)

The orphan was created because **line 106 of `InboxDrawer.tsx`** calls `findThreadByUser(user.id)` where `user.id` is the **admin's** ID when the admin clicks a notification from John Doe. This finds nothing for John Doe, then `getOrCreateThread(user.id, item.id)` creates a new thread with `user_id = admin`.

The trigger functions (checked live) are now correctly collapsing inbox items — only **1 inbox card** per sender exists. The duplicate thread problem is purely in the frontend lookup logic.

### Changes

**1. Database migration**
- Delete the orphan thread (`user_id = admin`)
- Add `UNIQUE` constraint on `dm_threads(user_id)` to prevent future duplicates

**2. `src/hooks/useDirectMessages.ts`**
- Simplify `getOrCreateThread(memberId)` — remove `inboxItemId` param, look up by `user_id` only
- Add `findOrCreateThreadForMember(memberId)` convenience function

**3. `src/components/academy/InboxDrawer.tsx` (line 106)**
- When current user is admin and item has `sender_id`, use `item.sender_id` (the member) for thread lookup instead of `user.id` (the admin)
- This is the single line that causes all the duplication

**4. `src/components/admin/AdminDMsTab.tsx`**
- Add last-message body preview text in thread list rows
- Add unread indicator dot for threads with unread messages

### Key fix (1 line)
```typescript
// BEFORE (line 106):
let id = await findThreadByUser(user.id);
// AFTER:
const memberId = item.sender_id || user.id;
let id = await findThreadByUser(memberId);
```

