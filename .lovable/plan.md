

## Fix: Inbox Not Updating in Real-Time on New DM Messages

### Root Cause

The realtime subscription in `AcademyDataContext.tsx` (line 348) only listens for `INSERT` events on `inbox_items`. But the DM notification triggers use UPSERT logic — when a member sends a follow-up message, the trigger **updates** the existing inbox card (changes body, created_at, read_at) rather than inserting a new row. The `UPDATE` event is ignored, so the inbox stays stale showing "3 hours ago."

### Fix

**File: `src/contexts/AcademyDataContext.tsx`** (lines 340-358)

Change the realtime subscription to listen for both `INSERT` and `UPDATE` events on `inbox_items`:

```typescript
// Listen for INSERT (new inbox items)
.on("postgres_changes", {
  event: "INSERT",
  schema: "public",
  table: "inbox_items",
  filter: `user_id=eq.${user.id}`,
}, () => { fetchInbox(); })
// Listen for UPDATE (DM trigger UPSERT updates existing items)
.on("postgres_changes", {
  event: "UPDATE",
  schema: "public",
  table: "inbox_items",
  filter: `user_id=eq.${user.id}`,
}, () => { fetchInbox(); })
```

This covers both sides:
- **Admin side**: when a member sends a DM, the trigger updates the admin's existing inbox card → `UPDATE` event fires → inbox refreshes
- **Member side**: when admin sends a DM, the trigger updates the member's existing inbox card → `UPDATE` event fires → inbox refreshes

### What This Does NOT Touch
- InboxDrawer UI — no changes
- Thread resolution logic — no changes
- The `dm_thread_id` fix we just built — untouched

### Files to Change
| File | Change |
|------|--------|
| `src/contexts/AcademyDataContext.tsx` | Add `UPDATE` event listener to the realtime channel (lines 340-358) |

