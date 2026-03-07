

## Bulletproof DM Thread Resolution

### The Problem Today

The DM system has **one critical fragile point**: when a user clicks an inbox notification to open a DM conversation, the code must figure out *which thread to open*. Currently it uses `sender_id` from the inbox notification to guess — and this guess can break in multiple scenarios:

1. **Admin clicks a member's DM notification** — `sender_id` = member's ID, so `hasRole("operator") ? item.sender_id : user.id` works
2. **Member clicks admin's DM notification** — `sender_id` = admin's ID, so it uses `user.id` (correct)
3. **But if `sender_id` is null** (system notifications, edge cases) — operator path falls back to `user.id` (admin's own ID) → creates orphan thread
4. **UPSERT trigger reuses inbox items** — when admin sends multiple DMs, the trigger updates the *same* inbox card. If the inbox item was originally from a different source (e.g. coach ticket reply using the same `sender_id`), clicking it could resolve the wrong thread

### The Fix: Store `dm_thread_id` on `inbox_items`

Instead of guessing the thread from `sender_id`, **store the thread ID directly** on the inbox notification. No guessing, no role checks, no fragile lookups.

**1. Database migration — add `dm_thread_id` column to `inbox_items`**
```sql
ALTER TABLE inbox_items ADD COLUMN dm_thread_id uuid REFERENCES dm_threads(id) ON DELETE SET NULL;
```

**2. Update both DM notification triggers to include `dm_thread_id`**

- `notify_user_on_operator_dm()` — when admin sends a DM, the trigger already has `NEW.thread_id`. Store it on the inbox item.
- `notify_operators_on_dm_message()` — when member sends a DM, store `NEW.thread_id` on the operator's inbox item.

Both triggers do UPSERT (update existing or insert new). The UPDATE path must also set `dm_thread_id`.

**3. Update `InboxDrawer.tsx` — use `dm_thread_id` directly when available**

```typescript
// Line 130-136 becomes:
if (item.dm_thread_id) {
  // Direct link — no lookup needed
  setThreadId(item.dm_thread_id);
  setInitializing(false);
} else {
  // Fallback for legacy inbox items without dm_thread_id
  const memberId = hasRole("operator") ? (item.sender_id || user.id) : user.id;
  let id = await findThreadByUser(memberId);
  if (!id) id = await getOrCreateThread(memberId);
  setThreadId(id);
  setInitializing(false);
}
```

**4. Update `InboxItem` type** in `AcademyDataContext` to include `dm_thread_id?: string | null`

**5. Update inbox data fetcher** to include `dm_thread_id` in the select query

### Files to Change

| File | Change |
|------|--------|
| Database migration | Add `dm_thread_id uuid` column; update both DM trigger functions |
| `src/components/academy/InboxDrawer.tsx` | Use `dm_thread_id` when available, fallback to current logic |
| `src/contexts/AcademyDataContext.tsx` | Add `dm_thread_id` to `InboxItem` type and fetch query |
| `src/hooks/useInboxItems.ts` | Add `dm_thread_id` to mapping |

### What This Covers

| Scenario | Before | After |
|----------|--------|-------|
| Admin sends DM to member | Fragile `sender_id` lookup | Direct `dm_thread_id` link |
| Member replies to admin DM | Works (uses `user.id`) | Direct `dm_thread_id` link |
| Auto-DM welcome message | Fragile `sender_id` lookup | Direct `dm_thread_id` link |
| `sender_id` is null | Breaks (creates orphan) | Direct `dm_thread_id` link |
| Ask Coach ticket | Separate system (unaffected) | Separate system (unaffected) |
| Old inbox items without `dm_thread_id` | N/A | Graceful fallback to current logic |

### What About "Ask Coach"?

"Ask Coach" uses `coach_tickets` — a completely separate system with its own UI in `CoachDrawer.tsx`. It does NOT create `dm_threads`. The inbox notifications it creates have `link: '/academy/my-questions'`, which navigates to the questions page rather than opening a DM thread. So it's already safe and unaffected.

