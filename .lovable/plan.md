

## Fix: Show full title + subtitle on mobile, move progress below

**Problem:** On mobile, "Vault Playbook" truncates to "Vau..." and the subtitle is invisible because the right-side elements (Start Here + 0% + Open) consume all horizontal space.

### Solution — Two-row mobile layout

Stack vertically on mobile, horizontal on desktop:

1. **Outer container:** Change to `flex flex-col sm:flex-row sm:items-center gap-3` — stacks on mobile, inline on desktop
2. **Top row (mobile) / Left side (desktop):** Icon + full "Vault Playbook" title + subtitle — no truncation needed since they get the full width on mobile
3. **Bottom row (mobile) / Right side (desktop):** "Start Here" pill + progress (0%, 0/12) + "Open" button — all grouped together horizontally

This way mobile users see:
```text
Row 1: [Icon]  Vault Playbook
               Finish the OS before you binge modules.
Row 2: [Start Here]  [0%  0/12]  [Open →]
```

Desktop stays the same single row as before.

### File modified
- `src/pages/academy/AcademyLearn.tsx` — lines 141-169 only

