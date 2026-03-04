

## Fix: Keep "Start Here" badge and "Open" button together on mobile

**Problem:** The user wants the "Start Here" label and "Open/Continue" button to appear side-by-side on mobile — not split across two stacked rows.

### Change in `src/pages/academy/AcademyLearn.tsx` (lines 141-169)

1. **Revert outer container back to single-row layout** — use `flex items-center` with `flex-wrap` instead of `flex-col sm:flex-row`, so the badge and button stay on the same visual line
2. **Move "Start Here" badge next to the button** instead of inline with the title text — this groups the two CTAs together
3. **Compact the left side** — keep icon + title + subtitle, let them shrink with `min-w-0` and `truncate`
4. **Right side** — put "Start Here" pill + progress + "Open" button in one row with `shrink-0`, always horizontal

Layout on all screens:
```text
[Icon] [Title + subtitle]          [Start Here] [0%] [Open →]
```

On narrow mobile, the title truncates but the right side stays intact and tappable.

### File modified
- `src/pages/academy/AcademyLearn.tsx` — lines 141-169 only

