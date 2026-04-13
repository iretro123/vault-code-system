

## Fix the 999-Day Bug + Make the Nudge Card Fire

### The Bug

Line 186: `daysInactive` defaults to `999` when the user has **zero check-in records**. So brand new users (or anyone who's never checked in) see "You've been away 999 days" — obviously wrong. The fix: distinguish between "never checked in" and "checked in but lapsed."

### The Fix + Upgrade

**1. Fix the waterfall priority order**

The "inactive 3+ days" check fires before "no check-in today" — but for users who've *never* checked in, the right nudge is "Start your first check-in" not "You've been away 999 days." New priority:

1. **Never checked in at all** (0 records) → "You haven't started checking in yet. 30 seconds to build your first streak." → CTA: Start Now
2. **Inactive 3+ days** (has history but lapsed) → "You've been away {N} days. Your streak reset — start a new one today." → CTA: Check In
3. **Traded today, no journal** → (same)
4. **No check-in today** (has history, checked in recently but not today) → (same)
5. **Never watched a lesson** (0 lessons, member 3+ days) → "You haven't started a lesson yet. The first one is 10 minutes." → CTA: Watch Lesson 1
6. **No wins posted** (3+ trades) → (same)
7. **Lessons watched but no trades** (5+ lessons, 0 trades) → (same)
8. **No live session attended** (member 14+ days) → (same)
9. **Weekly review due** (Fri–Sun) → (same)
10. **On a streak 3+** → (same, but upgrade the message with real streak data)
11. **All caught up** → (same)

**2. Better copy — make it feel real, not robotic**

Current messages are flat. Upgrade examples:
- Streak: "🔥 {N}-day streak. You're in the top discipline tier. Don't break it." (with Flame icon, emerald accent)
- Never checked in: "Your first check-in takes 30 seconds. Every disciplined trader starts here."
- Inactive: "It's been {N} days. The market doesn't wait — neither should your discipline."
- Trade no journal: "You took {N} trade{s} today. Journal it while the lessons are fresh."

**3. Upgrade the visual design**

The current card is functional but plain. Make it premium:
- Add a subtle shimmer/gradient on the left accent bar (not just a flat color)
- Slightly larger icon with a soft glow ring behind it
- CTA button gets a solid style (not ghost) with the accent color for urgency nudges
- Add a subtle animated entrance (slide-in from left, 200ms)

### Files Changed

| File | Change |
|------|--------|
| `src/components/academy/dashboard/PersonalNudgeCard.tsx` | Fix 999-day bug, reorder waterfall, add "never checked in" + "never watched lesson" nudges, upgrade copy, improve card design |

