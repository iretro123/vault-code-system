

## Fix: Persistent Dismiss for Inbox + What's New

### Root Cause

Two distinct bugs cause dismissed items to reappear:

**Bug 1 — Broadcast inbox items (`user_id = NULL`) can't be deleted or updated.**
The `inbox_items` DELETE RLS policy is `auth.uid() = user_id`. When `user_id` is NULL, the check always fails silently. Same for UPDATE (mark read). So when a user clicks X on a broadcast item (announcement, new module, etc.), it vanishes from local state but the DB call fails — and it comes right back on refresh/login.

**Bug 2 — Personal items delete works, but the localStorage cache re-seeds stale data.**
On mount, `AcademyDataContext` seeds state from `localStorage` cache before fetching. If a user dismisses an item and the page reloads before the fresh fetch completes, the cached (stale) list flashes the old item momentarily.

### Solution

**1. Database: Create `inbox_dismissals` table**

Simple per-user tracking table:
- `user_id uuid`, `inbox_item_id uuid`, `dismissed_at timestamptz`
- Primary key on `(user_id, inbox_item_id)` — one dismiss per user per item
- RLS: users can INSERT and SELECT their own rows only

This handles broadcast items (shared rows that can't be deleted) by recording that *this user* dismissed *this item*.

**2. Update `AcademyDataContext.tsx` — `fetchInbox`**

After fetching inbox items, also fetch the user's `inbox_dismissals`. Filter out any items whose ID appears in the dismissals set before setting state and writing to cache.

**3. Update `AcademyDataContext.tsx` — `dismissInboxItem`**

- If the item has `user_id === user.id` (personal): keep the existing hard-delete (works with RLS)
- If the item has `user_id === null` (broadcast): INSERT into `inbox_dismissals` instead
- Either way, remove from local state + update cache immediately

**4. Update `AcademyDataContext.tsx` — `markInboxRead` / `markAllInboxRead`**

For broadcast items where UPDATE fails due to RLS, track read state via `inbox_dismissals` with a `read_at` column (or just treat dismiss as the action). Since the current UX uses dismiss (X button) as the primary action and "mark all read" auto-fires on panel close, the simplest fix is: for broadcast items, insert a dismissal record when marking read.

### Files

| What | Where |
|------|-------|
| Create `inbox_dismissals` table with RLS | DB migration |
| Update fetch/dismiss/markRead to handle broadcasts | `src/contexts/AcademyDataContext.tsx` |

No changes to `InboxDrawer.tsx` or `NotificationsPanel.tsx` — the UI already calls the right functions, only the underlying data logic needs fixing.

