

## Redesign Balance Adjustment Modal for Mobile

### Problem
1. The Dialog's built-in `X` close button (`absolute right-4 top-4`) overlaps with the `-` (withdraw) button in the card header
2. The modal looks like a plain card, not a premium luxury popup

### Fix — Rewrite `BalanceAdjustmentModal.tsx`

**Replace the current Dialog wrapper** with a custom luxury modal that:

1. **Adds its own close button** in a safe position (top-left or top-right with proper spacing above the card content) and hides the default Dialog `X` by passing a custom class
2. **Applies luxury styling**: rounded-2xl, glassmorphism background, border glow, backdrop blur — matching the `.vault-luxury-card` aesthetic
3. **Adds top padding** inside DialogContent so the close `X` doesn't overlap the `+`/`-` buttons

### Specific changes

**`BalanceAdjustmentModal.tsx`**:
- Add `rounded-2xl` and luxury border/glow styling to DialogContent
- Add top padding (`pt-8`) so the default close X sits above the card header buttons
- Add `[&>button:last-child]:right-3 [&>button:last-child]:top-3` to reposition the close button slightly, or override with a custom close button row

**`BalanceAdjustmentCard.tsx`**:
- Add an optional `isModal` prop that adds right-side padding to the header action buttons so they don't collide with the dialog close button
- No logic changes — all add/withdraw/reset functionality stays identical

### Files changed
- `src/components/trade-os/BalanceAdjustmentModal.tsx` — luxury styling + close button fix
- `src/components/trade-os/BalanceAdjustmentCard.tsx` — add padding guard for modal context

