

## Instantly Remove Deleted Messages from Chat

Currently, deleted messages show "This message was deleted" for 15 minutes before being hidden. The fix: remove the 15-minute grace period so deleted messages vanish immediately from the UI.

**File: `src/components/academy/RoomChat.tsx` (~line 830-834)**

Change the filter from:
```typescript
if (msg.is_deleted && msg.deleted_at) {
  const deletedAgeMs = Date.now() - new Date(msg.deleted_at).getTime();
  if (deletedAgeMs >= 15 * 60 * 1000) return false;
}
```

To simply:
```typescript
if (msg.is_deleted) return false;
```

This applies to both self-deletes and admin/moderator deletes. The soft-deleted placeholder UI (lines 1130-1135) becomes dead code but can stay for safety. One line change.

