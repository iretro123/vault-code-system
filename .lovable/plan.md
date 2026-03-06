

## Why Mentions Don't Work (Simple Explanation)

**Line 301 of `RoomChat.tsx`:**
```ts
const canMention = isCEO || isAdmin || isAcademyOperator || isOperator;
```

This line says: "Only let CEOs, Admins, and Operators use @mentions." Regular members get `false`, so when they type `@`, nothing happens. The autocomplete is completely turned off for them.

There's also a second problem: even if we flip this switch, the `useMentionAutocomplete` hook queries the `profiles` table directly. RLS on `profiles` only lets users read **their own** profile. So a regular user would get an empty list of people to mention anyway.

**Two locks on the door. Both need to be opened.**

---

## Plan

### 1. Database migration — Create `get_mention_users()` function
A security-definer function that returns only `user_id`, `display_name`, `username`, `avatar_url` from profiles. Safe because it exposes no sensitive data (no email, no phone). Bypasses RLS so all authenticated users get results.

### 2. Update `src/hooks/useMentionAutocomplete.ts`
- Change `fetchAllUsers()` to call the new `get_mention_users()` RPC instead of querying `profiles` directly
- Add a `canPingEveryone` option — when `false`, filter out the `@everyone` suggestion

### 3. Update `src/components/academy/RoomChat.tsx` (line 301)
- Change `canMention` to `!!user` (all logged-in users can mention)
- Add `canPingEveryone` flag that stays admin/CEO/operator-only
- Pass `canPingEveryone` to the hook

### Files
1. New DB migration — `get_mention_users()` security-definer function
2. `src/hooks/useMentionAutocomplete.ts` — use RPC, add `canPingEveryone` filter
3. `src/components/academy/RoomChat.tsx` — unlock mentions for all users, restrict `@everyone`

