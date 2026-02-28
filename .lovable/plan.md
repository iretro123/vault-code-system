

## Fix Community Page Flicker on Tab Navigation

### Root Causes Found

**1. Hot Tickers bar causes layout jump** (`useHotTickers.ts`)
- Starts with empty array `[]`, no cache
- `TradeFloorHero` conditionally renders the tickers bar only when `hotTickers.length > 0`
- After fetch (~200-500ms), bar appears, pushing the entire chat feed down — visible "jump"

**2. Background message refresh re-renders everything** (`useRoomMessages.ts`)
- On mount with cache, messages render instantly — good
- Then `fetchMessages` runs in background and calls `updateMessages(sorted)` replacing the entire array
- Even if data is identical, new object references trigger full re-render of every message (trade cards, chart images, avatars, context menus)
- This is the "flicker" — all messages briefly re-paint

**3. Trade log in CockpitPanel has no cache** (`useTradeLog.ts`)
- `YourWeekCard` uses `useTradeLog` which starts with `entries: []`, `loading: true`
- Trade count shows 0, then jumps to real value — minor flicker in right rail

**4. Scroll effect fires on mount** (`RoomChat.tsx` line 327-329)
- `useEffect(() => { bottomRef.current?.scrollIntoView(); }, [loading])` fires on initial mount
- Combined with background refresh re-render, creates a visible scroll "jump"

### Fixes

#### File: `src/hooks/useHotTickers.ts`
- Add `va_cache_hot_tickers` localStorage cache with 5-min TTL
- Initialize state from cache instead of empty array
- Background refresh silently, only update if different

#### File: `src/hooks/useRoomMessages.ts`
- In `fetchMessages`, compare fetched message IDs with current message IDs before calling `updateMessages`
- Skip update if data is identical (same IDs in same order) — prevents unnecessary full re-render

#### File: `src/hooks/useTradeLog.ts`
- Add `va_cache_trade_entries` localStorage cache
- Initialize `entries` from cache, set `loading: !cached`

#### File: `src/components/academy/RoomChat.tsx`
- Remove the `[loading]` scroll effect (line 327-329) — it's redundant when loading starts as `false` from cache and causes unnecessary scroll on mount
- Keep only the `[messages.length]` scroll effect

### Files to modify
- `src/hooks/useHotTickers.ts`
- `src/hooks/useRoomMessages.ts`
- `src/hooks/useTradeLog.ts`
- `src/components/academy/RoomChat.tsx`

