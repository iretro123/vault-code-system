

## Plan: Fix admin kick/ban — two root causes

### Problem 1: RLS blocks admin from updating other users' profiles
The `profiles` table UPDATE policy is `auth.uid() = user_id` — only the owner can update their own profile. When an admin clicks "Remove" or "Ban", the `.update({ access_status: "revoked" })` call silently fails (no rows updated), so nothing happens.

### Problem 2: `student_access` lookup uses wrong column
The code does `.eq("user_id", userId)` where `userId` is the auth UUID. But `student_access.user_id` references `students.id` (an internal ID), not `auth.users.id`. So even if RLS allowed it, the update matches zero rows.

### Solution

**1. Database migration — add operator UPDATE policy on `profiles`**
```sql
CREATE POLICY "Operators can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'operator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'operator'::app_role));
```

**2. Fix `student_access` revocation in `AdminMembersTab.tsx`**
Instead of `.eq("user_id", userId)`, first look up the `students.id` for the given `auth_user_id`, then update `student_access` using that internal ID:
```ts
const { data: student } = await supabase
  .from("students")
  .select("id")
  .eq("auth_user_id", userId)
  .maybeSingle();

if (student) {
  await supabase
    .from("student_access")
    .update({ status: "canceled" })
    .eq("user_id", student.id);
}
```

Apply this fix in both `handleKick` and `handleBan`.

### Files
1. **Database migration** — add operator UPDATE policy on `profiles`
2. **`src/components/admin/AdminMembersTab.tsx`** — fix `student_access` lookup to use `students.id` via `auth_user_id`

