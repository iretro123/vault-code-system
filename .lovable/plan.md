

## Fix: Online Presence Not Showing for Either Side

### Root Causes Found

**Problem 1 — `profiles` table is NOT in the Supabase realtime publication.**
The `useUserPresence` hook subscribes to `postgres_changes` on `profiles`, but since `profiles` was never added to the realtime publication, no UPDATE events are broadcast. The realtime subscription silently does nothing.

**Problem 2 — Members cannot SELECT the admin's profile row (RLS blocks it).**
The current profiles SELECT policy is: `(auth.uid() = user_id) OR has_role(operator)`. When John Doe (a regular member) tries to query the admin's `last_seen_at` via `useUserPresence`, the query returns nothing because RLS blocks it. The admin CAN see John Doe's presence (operators can read all profiles), but John Doe cannot see the admin's.

### Fix

**1. Database migration (two changes):**
- Add `profiles` to the realtime publication so `useUserPresence` realtime subscriptions actually fire
- Add an RLS SELECT policy allowing any authenticated user to read any profile row. This is safe — profiles contain display names, avatars, and presence data that are already shown publicly in chat. Policy: `CREATE POLICY "Authenticated can read profiles for presence" ON profiles FOR SELECT TO authenticated USING (true);`

That's it. No code changes needed — the hooks (`usePresenceHeartbeat` + `useUserPresence`) are already correct, they just can't work because the database blocks them.

**2. Verify the existing SELECT policy won't conflict:**
The current policy `Users can read own profile` uses `USING ((auth.uid() = user_id) OR has_role(...))`. Adding a second permissive SELECT policy with `USING (true)` is fine — Postgres OR's permissive policies together. However since these are RESTRICTIVE (permissive = No), we need to replace the existing one or add a permissive one. The existing policies are restrictive, so we need to add a PERMISSIVE policy instead.

### Result
- Admin sees John Doe's green dot (already works since operators can read all profiles)
- John Doe sees admin's green dot (fixed by new SELECT policy)
- Both sides get instant updates (fixed by adding profiles to realtime publication)

