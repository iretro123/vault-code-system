

## 1:1 Direct Messages (Reply to Welcome DM)

### Current State
Right now, inbox items are **one-way notifications** — users see the message, click to navigate, or dismiss. There is no reply button, no conversation thread, and no way for a user to respond back to an admin/coach. No DM or conversation tables exist yet.

### What Needs to Happen

To give users a "Reply" button on the welcome DM (and any admin message) that creates a private 1:1 thread visible to both the user and the admin/coach side, we need:

**1. Database: New `dm_threads` + `dm_messages` tables**

- `dm_threads` — one row per conversation between admin and a user
  - `id`, `user_id` (the member), `admin_id` (who initiated / assigned), `created_at`, `last_message_at`, `inbox_item_id` (optional link to the original inbox item that started it)
  
- `dm_messages` — individual messages within a thread
  - `id`, `thread_id`, `sender_id`, `body`, `created_at`, `read_at`

- RLS:
  - Users can only see threads where `user_id = auth.uid()`
  - Operators / manage_notifications permission holders can see all threads
  - Both parties can insert messages into threads they belong to

- Enable realtime on `dm_messages` so replies appear instantly

**2. Inbox: Add "Reply" button to welcome DM items**

When a user clicks on a `reminder`-type inbox item (like the welcome DM), instead of just navigating away, open an **inline thread view** inside the inbox panel:
- Show the original message as the first bubble
- Show a text input + send button at the bottom
- User types a reply → inserts into `dm_messages` → creates a `dm_thread` if one doesn't exist yet
- Pressing back returns to the inbox list

**3. Admin side: New "DMs" tab in Admin Panel (or Broadcast page)**

Add a "DMs" tab that shows:
- List of all active 1:1 threads (user name, last message preview, timestamp)
- Click a thread → see full conversation + reply input
- Unread indicator for threads with new user messages
- This reuses the same `dm_messages` table, filtered by operator permission

**4. Notifications**

When a user replies, insert an `inbox_item` for the admin (type `dm_reply`) so it shows up in the admin's inbox too. When admin replies back, insert for the user.

### Changes

| What | Where |
|------|-------|
| Create `dm_threads` + `dm_messages` tables with RLS + realtime | DB migration |
| Add reply/thread view to inbox panel when clicking a DM item | `src/components/academy/InboxDrawer.tsx` |
| Add "DMs" tab to Admin Panel for admin-side thread view | `src/pages/academy/AdminPanel.tsx` + new `AdminDMsTab.tsx` component |
| Hook for DM data (threads, messages, send, mark read) | New `src/hooks/useDirectMessages.ts` |

### Scope Note
This is a meaningful new feature (private messaging). The core tables + reply flow from inbox + admin DM tab would be the V1. No group DMs, no file attachments in DMs for now — just text replies in a 1:1 thread.

