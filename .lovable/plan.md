

## Upgrade Community Chat to Discord-Style Flat Layout

### Problem
Messages currently render inside colored bubble containers (`bg-white/[0.06]`, `bg-amber-500/[0.08]` for admins, blue gradient for own messages). This looks dated and heavy compared to Discord's clean flat layout where messages sit directly on the background with no wrapper boxes.

### Design Direction (matching Discord)
- **No bubbles** for any messages — text renders directly on the dark background
- **Flat hover** — full-width row highlight on hover (`hover:bg-white/[0.02]`)
- **Username colors** — admin/CEO names stay amber, regular users get white/foreground
- **Compact grouping** — grouped follow-up messages have tighter vertical spacing, no redundant padding
- **Own messages look identical** to others (no blue bubble) — Discord doesn't differentiate your own messages visually
- **Reactions, thread triggers, hover toolbar** — all stay as-is, they already match Discord patterns

### Changes

**`src/components/academy/RoomChat.tsx`** — Message rendering overhaul (lines ~1411-1435):

1. **Remove all bubble wrappers** — delete the `<div className="inline-block max-w-[88%]">` and inner `<div className="rounded-xl px-3.5 py-2 ...">` containers for regular messages
2. **Render message text directly** — `<p>` tag sits flat with no background, no border, no border-radius
3. **Remove own-message blue gradient** — own messages render identically to others (flat text)
4. **Keep CEO/Admin left amber border** on the row level (already exists at line 1255) but remove the amber bubble background
5. **Adjust text styling** — bump to `text-[14px]` on mobile for readability, keep `text-foreground` for everyone
6. **Quote blocks** — keep the left-border quote style but remove the `isOwnBubble` white variant since there's no own bubble anymore
7. **Remove `(edited)` color variants** — just use `text-muted-foreground` universally
8. **Tighten row padding** — grouped messages get `py-[1px]` instead of `py-[2px]`, new groups get `pt-1.5 pb-0.5` instead of `mt-2 pt-2 pb-1`

### Visual Result
```text
Before (current):
┌─────────────────────────────┐
│ [avatar] Name  12:30 PM     │
│ ┌─────────────────────┐     │
│ │ message in a box     │     │
│ └─────────────────────┘     │
└─────────────────────────────┘

After (Discord-style):
──────────────────────────────
 [avatar] Name  12:30 PM
 message text sits flat here
──────────────────────────────
```

### Files Changed
- `src/components/academy/RoomChat.tsx`

