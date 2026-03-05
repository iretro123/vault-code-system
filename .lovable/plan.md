

## Plan: Fix 3 Gameplan Card Issues

### Issue 1: Funky glow when expanding
The `.vault-premium-card` has a `radial-gradient` that scales with the card's height. When tasks expand the card, the glow stretches and looks off. **Fix**: Change the gradient to use fixed pixel sizing (`200px`) instead of percentage-based, so it stays anchored at the top regardless of card height.

**File**: `src/index.css` — update `.vault-premium-card` gradient from `ellipse 70% 40%` to `ellipse 70% 200px`.

### Issue 2: My Trades card stretches with Gameplan
Both cards share a grid row (`lg:grid-cols-5`). Grid rows stretch to the tallest item by default. **Fix**: Add `items-start` to the grid container so MyTrades keeps its natural height.

**File**: `src/pages/academy/AcademyHome.tsx` (line 139) — add `items-start` to the grid class.

### Issue 3: "Hide Tasks" leaves user scrolled down
When the user collapses tasks, the card shrinks but scroll position stays. **Fix**: Add a ref to the card wrapper, and when `showTasks` toggles to `false`, call `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` to scroll the card back into comfortable view.

**File**: `src/components/academy/dashboard/GameplanCard.tsx` — add a `useRef` on the outer div, and in the toggle handler, when hiding, call `ref.current.scrollIntoView()`.

### Files Modified
- `src/index.css` — fix gradient sizing
- `src/pages/academy/AcademyHome.tsx` — add `items-start` to grid
- `src/components/academy/dashboard/GameplanCard.tsx` — scroll-to-card on collapse

