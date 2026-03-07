

## Fix: Inbox DM Reply Flow + Show RZ Name and CEO Badge

### Problems

1. **User can't open reply for `coach_reply` items** — The `handleClick` function (line 475) only opens the inline thread for `type === "reminder"`. Admin reply notifications have `type === "coach_reply"`, so clicking them does nothing (no link set either, so it's a dead click).

2. **Thread lookup fails for admin reply notifications** — `getOrCreateThread` uses `inbox_item_id` to find/create a thread. When a user clicks a `coach_reply` notification, that notification's `id` is different from the original welcome DM's `id` that the thread was created against. So it creates a NEW empty thread instead of finding the existing one.

3. **"Vault Academy" shown instead of "RZ" + CEO badge** — In `InlineThreadView`, the sender label is hardcoded as `"Vault Academy"` (lines 148, 173) with no role badge. Should show the sender's actual name ("RZ") and their CEO badge.

### Solution

**A. Allow `coach_reply` type to open inline thread** (InboxDrawer.tsx, `handleClick`)
- Change the condition from `item.type === "reminder"` to include `coach_reply`: `if (item.type === "reminder" || item.type === "coach_reply")`

**B. Fix thread lookup for reply notifications** (InboxDrawer.tsx, `InlineThreadView`)
- Instead of using `getOrCreateThread(userId, item.id)` which creates a new thread per inbox item, look up the existing thread directly:
  - Query `dm_threads` for the current user's thread (there should be exactly one per user)
  - If none exists, fall back to `getOrCreateThread` with the item id
- This ensures clicking any DM notification (original or follow-up) opens the same conversation thread

**C. Show "RZ" name + CEO badge in thread bubbles** (InboxDrawer.tsx, `InlineThreadView`)
- Replace hardcoded "Vault Academy" with `item.sender_name || "RZ"` for the sender label
- Add `<AcademyRoleBadge roleName={item.sender_role} />` next to the name
- Apply same treatment to both the original message bubble and incoming thread messages

### Files Changed
- `src/components/academy/InboxDrawer.tsx` — All three fixes in one file
- `src/hooks/useDirectMessages.ts` — Add a `findThreadByUserId` helper function

