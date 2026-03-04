

## Replace Scoreboard with "My Trades" Summary Card on Dashboard

**What:** Delete `ScoreboardCard` from the dashboard. Replace it with a new `MyTradesCard` that shows a compact snapshot of the user's trade activity and links directly to the My Trades page.

### New file: `src/components/academy/dashboard/MyTradesCard.tsx`

A compact dashboard card showing:
- **Header:** "My Trades" title + "View All →" link to `/academy/trade`
- **Top row (3 metrics):** Trades This Week · Win Rate · P/L — all pull from the same local cache/state as My Trades page (for now show "—" / "0" since no backend, matching the empty-state approach)
- **Middle:** Tracked Balance display (or "Set up balance" prompt if not set, with a CTA that navigates to `/academy/trade`)
- **Bottom:** Today's status indicator — "No trades today" / "1 trade logged" / "Check-in complete ✅" — mirrors `todayStatus` concept
- **Primary CTA:** "+ Log Trade" button that navigates to `/academy/trade` (keeps trade logging centralized on that page rather than duplicating the modal)

The card is informational + navigational — it answers "How's my trading going?" and pushes users to the My Trades page for action.

### Edit: `src/pages/academy/AcademyHome.tsx`

- Remove `ScoreboardCard` import
- Import new `MyTradesCard`
- Replace `<ScoreboardCard />` in the grid with `<MyTradesCard />`

### Keep (no delete): `ScoreboardCard.tsx`

Leave the file for now in case it's referenced elsewhere. Can clean up later.

**Files:** 1 new (`MyTradesCard.tsx`), 1 edit (`AcademyHome.tsx`)

