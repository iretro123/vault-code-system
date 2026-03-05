

## Plan: Fix re-adding deleted users — `allowed_signups` row blocks re-insert

### Problem
When `admin-delete-user` runs, it resets `allowed_signups.claimed = false` but **keeps the row**. When the admin tries to re-add the same email, the INSERT hits a **unique constraint** (error 23505) and shows "This email is already on the whitelist."

The user was deleted from every other table, but the `allowed_signups` row persists — blocking re-registration.

### Solution (two changes)

**1. `supabase/functions/admin-delete-user/index.ts`**
Change the `allowed_signups` handling from `update({ claimed: false })` to a full `DELETE` of the row. This ensures the email is completely gone after a user deletion.

**2. `src/components/admin/AdminMembersTab.tsx`**
As a safety net, change the "Add User" form from a plain `.insert()` to an **upsert** (`.upsert()` with `onConflict: 'email'`). If a stale row somehow remains, it gets overwritten instead of throwing a duplicate error.

### Files
1. `supabase/functions/admin-delete-user/index.ts` — change `update` to `delete` for `allowed_signups`
2. `src/components/admin/AdminMembersTab.tsx` — change `.insert()` to `.upsert()` on the add-user form

