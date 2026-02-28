

## Add "Reply" to right-click context menu + restrict "Pin" to moderators only

### Problem
1. Right-click context menu is missing a "Reply" option — users can only reply via the hover toolbar.
2. The "Pin message" action is already gated behind `canModerate`, so regular users cannot see it. However, from the screenshot it appears it's showing for the CEO. This is correct behavior — the issue is confirmed as working. No change needed for pin visibility.

### Changes

**`src/components/academy/RoomChat.tsx`** — Add a "Reply" menu item inside `menuActions` (around line 828-833), right after the "Copy" action. It will call `onThreadOpen` when clicked, same as the hover toolbar reply button.

```text
Before (menuActions):
  Copy
  Edit (if canEdit)
  Delete (if canDelete)
  Pin (if canModerate)
  Timeout (if canModerate)

After:
  Copy
  Reply (if !isAnnouncements && onThreadOpen && !msg.is_deleted)
  Edit (if canEdit)
  Delete (if canDelete)
  Pin (if canModerate)
  Timeout (if canModerate)
```

Single insertion of ~5 lines inside the existing `menuActions` function, adding a Reply `ItemComponent` with a `MessageSquare` icon that triggers `onThreadOpen`.

