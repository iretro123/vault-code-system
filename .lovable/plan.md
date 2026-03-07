

## Fix: John Doe Can't See Full Chat History

### Root Cause

In `InboxDrawer.tsx` line 131, the member's thread lookup uses the wrong user ID:

```typescript
const memberId = item.sender_id || user.id;
```

When John Doe (the member) opens his inbox DM, `item.sender_id` is the **admin's ID** (the admin sent the welcome notification). So `findThreadByUser(adminId)` searches for a `dm_thread` where `user_id = adminId` — that thread doesn't exist. It then creates a **brand new empty thread** with `user_id = adminId`, so John Doe sees an empty/wrong conversation.

Meanwhile, the real thread (with all the messages) has `user_id = johnDoeId`.

### Fix

One line change in `InboxDrawer.tsx` line 131. The member should **always** use their own `user.id` to find their thread, since `dm_threads.user_id` is always the member's ID:

```typescript
// Before (broken):
const memberId = item.sender_id || user.id;

// After (fixed):
const memberId = user.id;
```

This ensures John Doe looks up the thread where `user_id = his own ID`, which is the same thread the admin sees and messages into.

### Cleanup

There may be an orphan thread created with `user_id = adminId` from the bug. No migration needed — it will just be empty and harmless.

