

## Plan: Fix Status Line Flash on Refresh

### Problem
The `useStatusLine` hook in `HeroHeader.tsx` initializes with the default text `"Your trading discipline journey continues"`, then async-fetches the real status (e.g. "No journal entries this week…"). On refresh, users see a brief flash where the default text appears before switching to the actual status — a visible text swap/glitch.

### Fix: `src/components/academy/dashboard/HeroHeader.tsx`

1. Change `useStatusLine` initial state from the default string to `null`
2. While `message` is `null`, render a subtle skeleton placeholder (a small `h-4 w-48 bg-muted/40 rounded animate-pulse` div) instead of text
3. Once the async status resolves, show the real text — no flash, no swap

This is a ~5-line change in `useStatusLine` + a conditional render on line 261.

