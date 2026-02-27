

## Fix: Community Tab Switching Lag + Button Routing

### Problem 1: Tab switching feels slow/laggy
The tabs use `visible/invisible` CSS which still forces the browser to layout and composite all three heavy panels. Switching to `hidden/block` (`display:none`) skips layout entirely for inactive tabs, making switches instant.

Additionally, `CommunityWins` starts with `loading=true` on mount and fetches data — even though it's hidden. The spinner briefly flashes when the tab becomes visible for the first time.

### Problem 2: Quick Action buttons don't route correctly
- "Log Trade" already goes to `/academy/trade` — correct
- "Ask Question" in CockpitPanel does nothing (`path: null` with no action handler)
- No "Share a Win" button exists

### Changes

**1. `src/pages/academy/AcademyCommunity.tsx`** (lines 70-78)
- Replace `visible z-10` / `invisible z-0` with `block` / `hidden` for all three tab panels
- This uses `display:none` which completely removes hidden panels from layout/paint calculations

**2. `src/components/academy/community/CommunityWins.tsx`**
- Add localStorage cache (same stale-while-revalidate pattern used elsewhere)
- Initialize `loading` based on cache existence, not data length
- Prevents spinner flash on first tab switch

**3. `src/components/academy/community/CockpitPanel.tsx`** (QuickActionsCard)
- Fix "Ask Question" to dispatch `toggle-coach-drawer` event (same pattern as QuickAccessBar)
- Add "Share a Win" action that calls `onSwitchTab?.("wins")` to switch to the Wins tab
- Pass `onSwitchTab` prop down from CommunityTradeFloor

**4. `src/components/academy/community/CommunityTradeFloor.tsx`**
- Pass `onSwitchTab` prop through to `CockpitPanel`

