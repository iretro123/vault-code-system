

## Redesign Live Sessions Page — Premium Command Center

### Summary
Redesign the left column of AcademyLive.tsx to match the reference: premium header, hero "Next Live Session" card with supporting line, and 3 session-type cards (Sunday Market Prep, Live Trading Room, Weekly Pro Q&A) below. **Keep the right sidebar exactly as-is.** Add Zoom click tracking for attendance consistency.

### Zoom Click Tracking — YES, it's possible
When a user clicks "Join Zoom," we can log that click to the database. This gives real per-user attendance data. We won't know if they actually stayed on the call, but we know they clicked to join — which is a strong signal.

**Implementation:**
- Create a `live_session_attendance` table: `id`, `user_id`, `session_id` (nullable text for static types), `session_title`, `clicked_at`
- On "Join Zoom" click, insert a row before opening the link
- On the right sidebar, add an **Attendance Streak** card showing: sessions attended this month, total all-time, and a consistency percentage bar
- Each user sees only their own data (RLS: `user_id = auth.uid()`)

### Layout Changes

**Header** — Replace `PageHeader` with a custom premium header:
- Large "Live Sessions" h1 (text-3xl font-bold)
- Subtitle: "Prepare. Execute. Review. Attend live sessions to build real trading skillset."
- Right side: "Full Schedule" glass button (scrolls to schedule section)
- Spacious padding, no border

**Hero Card** — Keep existing "Next Live Session" hero but add:
- Supporting line below date: "Bring notebook · headphones · charts ready" (text-xs text-white/40)
- Keep all existing actions (Join Zoom, Copy Link, Calendar, Notify Me, SessionTimer)
- Wrap Join Zoom click with attendance tracking

**3 Session Type Cards** — New row below hero, `grid grid-cols-1 md:grid-cols-3 gap-4`:

Each card structure:
- Top: dark gradient image area (200px tall) with cinematic gradient + large low-opacity lucide icon (Monitor/Mic/Users)
- Title + subtitle
- 4 bullet points
- Footer with schedule time

Card 1: Sunday Market Prep — Monitor icon, blue-to-dark gradient
Card 2: Live Trading Room — Mic icon, indigo-to-dark gradient  
Card 3: Weekly Pro Q&A — Users icon, violet-to-dark gradient

All three share the same gradient treatment, just slightly shifted hues for unity.

**Below cards** — Keep existing "This Week" and "Replays" sections unchanged.

**Right sidebar** — Keep 100% as-is. Add one new card at the top: "Your Attendance" showing clicks/month and a small progress bar.

### Files changed

| File | Change |
|------|--------|
| `src/pages/academy/AcademyLive.tsx` | Rewrite header + add 3 session cards + attendance tracking on Zoom click + attendance card in right sidebar |
| `src/index.css` | Add `.live-session-type-card` image area gradient styles |
| Migration | Create `live_session_attendance` table with RLS |

### Technical details

**Database migration:**
```sql
create table public.live_session_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_title text not null default '',
  session_id text null,
  clicked_at timestamptz not null default now()
);
alter table public.live_session_attendance enable row level security;
create policy "Users can insert own attendance" on public.live_session_attendance for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can read own attendance" on public.live_session_attendance for select to authenticated using (auth.uid() = user_id);
```

**Attendance tracking in Join Zoom click:**
```typescript
const trackZoomClick = async (session: LiveSession) => {
  if (!user?.id) return;
  await supabase.from("live_session_attendance").insert({
    user_id: user.id,
    session_title: session.title,
    session_id: session.id,
  });
};
```

**Right sidebar attendance card** — Query count of attendance records for current month, show as "X sessions joined this month" with a small progress bar (target: 8/month for full consistency).

