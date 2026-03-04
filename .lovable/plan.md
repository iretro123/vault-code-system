

## Update Quick Actions Dropdown Items

**Edit:** `src/components/academy/dashboard/HeroHeader.tsx`

Replace the `CREATE_ITEMS` array (lines 21-27) with these 5 items:

1. `TrendingUp` — **Log Trade** → `/academy/trade`
2. `MessageSquare` — **Trade Floor** → `/academy/community`
3. `Sparkles` — **Ask Coach** → opens coach drawer
4. `BookOpen` — **Lessons** → `/academy/learn`
5. `Video` — **Live** → `/academy/live`

Also update imports: remove `PenLine`, `ClipboardCheck`, `BarChart3`; add `MessageSquare`, `BookOpen`, `Video`.

Remove the `checkin` action handler since "Start Daily Check-In" is no longer in the menu.

Button label stays as "Create" or can become "Quick" — keeping current label since user didn't specify a rename.

**Files:** 1 edit (`HeroHeader.tsx`)

