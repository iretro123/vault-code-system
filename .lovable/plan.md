

## Fix Learn Page Glitch on Tab Navigation

### Root Causes Identified

1. **`useLessonProgress` has no cache** — starts with `loading: true` and empty progress on every mount. When modules render immediately (from cache), progress bars show 0% briefly, then jump to real values after fetch completes. This is the main visible glitch.

2. **`useStudentAccess` starts `loading: true` even when cache exists** (line 49). This causes a brief uncertain state on every mount where the component doesn't know if user has access yet.

3. **`transition-all` on module cards** (line 208) — violates project performance rules ("Avoid transition-all on large containers"). Can cause layout paint thrash during re-render.

### Changes

#### 1. Add SWR caching to `useLessonProgress` (`src/hooks/useLessonProgress.ts`)

- Add `va_cache_lesson_progress` localStorage cache (same pattern as modules/lessons)
- Initialize `progress` state from cache
- Initialize `loading` based on cache existence (`!cached`)
- Write to cache after fetch
- This eliminates the 0% → real% jump on navigation

#### 2. Fix `useStudentAccess` initial loading state (`src/hooks/useStudentAccess.ts`)

- Change line 49 from `loading: true` to `loading: !cached` 
- When valid cache exists, component renders immediately with cached access state, no loading flash

#### 3. Replace `transition-all` with specific transitions on module cards (`src/pages/academy/AcademyLearn.tsx`)

- Line 208: Change `transition-all duration-200` to `transition-colors transition-shadow duration-200`
- This prevents layout/transform paint thrash during re-render

### Files to modify
- `src/hooks/useLessonProgress.ts` (add SWR cache)
- `src/hooks/useStudentAccess.ts` (fix initial loading when cached)
- `src/pages/academy/AcademyLearn.tsx` (fix transition-all)

