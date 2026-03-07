

## Fix: Show RZ Profile Photo on Personal DM Inbox Items

### Problem
When users receive personal DMs, auto-DMs, broadcasts, or follow-ups, the admin's avatar shows as a generic initials fallback because the `SenderAvatar` component only handles HTTP image URLs. The admin's profile `avatar_url` is stored in `icon:` format which Radix `AvatarImage` can't render.

### Solution
In `SenderAvatar`, for inbox items that have a `sender_id` (personal messages from admin/operators), use the `ChatAvatar` component from `@/lib/chatAvatars` which handles all avatar formats (`icon:`, `initials:`, HTTP URLs). Additionally, since `rz-avatar.png` already exists in `src/assets/`, use it as a hardcoded fallback for operator-sent items when the sender's avatar isn't an HTTP URL — this guarantees the RZ photo always appears on personal DMs.

"What's New" items (no `sender_id`) continue showing the Vault Academy logo unchanged.

### Changes

**`src/components/academy/InboxDrawer.tsx`** — Update `SenderAvatar`:
- Import `ChatAvatar` from `@/lib/chatAvatars` and `rzAvatar` from `@/assets/rz-avatar.png`
- When `item.sender_id` exists: if `sender_avatar` is an HTTP URL, use it; otherwise show the RZ photo via a simple `<img>` tag
- When no `sender_id`: keep existing Vault logo behavior (no change)

This is a single-component change, no other files affected.

