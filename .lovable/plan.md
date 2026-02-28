

## Persistent Dismiss + iOS Swipe-Away Feel

### Current State
`dismissInboxItem` already deletes from the `inbox_items` DB table — so persistence works. The issue is purely visual: the card disappears instantly with no feedback. Need iOS-style smooth removal animation.

### Changes — `src/components/academy/InboxDrawer.tsx` only

**1. Add dismiss animation state to `WhatsNewCard`**
- Track `dismissing` boolean state in the card
- On X click: set `dismissing = true`, after ~250ms call `onDismiss(item.id)`
- When `dismissing`: apply `opacity-0 -translate-x-4 scale-95 max-h-0` with transition
- Use `overflow-hidden` + `transition-all duration-250` for smooth collapse

**2. Same treatment for `ItemList` compact rows**
- Wrap each row in a container with dismiss animation state
- Same pattern: click X → animate out → then call onDismiss

**3. Extract a small `useDismissAnimation` helper** (inline in same file)
- Returns `{ isDismissing, triggerDismiss }` 
- `triggerDismiss` sets state, fires callback after delay

### Animation spec
```text
Idle → X clicked → opacity:0, translateX:-16px, scale:0.95 (200ms ease-out) → onDismiss fires → row removed from DOM
```

No backend changes. No drawer shell changes. No badge logic changes.

