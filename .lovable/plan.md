

# Fix: AI Mentor Not Showing Data

## Root Cause

Two issues found:

1. **Edge function not deployed**: The source code in `trade-focus/index.ts` has the new schema (`primaryLeak`, `strongestEdge`, etc.) but the **deployed version** is still returning the old schema (`topMistake`, `focusRule`, `encouragement`). Confirmed by calling the deployed function directly — it returns the old 9-field format.

2. **Stale localStorage cache**: The frontend caches results in `va_cache_ai_focus_v2`. When the user visited today, the cache matched (`date === today && tradeCount === 4`), so the frontend loaded the cached result without calling the edge function. The cached result has the old fields, which means `primaryLeak`, `strongestEdge`, `nextAction`, `progressVerdict` are all `undefined` — rendering as empty slides.

## Fix

### 1. Redeploy the edge function
Deploy `trade-focus` so the new compute-first analytics engine goes live.

### 2. Bust the stale cache (`AcademyTrade.tsx`)
Change the cache key from `va_cache_ai_focus_v2` to `va_cache_ai_focus_v3` so all users' stale cached results are automatically invalidated and a fresh call fires on next visit.

### 3. Add cache validation guard
When loading from cache, verify the cached object actually has the required fields (`primaryLeak`, `riskGrade`). If any are missing, treat the cache as invalid and refetch. This prevents blank slides from ever appearing again.

| File | Change |
|---|---|
| `supabase/functions/trade-focus/index.ts` | Redeploy (no code change needed — source is already correct) |
| `src/pages/academy/AcademyTrade.tsx` | Bump cache key to `v3`, add field validation on cache load |

