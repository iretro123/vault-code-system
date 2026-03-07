

## Fix: Admin Inbox Spam + iOS-Style Admin DM Thread

### Root Causes

**1. Every user message creates a separate admin inbox card**
The `notify_operators_on_dm_message` trigger blindly INSERTs a new `inbox_items` row for every single message. 3 messages from John Doe = 3 separate "John Doe sent a message" cards in your inbox. This is the spam you're seeing.

**Fix**: Modify the trigger to UPSERT — if an unread `coach_reply` from the same sender already exists, just update its body/timestamp instead of creating a new row.

**2. Admin thread view (AdminDMsTab) has no iOS styling**
The admin `ThreadConversation` component uses plain boxes with no avatars, no grouping, no bubble tails — completely different from the user's polished `InlineThreadView`. This is why the two sides look different.

**Fix**: Rewrite `ThreadConversation` in `AdminDMsTab.tsx` with the same iOS-style design: avatars next to bubbles, message grouping, asymmetric rounded corners, pill input bar. Show the user's actual profile pic (already available from `thread.user_avatar_url`) and admin's RZ avatar.

**3. Admin thread list shows generic initials, not user profile pics**
The `ThreadList` only renders `AvatarFallback` initials. The user's `avatar_url` is already fetched but never rendered as an image.

**Fix**: Use `ChatAvatar` or `AvatarImage` with `thread.user_avatar_url` in the thread list.

### Changes

| File | What |
|------|------|
| DB migration | Replace `notify_operators_on_dm_message` with UPSERT logic (update existing unread item or insert new) |
| `src/components/admin/AdminDMsTab.tsx` | Rewrite `ThreadConversation` with iOS-style bubbles, avatars, grouping, pill input. Update `ThreadList` to show user profile pics. Import `ChatAvatar` + `AcademyRoleBadge` + `rzAvatar`. |

### UPSERT Trigger Logic (Pseudocode)
```text
ON INSERT dm_messages (from non-operator):
  1. Check if unread inbox_items row exists for this operator
     WHERE sender_id = message.sender_id AND type = 'coach_reply' AND read_at IS NULL
  2. If exists → UPDATE body, title, created_at (bumps to top)
  3. If not → INSERT new row (current behavior)
```

This means rapid-fire messages from John Doe collapse into ONE card that always shows the latest message preview.

