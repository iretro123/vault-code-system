

## Fix Inbox panel cut-off and add dismiss buttons

### Issues identified
1. **Panel cut-off**: The inbox panel is 400px wide, positioned after the sidebar. On narrower viewports or when content overlaps, it gets clipped. Need to add a `max-width` constraint so it never overflows the viewport.
2. **No dismiss button**: Users cannot remove individual inbox items. Need a premium X button on each item row that deletes the item from the database and removes it from state.

### Changes

**`src/components/academy/InboxDrawer.tsx`**
1. Add `max-w-[calc(100vw-var(--sidebar-width,16rem)-24px)]` to the panel container so it never clips past viewport edge.
2. Add `onDismiss` prop to `ItemList` and render a small X button on each item row (right side, stops propagation so it doesn't trigger navigation). Premium styling: subtle opacity, hover to full white, smooth transition.
3. Wire dismiss to a new `dismissInboxItem` function from context.

**`src/contexts/AcademyDataContext.tsx`**
1. Add `dismissInboxItem(itemId: string)` — deletes the row from `inbox_items` table and removes from local state + cache.
2. Expose it in the context interface.

### Visual detail
- Dismiss X: `h-3.5 w-3.5`, `opacity-0 group-hover:opacity-60 hover:opacity-100`, positioned top-right of each item row.
- Panel uses `max-w` to prevent any viewport overflow.

