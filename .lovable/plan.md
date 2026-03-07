

## Implementation: Fixes #1, #2, #3, #5 (skipping #4)

### 1. QueryClient — sensible defaults (`src/App.tsx`)
Replace `new QueryClient()` with configured defaults:
- `staleTime: 60_000` — data fresh for 60s, no redundant refetches
- `retry: 1` — one retry instead of three
- `refetchOnWindowFocus: false` — prevent surprise refetches

### 2. Session expiry recovery (`src/components/layout/AcademyLayout.tsx`)
Add a `useEffect` that watches `user` after hydration. If `user` was previously truthy and becomes `null`, redirect to `/auth` with a "Session expired" toast. Uses a `hadUser` ref to track.

### 3. Login spinner (`src/pages/Auth.tsx`)
Replace `{loading ? "Loading..." : "Sign In"}` with a proper `Loader2` spinner + "Signing in..." text, matching the pattern already used on the forgot-password button.

### 5. Offline indicator (`new hook + AcademyLayout`)
- Create `src/hooks/useOnlineStatus.ts` — listens to `online`/`offline` window events, returns a boolean.
- Add a thin amber banner at the top of `AcademyLayoutInner` (inside the header or above it) when offline: "You're offline — some features may not work."

### Files changed
| File | Change |
|------|--------|
| `src/App.tsx` | Configure QueryClient defaults |
| `src/pages/Auth.tsx` | Add Loader2 spinner to sign-in button |
| `src/hooks/useOnlineStatus.ts` | New hook for online/offline detection |
| `src/components/layout/AcademyLayout.tsx` | Add session-loss redirect + offline banner |

