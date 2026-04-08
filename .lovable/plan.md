
## Fix: Tab Switch Still Feels Like a Full Refresh

### What I checked
I inspected the current app flow and tested the live preview state on `/academy/home`.

What I found:
- The dashboard is rendering, but the app is still heavy on resume.
- Current performance profile shows a cold boot cost around:
  - `250 scripts loaded`
  - `~2.4MB JS`
  - `~5.5s first contentful paint`
- That means if the browser discards the tab while the user is away, coming back feels like a full app reload.
- On top of that, several parts of the app independently refetch when the tab becomes visible again.

### Root causes
This is now a **2-layer issue**, not just `useSmartRefresh`:

1. **Cold resume / tab discard**
   - `src/App.tsx` eagerly imports many pages up front.
   - Heavy global components are mounted early.
   - If the browser suspends or discards the tab, the app restarts and users see the full boot/loading experience again.

2. **Resume refetch storm**
   Multiple features still listen for `visibilitychange` / `focus` and all refetch at once:
   - `src/hooks/useUnreadCounts.ts`
   - `src/hooks/useRoomMessages.ts`
   - `src/hooks/useDailyVaultStatus.ts`
   - `src/components/academy/dashboard/ActivityTicker.tsx`
   - plus global refresh in `src/hooks/useSmartRefresh.ts`

3. **Duplicate access/permission requests**
   - `useStudentAccess()` is used in layout, header, pages, settings, etc.
   - `useAcademyPermissions()` is also fetched repeatedly.
   - This creates repeated access checks right when the app resumes.

4. **Full-screen auth/layout fallback still shows on cold boot**
   - `AcademyLayout` only avoids flashing after hydration within the same JS session.
   - If the tab is discarded, that memory is gone, so users still see a full-screen loading state again.

### Implementation plan

#### 1. Centralize all “tab came back” behavior into one soft-resume system
Create a single resume coordinator and stop each feature from doing its own visibility refresh.

Changes:
- Keep one global visibility/online handler in `src/hooks/useSmartRefresh.ts` or move to a dedicated `useAppResume` hook.
- Remove direct resume listeners from:
  - `src/hooks/useUnreadCounts.ts`
  - `src/hooks/useRoomMessages.ts`
  - `src/hooks/useDailyVaultStatus.ts`
  - `src/components/academy/dashboard/ActivityTicker.tsx`
- Replace them with either:
  - passive stale checks, or
  - explicit refetch calls triggered from the shared coordinator with debouncing/throttling.

Goal:
```text
1 app resume event
→ 1 debounced soft refresh pass
→ no dogpile of 5-8 separate refetch systems
```

#### 2. Deduplicate access + permission fetching
Convert access/permission lookups into shared cached state instead of repeated hook-local fetches.

Changes:
- Refactor:
  - `src/hooks/useStudentAccess.ts`
  - `src/hooks/useAcademyPermissions.ts`
- Use a shared cache/store or React Query keys with in-flight dedupe.
- Make all consumers read the same resolved state instead of each hook instance hitting the backend.

Likely affected consumers:
- `src/components/layout/AcademyLayout.tsx`
- `src/components/academy/dashboard/HeroHeader.tsx`
- `src/pages/academy/AcademyHome.tsx`
- `src/components/layout/AcademySidebar.tsx`
- academy pages using access gating

Goal:
- one access resolution
- one permissions resolution
- shared everywhere

#### 3. Stop cold boot from feeling like a reload
Reduce startup JS and preserve shell rendering during auth recovery.

Changes:
- In `src/App.tsx`, lazy-load route pages with `React.lazy` + `Suspense`.
- Prioritize splitting big academy/admin/trade pages from the dashboard boot path.
- Optionally lazy-load non-critical mounted features like heavy coach/admin panels if they are pulled into home boot.

And:
- Refine `src/hooks/useAuth.tsx` + `src/components/layout/AcademyLayout.tsx`
- Keep a “resume shell” on screen when cached profile data exists and session is being revalidated.
- Avoid replacing the whole academy UI with a full-screen spinner unless the app truly has no known user state.

Goal:
```text
Return to tab
→ keep shell/header/layout visible
→ quietly verify auth + refresh data
→ no “everything disappears” moment
```

#### 4. Make dashboard cards background-refresh only
Several dashboard blocks fetch independently on mount. They should keep last data visible.

Review and harden:
- `src/components/academy/dashboard/HeroHeader.tsx`
- `src/components/academy/dashboard/NextGroupCallCard.tsx`
- `src/components/academy/dashboard/StartLearningCard.tsx`
- `src/components/academy/dashboard/GameplanCard.tsx`
- `src/components/academy/dashboard/ActivityTicker.tsx`

Approach:
- seed from cache where possible
- no fresh-mount skeleton if cached data exists
- use `refreshing` instead of blanking content
- avoid unnecessary intervals / visibility listeners per card

#### 5. Do not delete random files as the first fix
The problem is not “too many files existing in the repo.”
The problem is:
- too much code eagerly imported,
- too many resume listeners,
- duplicated fetch logic.

So the right cleanup is:
- route/code splitting
- deduped data hooks
- removing redundant resume logic

### Files to change
Core:
- `src/App.tsx`
- `src/hooks/useSmartRefresh.ts`
- `src/hooks/useAuth.tsx`
- `src/components/layout/AcademyLayout.tsx`

Resume storm:
- `src/hooks/useUnreadCounts.ts`
- `src/hooks/useRoomMessages.ts`
- `src/hooks/useDailyVaultStatus.ts`
- `src/components/academy/dashboard/ActivityTicker.tsx`

Access dedupe:
- `src/hooks/useStudentAccess.ts`
- `src/hooks/useAcademyPermissions.ts`

Dashboard hardening:
- `src/components/academy/dashboard/HeroHeader.tsx`
- `src/components/academy/dashboard/NextGroupCallCard.tsx`
- `src/components/academy/dashboard/StartLearningCard.tsx`
- `src/components/academy/dashboard/GameplanCard.tsx`

### Testing plan
I would verify this in two ways after implementation:

1. **Warm resume test**
   - Open `/academy/home`
   - switch away for 10–30 seconds
   - return
   - confirm no full-screen blank state and no large refetch burst

2. **Cold resume / tab discard test**
   - keep app open long enough for the tab to be suspended/discarded
   - return
   - confirm the shell stays visible and resume feels instant or near-instant

3. **Network verification**
   - compare request count before vs after on tab return
   - confirm access/permission calls are no longer duplicated

4. **Performance verification**
   - re-run browser performance profile
   - target materially lower boot cost on home route and smoother visual resume

### Expected outcome
After this pass, returning to the app should feel like:
- the screen stays in place,
- data refreshes quietly,
- no blue/blank takeover,
- no 10-second “app reloading” feeling unless the browser fully kills the tab,
and even then the app should restore with a visible shell instead of disappearing.
