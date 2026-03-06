

## Fix: Constrain Image Height in Non-Chat Community Tabs

### Root Cause
All tabs (Chat, Announcements, Signals, Wins) use the same `RoomChat` component with identical image styling: `sm:max-w-[360px] h-auto` and **no max-height**. The Chat tab looks fine because `CommunityTradeFloor` wraps it with a 280px `CockpitPanel` sidebar that narrows the content area, visually constraining images. The other three tabs render `RoomChat` at full width with no sidebar, so tall screenshots blow up.

### Approach
Add a `compact` prop to `RoomChat` that applies `max-h-[300px]` to uploaded images. Pass `compact` from the Announcements, Signals, and Wins tabs. Chat remains untouched.

### Changes

**1. `src/components/academy/RoomChat.tsx`**
- Add `compact?: boolean` to `RoomChatProps` interface
- On the image element (line 1224), conditionally add `max-h-[300px]` when `compact` is true

**2. `src/pages/academy/AcademyCommunity.tsx`**
- Add `compact` prop to the three `RoomChat` instances for announcements, daily-setups, and wins-proof
- Do NOT touch the Chat tab (`CommunityTradeFloor`)

This keeps Chat exactly as-is while constraining image height in the other tabs.

