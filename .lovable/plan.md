

## Fix: Onboarding Stuck in Infinite Loop — Real User Affected

### Root Cause Found

The `handleActivate` function in `AppOnboarding.tsx` (line 163-177) tries to write **`first_name`** and **`last_name`** to the `profiles` table — but **those columns don't exist**. The table only has `display_name`.

PostgREST rejects the entire update when it encounters unknown columns. Because the code uses `as any` to bypass TypeScript and doesn't check the update response for errors, the failure is completely silent. The critical flags `profile_completed` and `onboarding_completed` never get set to `true`.

Result: every time the user finishes onboarding and hits "Activate", nothing actually saves. When they reload, the gate check on line 143 sees `!profileCompleted && !onboardingCompleted` → shows onboarding again. Infinite loop.

This user (goldringtransportation@gmail.com) has completed onboarding 3 times. Their profile still shows `profile_completed: false`, `onboarding_completed: false`.

### Fix (2 parts)

**1. Code fix — `AppOnboarding.tsx`**

Remove `first_name` and `last_name` from the update payload. The `display_name` field already combines them. Also add error checking on the update response so failures aren't silent.

```ts
// Before (broken)
await supabase.from("profiles").update({
  first_name: firstName,    // ← DOES NOT EXIST
  last_name: lastName,      // ← DOES NOT EXIST
  display_name: displayName,
  ...
} as any)

// After (fixed)
const { error: updateErr } = await supabase.from("profiles").update({
  display_name: displayName,
  timezone: detectedTz,
  role_level: roleLevel,
  academy_experience: roleLevel,
  trading_goal: goal || null,
  profile_completed: true,
  onboarding_completed: true,
  avatar_url: avatarUrl || null,
}).eq("user_id", user.id);

if (updateErr) throw updateErr;
```

**2. Data fix — Unblock the stuck user**

Database migration to set `profile_completed = true` and `onboarding_completed = true` for this user so they can access the dashboard immediately without re-doing onboarding a 4th time.

```sql
UPDATE profiles
SET profile_completed = true, onboarding_completed = true, updated_at = now()
WHERE user_id = '817547b7-2739-45bf-8a3b-0c3c3d817f1e';
```

### Files

| File | Change |
|------|--------|
| `src/components/onboarding/AppOnboarding.tsx` | Remove non-existent `first_name`/`last_name` columns, add error handling |
| Database migration | Unblock stuck user by setting completion flags |

