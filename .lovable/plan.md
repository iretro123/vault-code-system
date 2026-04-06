

## Fix Activity Ticker — Continuous Slide Animation + Fetch Real Data

### Two Problems

**Problem 1: Data not loading.** The tables `live_session_attendance`, `journal_entries`, and `lesson_progress` all have RLS policies that restrict SELECT to `auth.uid() = user_id`. So users can only see their OWN activity — the ticker can never show other students' activity.

**Fix:** Create a `security definer` database function `get_recent_activity()` that returns anonymized recent activity (user_id + type + timestamp) from all three tables. This bypasses RLS safely and only exposes minimal data (first names via the existing `get_community_profiles` RPC).

**Problem 2: No sliding animation.** The current implementation uses a crossfade (opacity + translateX toggle), which just fades between cards. The user wants the original continuous marquee-style slide where items scroll horizontally on their own.

**Fix:** Replace the crossfade with a CSS `@keyframes` marquee animation — items laid out in a row, duplicated for seamless looping, scrolling left continuously at a comfortable pace (~20s per cycle).

### Database Migration

```sql
CREATE OR REPLACE FUNCTION public.get_recent_activity()
RETURNS TABLE (
  activity_id text,
  user_id uuid,
  activity_type text,
  activity_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  (SELECT 'c-' || id::text, user_id, 'call', clicked_at
   FROM live_session_attendance
   WHERE clicked_at >= now() - interval '7 days'
   ORDER BY clicked_at DESC LIMIT 5)
  UNION ALL
  (SELECT 'j-' || id::text, user_id, 'journal', created_at
   FROM journal_entries
   WHERE created_at >= now() - interval '7 days'
   ORDER BY created_at DESC LIMIT 5)
  UNION ALL
  (SELECT 'l-' || id::text, user_id, 'lesson', completed_at
   FROM lesson_progress
   WHERE completed = true AND completed_at >= now() - interval '7 days'
   ORDER BY completed_at DESC LIMIT 5)
$$;
```

### Component Changes (`ActivityTicker.tsx`)

1. Replace the 3 parallel Supabase queries with a single `supabase.rpc("get_recent_activity")` call
2. Keep the `get_community_profiles` call for display names
3. Replace the crossfade carousel with a **CSS marquee animation**:
   - Items laid out in a flex row, duplicated (render the list twice side-by-side)
   - `@keyframes scroll` moves `translateX(0)` → `translateX(-50%)` 
   - Duration: `items.length * 8` seconds (slow, readable pace)
   - `mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent)` for smooth edge fade
4. Keep the luxury dark card styling (radial gradient, shimmer border, shadow)
5. Remove dot indicators (not needed for continuous scroll)
6. Max 3 items displayed, shuffled from the results

### Files

| File | Change |
|------|--------|
| Database migration | New `get_recent_activity()` security definer function |
| `src/components/academy/dashboard/ActivityTicker.tsx` | Use RPC for data, replace crossfade with CSS marquee slide |

