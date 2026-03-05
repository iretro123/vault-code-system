

## Plan: Fix Coach Chat Auth Failure

### Root Cause
Both `coach-chat` and `instant-answer` edge functions use `supabase.auth.getClaims(token)` for JWT validation. This method **does not exist** in supabase-js v2. It was added during the previous security hardening pass and causes a runtime error, which returns an "Unauthorized" response before the AI call ever happens.

### Fix
Replace `getClaims(token)` with `supabase.auth.getUser()` in both edge functions. Since the Supabase client is already initialized with the user's Authorization header, `getUser()` will validate the JWT and return the authenticated user.

### Changes

**`supabase/functions/coach-chat/index.ts`** (lines 69-76):
Replace the `getClaims` block with:
```ts
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  return 401 Unauthorized response;
}
```

**`supabase/functions/instant-answer/index.ts`** (lines 48-55):
Same fix — replace `getClaims` with `getUser()`.

### Files Modified
- `supabase/functions/coach-chat/index.ts`
- `supabase/functions/instant-answer/index.ts`

