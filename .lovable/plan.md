

## Fix: "Review Today's Feedback" button does nothing

### Root Cause
Line 457 in `AcademyTrade.tsx`: the button has no `onClick` handler.

```tsx
<Button size="sm" variant="outline" className="gap-1.5">
  <Eye className="h-3.5 w-3.5" /> Review today's feedback
</Button>
```

### Fix
The `AIFocusCard` component (already rendered on the page) shows AI feedback. The simplest fix is to scroll to it when the button is clicked. Alternatively, re-open the `QuickCheckInSheet` in read-only mode — but the check-in sheet doesn't have a review mode.

The most practical approach: scroll to the `AIFocusCard` section when clicking "Review today's feedback". We'll add an `id` to the `AIFocusCard` wrapper and use `scrollIntoView` on click.

### Changes
1. **`src/pages/academy/AcademyTrade.tsx`**
   - Add `id="ai-focus-card"` to the `AIFocusCard` wrapper div.
   - Pass an `onReviewFeedback` callback to `TodayTradeCheckCard` that scrolls to `#ai-focus-card`.
   - Wire the "Review today's feedback" button's `onClick` to call that callback.

