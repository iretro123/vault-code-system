

## Narrow Trade OS Desktop Layout to Match Laptop Screenshot

### Problem
The OS layout container uses `max-w-7xl` (80rem / 1280px), which stretches too wide on large desktop monitors. The screenshot shows a clean, narrow centered layout that looks good on laptop screens.

### Fix
Change the outer container width constraint from `max-w-7xl` to `max-w-2xl` (42rem / 672px) with `mx-auto` centering. This matches the narrow, focused single-column look from the screenshot. The hero OS card and all content inside will be constrained to a comfortable reading/interaction width.

### Changes

**File: `src/pages/academy/AcademyTrade.tsx`**

Line 697 — Change:
```
<div className="px-3 md:px-5 pb-6 max-w-7xl pt-2 space-y-1.5">
```
To:
```
<div className="px-3 md:px-5 pb-6 max-w-2xl mx-auto pt-2 space-y-1.5">
```

This single change:
- Constrains the entire Trade OS to ~672px wide, centered
- Matches the laptop screenshot proportions
- The left guide rail (`lg:block w-[240px]`) will be hidden since the container is too narrow for `lg` breakpoint — which is correct; the narrow layout doesn't need it
- All cards, metrics, buttons remain properly sized within the narrower column

