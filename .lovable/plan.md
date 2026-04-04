

## Fix: Quiz Hidden Below the Fold

### Problem
The quiz IS in the code and renders correctly, but it sits below the video (which takes up to 70vh) and the lesson title. The bottom action bar (`Mark Complete` / `Finish Course`) overlaps the bottom of the scroll area, hiding the quiz from view. The content area needs more bottom padding so you can scroll far enough to see the quiz.

### Fix

**File: `src/pages/academy/AcademyModule.tsx`**

1. Add `pb-32` (8rem bottom padding) to the lesson info container (`div.px-6.py-5.flex-1` at ~line 370) so the quiz has clearance above the fixed bottom bar
2. Change from `<div className="px-6 py-5 flex-1">` to `<div className="px-6 py-5 flex-1 pb-32">`

This single change ensures the quiz content is scrollable into view and doesn't get hidden behind the bottom action bar.

### What the user will see
After scrolling past the video and lesson title, the 6-question interactive quiz will be visible with teaching prompts, hints, and the completion screen.

