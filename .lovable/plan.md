

## What's New Tab — Premium Content Cards

### Approach
Create a new `WhatsNewCard` component rendered only in the What's New tab. The Inbox tab keeps its current compact `ItemList` rows untouched.

### Changes — `src/components/academy/InboxDrawer.tsx`

**1. Add `WhatsNewCard` inline component** (above `InboxDrawer`)
- Vertical card layout: icon badge top-left, dismiss X top-right (absolute), title (line-clamp-2), body (line-clamp-3), timestamp footer
- Styling: `bg-white/[0.04] border border-white/[0.08] rounded-2xl` with `hover:bg-white/[0.06] hover:border-white/[0.12]` — soft premium surface
- Unread state: left accent bar or subtle gold border `border-[hsl(45,90%,50%)]/20`
- Min height `min-h-[120px]` for visual rhythm, no fixed max
- Dismiss X: `absolute top-3 right-3 shrink-0` circular ghost button, same iOS style as current
- Generous padding: `p-4`

**2. Add `WhatsNewList` component** (sibling to `ItemList`)
- Same loading/empty state logic as `ItemList`
- Same mark-all-read header
- Maps items through `WhatsNewCard` instead of compact rows
- Uses `ScrollArea` with `gap-y-3` spacing between cards

**3. Update `TabsContent` for "whats-new"**
- Replace `<ItemList>` with `<WhatsNewList>` for the what's-new tab
- Inbox tab stays exactly as-is using `<ItemList>`

**4. Remove debug outlines**
- Strip the temporary `outline outline-1 outline-red/green/blue-500/30` classes from the Inbox `ItemList` rows while we're in this file

### Card structure (WhatsNewCard)
```text
┌─────────────────────────────────┐
│ [icon] TYPE LABEL        [X]   │
│                                 │
│ Title text up to 2 lines        │
│                                 │
│ Body preview text up to         │
│ 3 lines of content...           │
│                                 │
│ 2 hours ago                     │
└─────────────────────────────────┘
```

### What stays unchanged
- Drawer shell, width, position, tabs, badge logic
- Inbox tab compact row layout
- All backend read/dismiss/markRead logic
- Navigation on click behavior

