

## Fix: Signals & Admin Posts Not Visible to Users

### Root Cause Analysis

After checking the database (139 messages exist in `daily-setups`), RLS policies (SELECT allows all authenticated), and the UI code, the data layer is healthy. The likely causes are:

1. **Published app may be stale** — users on the production URL may not have the latest code
2. **Tab activation deferral** — the Signals tab defers data fetching until first clicked; if users don't click it, they see nothing
3. **In-memory cache staleness** — `roomMessageCache` persists across tab switches but can get stale if the initial fetch returned empty (e.g., due to a network hiccup)

### Fixes

**File: `src/hooks/useRoomMessages.ts`**

1. **Add a periodic background refresh** — When the tab becomes active again after being dormant, re-fetch messages to catch anything missed. Currently, if the initial fetch fails silently or returns stale data, there's no retry.

2. **Clear stale cache on error** — If `fetchMessages` errors, clear the cache for that room so the next activation does a clean fetch instead of showing empty state.

3. **Add a visibility-based refresh** — When the browser tab becomes visible again (user returns to the app), trigger a background refresh for the active room. This ensures users who leave the app open always see the latest posts.

**File: `src/components/academy/RoomChat.tsx`**

4. **Force re-fetch when `active` transitions from false to true** — Currently `hasBeenActive` is a one-way latch. Add logic so that when a tab is re-activated, it triggers a fresh fetch rather than relying solely on cached data.

**File: `src/pages/academy/AcademyCommunity.tsx`**

5. **Pass an `active` prop correctly to all RoomChat instances** — Verify each tab's RoomChat gets `active={true}` when selected, ensuring the deferral mechanism doesn't accidentally keep a tab in deferred state.

### Summary

| File | Change |
|------|--------|
| `useRoomMessages.ts` | Add visibility-based refresh + error cache clear |
| `RoomChat.tsx` | Re-fetch on tab re-activation |
| `AcademyCommunity.tsx` | Ensure active prop wiring is correct |

No database or RLS changes needed — the data is accessible and correct.

