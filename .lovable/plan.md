

## Fix: Admin and Member See Different Threads (Split Thread Bug)

### Root Cause

The previous fix changed line 131 in `InboxDrawer.tsx` from `item.sender_id || user.id` to just `user.id`. This fixed the **member** side but broke the **admin** side:

- **Admin opens DM:** `user.id` = admin's ID (`6f863212`) → `findThreadByUser("6f863212")` → finds the **orphan thread** (wrong) instead of John Doe's real thread
- **Member opens DM:** `user.id` = member's ID (`a73a6567`) → `findThreadByUser("a73a6567")` → finds the correct thread

### Current Database State

Two threads exist:
- **Thread `31b7410a`** — `user_id = a73a6567` (John Doe) — contains ALL real conversation (OK, Yes, ok, you there?, hello?111, hello, hi there)
- **Thread `eae278e6`** — `user_id = 6f863212` (admin!) — orphan with only "ho" and test messages

The previous orphan cleanup migration only deleted threads where the user_id matched someone with an `operator` role in `user_roles`. But this thread has `user_id = 6f863212` who IS the operator — so it should have been deleted. Either the migration ran before the thread was created, or there was a timing issue.

### Fix Plan

**1. Fix thread lookup logic in `InboxDrawer.tsx` (line 131)**

The correct logic: if the current user is the one who sent the inbox notification (`item.sender_id === user.id`), they are the member — use `user.id`. Otherwise, the current user is the admin viewing a member's message — use `item.sender_id` (the member's ID).

```typescript
// If I'm the sender of this inbox item, I'm the member — use my own ID
// If someone else sent it (member → admin notification), use their ID to find their thread
const memberId = (item.sender_id && item.sender_id !== user.id) 
  ? item.sender_id 
  : user.id;
```

This handles both cases:
- Admin sees inbox item from John Doe: `item.sender_id = johnDoeId ≠ adminId` → uses `johnDoeId` → finds correct thread
- Member sees inbox item from admin (welcome DM): `item.sender_id = adminId ≠ memberId` → wait, this would use adminId again...

Actually, let me reconsider. The real logic should be: `dm_threads.user_id` is always the **member** (non-operator). So:
- If the current user is an operator → the member is `item.sender_id` (the person who sent the notification to admin)
- If the current user is NOT an operator → the member is `user.id` (themselves)

We can use `hasRole('operator')` or `hasMinRole('operator')` from `useAuth()`.

```typescript
const memberId = hasRole('operator') ? (item.sender_id || user.id) : user.id;
```

**2. Database cleanup — delete the orphan thread**

SQL migration to delete orphan threads where `user_id` belongs to an operator, and move any real messages to the correct thread:

```sql
-- Move messages from orphan admin thread to the real John Doe thread
UPDATE dm_messages 
SET thread_id = '31b7410a-3bc0-4c59-b236-782e40ca08ca'
WHERE thread_id = 'eae278e6-7e10-45cc-b071-45c2271b874d';

-- Delete the orphan thread
DELETE FROM dm_threads 
WHERE id = 'eae278e6-7e10-45cc-b071-45c2271b874d';
```

This restores the "ho" message and test messages into the correct thread so both sides see everything.

### Files to Change
- `src/components/academy/InboxDrawer.tsx` — Fix line 131 to use role-aware thread lookup
- Database migration — Move messages and delete orphan thread

### Result
- Admin and member will see the exact same conversation with all messages
- The "ho" and test messages will be merged into the correct thread
- Future thread lookups will correctly use the member's ID regardless of who's viewing

