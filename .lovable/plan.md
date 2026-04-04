

## Fix Desktop Dashboard Layout — Clean, Balanced, Premium

### Problems
1. **Next Group Call card** has massive empty space below the button — it stretches to match the taller StartLearningCard but content doesn't fill it
2. **Ask Coach card** sits alone in a half-width grid row, looking unbalanced
3. Overall layout feels loose and unfinished on desktop

### Solution

**File: `src/pages/academy/AcademyHome.tsx`** (lines 123-130)

Remove the grid wrapper around AskCoachCard and place it in the same 2-column grid as the other two cards, making a 2x2 layout:

```
Row 1: NextGroupCallCard | StartLearningCard
Row 2: AskCoachCard      | (empty or span full)
```

Change AskCoachCard to span full width below (no grid wrapper), just a plain card:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
  <NextGroupCallCard />
  <StartLearningCard />
</div>

<AskCoachCard />
```

**File: `src/components/academy/dashboard/NextGroupCallCard.tsx`**

Add `h-full flex flex-col` to the card wrapper and push the button to the bottom with `mt-auto` so the card fills its grid cell gracefully without awkward empty space:

- Line 99: `vault-luxury-card p-6` → `vault-luxury-card p-6 h-full flex flex-col`
- Line 129 button: add `mt-auto` so it pins to the bottom
- Same for empty state (line 58): add `h-full flex flex-col` and `mt-auto` on button

**File: `src/components/academy/dashboard/StartLearningCard.tsx`**

Same treatment — add `h-full flex flex-col` to the card wrapper and `mt-auto` to the button group so both cards in the row align buttons at the bottom.

### Result
- Both cards in the row stretch to equal height with content at top and buttons pinned at bottom
- AskCoachCard spans full width below, clean and balanced
- No wasted whitespace, premium desktop feel

### Files changed
- `src/pages/academy/AcademyHome.tsx`
- `src/components/academy/dashboard/NextGroupCallCard.tsx`
- `src/components/academy/dashboard/StartLearningCard.tsx`

