

## Fix Playbook "Start Here" Strip for Mobile

**Problem:** The Playbook hero strip uses a single horizontal flex row (`flex items-center justify-between`) that crams the icon, title, subtitle, progress stats, and button all on one line. On mobile, the button gets squeezed or text truncates badly.

### Fix in `src/pages/academy/AcademyLearn.tsx` (lines 141-169)

**Change the layout to stack on mobile, row on desktop:**

1. **Outer container:** Change from `flex items-center justify-between` to `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`
2. **Right side (progress + button):** Change from `shrink-0` to `flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3` — on mobile this puts progress text on the left and button on the right in a full-width row
3. **Show progress stats on mobile too:** Remove `hidden sm:block` from the progress text div so mobile users see their chapter count
4. **Button:** Keep as-is, it'll have room now

This gives mobile users a two-row layout: title row on top, progress + button row below. Desktop stays unchanged.

### File modified
- `src/pages/academy/AcademyLearn.tsx` — lines 141-169 only

