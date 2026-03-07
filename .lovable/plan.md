

## Add Smart "now" Timestamps to Inbox

### What Changes

Add a `formatRelative()` function that produces iMessage-style timestamps, and use it everywhere in the inbox drawer.

**Time logic:**
- < 10 seconds → **"now"**
- < 60 seconds → **"Xs ago"** (e.g. "23s ago")
- < 60 minutes → **"Xm ago"** (e.g. "3m ago")
- < 24 hours → **"Xh ago"** (e.g. "2h ago")
- older → **"Feb 15"**

### Files to Change

**1. `src/lib/formatTime.ts`** — Add `formatRelative()` function (new export, no existing code touched)

```typescript
export function formatRelative(date: string | Date): string {
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return "now";
  const secs = Math.floor(diffMs / 1000);
  if (secs < 10) return "now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return format(d, "MMM d");
}
```

**2. `src/components/academy/InboxDrawer.tsx`** — Replace all 4 `formatDistanceToNow` calls with `formatRelative`:

| Line | Current | New |
|------|---------|-----|
| ~103 | `formatDistanceToNow(...)` (last seen) | Keep as-is (presence, not inbox) |
| ~256 | `formatDistanceToNow(...)` (DM bubble timestamp) | `formatRelative(m.created_at)` |
| ~265 | `formatDistanceToNow(...)` (read receipt) | `formatRelative((m as any).read_at)` |
| ~387 | `formatDistanceToNow(...)` (inbox list row) | `formatRelative(item.created_at)` |
| ~455 | `formatDistanceToNow(...)` (What's New card) | `formatRelative(item.created_at)` |

Import: add `import { formatRelative } from "@/lib/formatTime"` — keep existing `formatDistanceToNow` import for the presence line.

### What This Does NOT Touch
- No changes to AcademyDataContext, useDirectMessages, or useInboxItems
- No changes to realtime subscriptions or optimistic messaging
- No changes to any other component

