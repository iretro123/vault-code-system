

## Fix Next Group Call Card Height on Desktop

### Problem
The `h-full` class on the NextGroupCallCard forces it to stretch to match the taller StartLearningCard in the 2-column grid, creating excessive empty padding between the content and the button.

### Solution

**File: `src/components/academy/dashboard/NextGroupCallCard.tsx`**

- Line 58: Remove `h-full` from the empty state wrapper — change to `vault-luxury-card p-6 flex flex-col`
- Line 99: Remove `h-full` from the main card wrapper — change to `vault-luxury-card p-6 flex flex-col`

This lets the card size naturally to its content. The two cards in the grid row will no longer be forced to equal height — the Next Group Call card stays compact while StartLearningCard (which has more content) takes its natural height.

**File: `src/pages/academy/AcademyHome.tsx`**

- On the grid wrapper, change from `grid grid-cols-1 lg:grid-cols-2 gap-5` to `grid grid-cols-1 lg:grid-cols-2 gap-5 items-start` — this prevents CSS grid from stretching shorter items to match the tallest.

### Files changed
- `src/components/academy/dashboard/NextGroupCallCard.tsx`
- `src/pages/academy/AcademyHome.tsx`

