

## Compact Gameplan + My Trades Cards

**Problem:** Both cards show all content expanded, creating excessive vertical scroll — especially painful on mobile where 13 task rows + metrics + CTA stack into a very long page.

### Changes

#### 1. GameplanCard — Collapsible task groups (default collapsed on both mobile and desktop)

- **Keep visible always:** Header, Next Step strip, Progress bar (with reset label)
- **Collapse by default:** All 3 task groups (Foundation, This Week, Consistency) and Recently Completed behind a single "Show Tasks" / "Hide Tasks" toggle
- On desktop, default to collapsed too — the Next Step strip already tells users what to do next
- Reduce task row padding from `py-3` → `py-2.5` and spacing from `space-y-6` → `space-y-4` for tighter feel
- This cuts the default visible height from ~600px to ~200px

#### 2. MyTradesCard — Tighten spacing

- Reduce card padding from `p-6` → `p-5`
- Reduce internal spacing from `space-y-5` → `space-y-3`
- Reduce metric mini padding from `py-2.5` → `py-2`
- Keep all content visible (it's already compact enough — only 5 elements)

#### 3. Dashboard grid — Make My Trades match Gameplan height

- No layout changes needed. The collapsed Gameplan will naturally be shorter, and `h-full` on My Trades will match.

### Files Modified

- `src/components/academy/dashboard/GameplanCard.tsx` — collapse groups by default, tighten spacing
- `src/components/academy/dashboard/MyTradesCard.tsx` — tighten spacing

