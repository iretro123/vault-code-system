

## Fix: Match Wins Image Sizing to Chat

### Problem
The Wins tab renders images inside full-width white cards. Even with `sm:max-w-[360px]`, the image appears huge because:
1. The card itself spans full width (or half on desktop via the grid)
2. There's no `max-h` constraint, so tall images blow up vertically

The Chat tab keeps images compact with `max-w-[360px]` BUT images sit inside tight chat bubbles on a dark background, which visually constrains them further.

### Fix — `src/components/academy/community/CommunityWins.tsx`

Add a `max-h-[240px]` constraint to match the chat's inline markdown image rendering (`max-h-[240px]` from RoomChat line 218), and switch to `object-cover` for consistent cropping of tall screenshots:

**Line 106** — change image className from:
```
className="rounded-xl max-w-full sm:max-w-[360px] w-auto h-auto object-contain border border-white/[0.08]"
```
to:
```
className="rounded-xl max-w-full sm:max-w-[300px] max-h-[240px] object-cover border border-white/[0.08]"
```

This matches the Chat tab's inline image rendering: constrained width (300px) + constrained height (240px) + `object-cover` for clean cropping. One line change.

