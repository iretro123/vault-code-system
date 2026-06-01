## What's actually happening

After this user signs in, two problems pile on top of each other:

1. **The Academy still loads briefly, then errors out.** The basic_tier check (`useIsBasicTier`) runs its own Supabase query *inside* `AcademyLayout`. While that single query is in flight, `isBasicTier` is `false`, so the layout proceeds to mount and kicks off ~30 Academy queries. The redirect to `/basic` then races against everything, and the page flashes "all areas" before it eventually fires.

2. **"Something went wrong" + reload loop.** A lazy route chunk fails to import (`TypeError: Importing a module script failed`) — visible in the console. The `ErrorBoundary` catches it and just renders a static "Reload page" button with no auto-recovery, so it sticks. While the boundary keeps re-mounting, in-flight Supabase fetches get aborted, which is why the network panel shows every request as `Load failed` at the exact same timestamp.

So the fix is two surgical changes, not a redesign.

## Plan

### 1. Route basic_tier users *before* Academy mounts (no extra query)

`AuthContext` already loads `userRole.role` for the signed-in user. Use that synchronously instead of a second round-trip.

- `src/hooks/useIsBasicTier.ts` — read `userRole` from `useAuth()` directly. Return `{ isBasicTier: userRole?.role === 'basic_tier', loading: authLoading }`. Drop the separate `user_roles` query entirely. One fewer race condition, one fewer failing request.
- `src/App.tsx` — add a tiny `<BasicTierRedirect>` wrapper around the Academy/Vault OS routes. As soon as `userRole.role === 'basic_tier'` is known, `<Navigate to="/basic" replace />` *before* `AcademyLayout` ever mounts. That kills the "all areas flash" and the cascade of failing Academy queries.
- `src/components/BasicTierGate.tsx` — same source-of-truth swap (read from `useAuth().userRole`), so the `/basic` side stays consistent.
- Keep the existing redirect inside `AcademyLayout` as a defensive fallback. No data model changes, no RLS changes.

### 2. Auto-recover from stale lazy-chunk imports

After a redeploy, an old tab can request a JS chunk hash that no longer exists → `Importing a module script failed`. Today the ErrorBoundary just shows a button. Fix it once, properly:

- Add `src/lib/lazyWithRetry.ts` — wraps `React.lazy` so that on a chunk import error it does **one** `window.location.reload()` (guarded with a sessionStorage flag so we never reload-loop).
- `src/App.tsx` — swap every `lazy(() => import(...))` for `lazyWithRetry(() => import(...))`. No behavior change on the happy path.
- `src/components/ErrorBoundary.tsx` — if the error message includes `Importing a module script` / `ChunkLoadError` / `Failed to fetch dynamically imported module`, trigger the same one-time reload automatically instead of showing the error card. Card stays as the fallback for genuine app errors.

### 3. After the change

- Re-test by signing in as `appreview+1778972025@vault.dev`. Expected: lands on `/create-account` → sign-in → goes straight to `/basic` with zero Academy chrome visible, no "Something went wrong".
- Existing non-basic users (operator / vault_access / etc.) are unaffected — the wrapper is a no-op for them.

## Files touched

- `src/hooks/useIsBasicTier.ts` — read role from AuthContext, remove standalone query
- `src/App.tsx` — add `BasicTierRedirect` wrapper around protected routes; switch to `lazyWithRetry`
- `src/components/BasicTierGate.tsx` — read role from AuthContext
- `src/components/ErrorBoundary.tsx` — auto-reload once on chunk import errors
- `src/lib/lazyWithRetry.ts` — new helper (small)

## Out of scope

- No database migrations, no RLS changes, no UI redesign.
- `AcademyLayout`'s own basic_tier redirect stays as a safety net.
- No changes to the `/basic` pages themselves.
