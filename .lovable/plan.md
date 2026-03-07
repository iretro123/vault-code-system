

## Fix: Admin DM Replies Reach Users + Realtime Everywhere

### Problem 1: Admin replies never reach the user
When you reply to "John Doe" in Admin Panel → DMs, the message inserts into `dm_messages` correctly. But the user has no way to know — there's no inbox notification created for them. The user only sees DMs when they manually open their inbox and click the original welcome message.

### Problem 2: No realtime updates
Neither the admin DMs tab nor the user inbox auto-refreshes. Both require manual page reload to see new messages.

### Solution

**A. New DB trigger: `notify_user_on_operator_dm()`**
- Fires `AFTER INSERT ON dm_messages`
- If the sender IS an operator (reverse of the existing trigger), create an `inbox_items` row for the thread's `user_id`
- Type: `"coach_reply"`, title: "You have a new message from {admin_name}", link: null (so clicking opens the inline thread view)
- Sets `sender_id` to the operator's UUID so the RZ avatar appears
- This ensures every admin reply in the DMs tab generates a visible inbox notification for the user

**B. Realtime subscription for user inbox (`AcademyDataContext.tsx`)**
- Subscribe to `postgres_changes` on `inbox_items` filtered by `user_id=eq.{userId}`
- On INSERT event, call `refetchInbox()` to pull the new item with full sender data
- This makes new notifications appear instantly (within seconds) without page refresh

**C. Realtime subscription for admin DMs (`AdminDMsTab.tsx`)**
- Subscribe to `postgres_changes` on `dm_threads` for new/updated threads
- Auto-refresh the thread list when `last_message_at` changes
- The individual thread conversation already has realtime via `useThreadMessages`

### Changes

| What | Where |
|------|-------|
| New trigger function `notify_user_on_operator_dm()` + trigger | DB migration |
| Enable realtime on `inbox_items` table | Same migration |
| Add realtime subscription to inbox | `src/contexts/AcademyDataContext.tsx` |
| Add realtime subscription to admin DM list | `src/components/admin/AdminDMsTab.tsx` |

