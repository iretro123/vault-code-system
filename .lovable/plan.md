

## Fix: Unread Badges Not Clearing + Smart Own-Message Filtering

### Bug Found
When the user **leaves the community page**, `_activeSlugRef.current` still holds the last viewed room slug (e.g. `"trade-floor"`). This means:
- New messages to that room are silently marked as read (line 81-84 in the realtime handler) even though the user **isn't viewing it anymore**
- When the user returns, counts are stale because `_fetchInitial` only runs once per userId session

The own-message filtering is already correct (`neq("user_id", userId)` in query, `msg.user_id === userId` check in realtime). No change needed there.

### Changes

**`src/hooks/useUnreadCounts.ts`** — 3 fixes:

1. **Clear active slug on community unmount**: Add a cleanup function to the `useEffect` that updates `_activeSlugRef` — when `activeRoomSlug` changes to `null` (sidebar instance) or the community page unmounts, set `_activeSlugRef.current = null` so messages correctly increment counts when the user isn't on the community page.

2. **Re-fetch counts when returning to community**: When the community page mounts and passes a non-null `activeRoomSlug`, re-fetch the count for that specific room from the DB to ensure accuracy (handles edge cases like messages arriving while the realtime channel had brief disconnects).

3. **Add route-awareness**: Update the effect so that when `activeRoomSlug` goes from non-null to null (leaving community), the ref is cleared.

### Technical Detail

```typescript
// Fix 1: cleanup on the activeSlug effect
useEffect(() => {
  if (activeRoomSlug !== null) {
    _activeSlugRef.current = activeRoomSlug;
  }
  return () => {
    // Only clear if THIS instance set it (community page, not sidebar)
    if (activeRoomSlug !== null) {
      _activeSlugRef.current = null;
    }
  };
}, [activeRoomSlug]);

// Fix 2: refresh counts for the active room on mount
useEffect(() => {
  if (activeRoomSlug && userId) {
    // Re-query this room's actual count from DB
    _refreshRoom(activeRoomSlug, userId);
  }
}, [activeRoomSlug, userId]);
```

Add a `_refreshRoom` helper that queries the single room's count and updates `_counts` — lightweight single query instead of fetching all 4 rooms.

