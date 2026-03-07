

## Fix: Admin and Member See Different Messages in DM

### Root Causes Found (5 Problems)

**Problem 1 — Ghost message from inbox item (MAIN ISSUE)**
In `InboxDrawer.tsx` line 178-181, `InlineThreadView` prepends the inbox notification item as a fake "original" message:
```typescript
const allMessages: ChatMsg[] = [
  { id: "original", body: item.body, sender_id: item.sender_id || "admin", created_at: item.created_at },
  ...messages,
];
```
This inbox_item body (the auto-DM welcome text) is NOT a dm_message — it's a notification. The admin side (`AdminDMsTab`) only renders actual `dm_messages`. So the member sees an extra ghost message at the top that the admin never sees, causing the conversation to look different on both sides.

**Problem 2 — Presence dot tracks wrong user on member side**
In `InlineThreadView` (line 192), `<PresenceDot userId={item.sender_id} />` tracks the sender of the inbox notification. For auto-DM welcome messages, `item.sender_id` is the admin's ID — which is correct in this case. But for other inbox item types (coach_reply, reminders), `sender_id` might be null or wrong. The presence should track a known admin user, not whatever `item.sender_id` happens to be.

**Problem 3 — Member side doesn't directly open dm_threads**
The member's DM view is triggered through the InboxDrawer by clicking an inbox_item notification. It then does `findThreadByUser(user.id)` to locate the thread. This works now after our fix, but the approach is fragile — it depends on the inbox item existing. If the inbox item is dismissed/deleted, the member loses access to their DM thread entirely.

**Problem 4 — Read receipt comparison uses inbox item's sender_id**
Line 212: `const isMe = m.sender_id === user?.id;` — This is correct for real dm_messages. But the ghost "original" message (Problem 1) has `sender_id: item.sender_id || "admin"`, so it shows as "not me" for the member. If the member was actually the sender of the inbox item, the alignment would be wrong.

**Problem 5 — Orphan threads from the previous bug may still exist**
The earlier bug (`memberId = item.sender_id || user.id`) may have created orphan threads with `user_id = adminId`. The unique constraint migration cleaned duplicates per `user_id`, but an orphan thread for the admin's user_id could still exist, cluttering the admin's thread list with a self-thread.

### Fix Plan

**Fix 1 — Remove the ghost message (the main fix)**
In `InlineThreadView`, stop prepending the inbox item as a fake first message. Only render actual `dm_messages` from `useThreadMessages`. Both sides will then see identical messages.

**Fix 2 — Clean up orphan threads**
Run a migration to delete any `dm_threads` where `user_id` belongs to an operator (same pattern as the earlier cleanup migration, in case new orphans were created).

### Files to modify
- `src/components/academy/InboxDrawer.tsx` — Remove the ghost message prepend (lines 176-181), render only `messages` from the hook. Both admin and member will see the exact same dm_messages.
- Database migration — Delete orphan threads where user_id is an operator

### Result
Admin and member will see the exact same conversation. No ghost messages, no message count mismatch. The auto-DM welcome message already exists as an actual `dm_message` (inserted by the `notify_user_on_operator_dm` trigger), so removing the fake prepend won't lose any content.

