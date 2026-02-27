

## Bug: React Error #310 — "Rendered fewer hooks than expected"

### Root Cause

In `RoomChat.tsx`, a `useMemo` hook is called **inside JSX on line 672**, which only executes when `loading` is `false`. When `loading` is `true`, the early return on line 546 exits the component before that `useMemo` is ever reached. This causes React to see a different number of hooks between renders, triggering error #310.

### Fix

**File: `src/components/academy/RoomChat.tsx`**

1. Extract the `useMemo` from JSX (line 672) into a standalone variable **before** the `if (loading)` early return (before line 546). Something like:

```ts
const filteredMessages = useMemo(() => messages.filter((msg) => {
  if (msg.is_deleted && msg.deleted_at) {
    const deletedAgeMs = Date.now() - new Date(msg.deleted_at).getTime();
    if (deletedAgeMs >= 15 * 60 * 1000) return false;
  }
  if ((msg as any).parent_message_id) return false;
  return true;
}), [messages]);
```

2. Replace the inline `useMemo(...)` call on line 672 with `filteredMessages.map(...)`.

No other files need changes. This is a single-location fix.

