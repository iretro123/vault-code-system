
Goal: stop Community chat from jumping to the top when users switch browser tabs/app tabs and return, while still keeping new-message behavior correct.

What I found
- `RoomChat.tsx` still has aggressive auto-scroll behavior:
  - an initial activation effect
  - another `[active, loading, messages.length]` effect that calls `scrollToBottomInstant()` multiple times
  - a `ResizeObserver` that can also force bottom scroll
- There is no true per-room scroll memory. If the DOM/layout refreshes while the user is away, the component has no saved `scrollTop` to restore.
- In `AcademyCommunity.tsx`, the non–Trade Floor tabs pass `active`, but `CommunityTradeFloor` does not pass an `active` prop into its `RoomChat`, so Trade Floor cannot properly know when it was hidden/shown.

Implementation plan

1. Fix Trade Floor active-state wiring
- Update `CommunityTradeFloor.tsx` to accept an `active` prop.
- Pass that prop down to its `RoomChat`.
- Update `AcademyCommunity.tsx` to send `active={activeTab === "trade-floor"}` to `CommunityTradeFloor`.

2. Add real scroll-position persistence in `RoomChat.tsx`
- Store `scrollTop` per room in a ref/map keyed by `roomSlug`.
- Save position on user scroll and when the tab/page becomes hidden.
- On re-activation, restore the saved `scrollTop` instead of forcing bottom scroll if the user was not at the bottom.

3. Tighten auto-scroll rules
- Keep auto-scroll only for these cases:
  - first load of a room with no saved position
  - user is already at bottom and a new message arrives
  - user taps “New messages”
- Prevent re-activation effects and `ResizeObserver` from overriding a saved reading position.

4. Preserve current UX for active readers
- If the user is at bottom, continue snapping to the latest message normally.
- If the user is reading history, keep their exact place and continue showing the “New messages” button.

5. Verify across all community channels
- Apply the same behavior to:
  - Trade Floor
  - Signals
  - Wins
  - Announcements
- Make sure room switching still resets appropriately when moving to a different room, but browser/app tab switching does not.

Files to update
- `src/pages/academy/AcademyCommunity.tsx`
- `src/components/academy/community/CommunityTradeFloor.tsx`
- `src/components/academy/RoomChat.tsx`

Expected result
- When a user leaves Community and comes back, the chat stays where they left it.
- If they were at the bottom, they stay at the live edge.
- If they were scrolled up, they return to that exact reading position instead of bouncing to top or bottom.
