

## Remove Top Padding Above Community Tabs

The floating workspace panel on line 34 has `m-3` (margin on all sides) plus the admin bar wrapper has `pt-2` padding. This creates excess space above the tabs.

### Changes in `src/pages/academy/AcademyCommunity.tsx`

1. **Line 34**: Change `m-3` → `mx-3 mb-3` (remove top margin, keep sides and bottom)
2. **Line 36**: Change `px-4 pt-2` → `px-4 pt-1` on the admin bar wrapper (reduce top padding)
3. **Line 48**: Change `py-1.5` → `py-1` on the tab nav container (tighten vertical padding)

