

## Fix Inbox Cards Clipping Inside ScrollArea

### Root cause
Radix `ScrollArea`'s viewport sets `w-full` but flex content inside it can still expand beyond bounds. The card items lack a width constraint relative to the viewport, so the text pushes the X button off the right edge and `overflow-hidden` on the card row clips it.

### Changes — `src/components/academy/InboxDrawer.tsx`

1. **Inner content div**: Change `<div className="px-3 pb-4 space-y-1">` to `<div className="px-3 pb-4 space-y-1 w-full box-border">` — forces content to respect ScrollArea viewport width.

2. **Card row**: Remove `overflow-hidden` from the card row div. It's clipping the X button. The text is already constrained by `truncate`/`line-clamp` + `min-w-0` on inner elements.

3. **ScrollArea wrapper**: Wrap the ScrollArea content in a div with `style={{ width: "100%" }}` as a hard constraint — Radix ScrollArea sometimes ignores className-based width on children.

These are 3 small line changes in one file. No new dependencies, no backend changes.

