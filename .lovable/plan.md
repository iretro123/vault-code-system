

## Add "Take the Quiz" Button to Dashboard

### Overview
Add a conditional "Take the Quiz" button to the StartLearningCard on the dashboard. It only shows when a quiz is available (currently Chapter 10). Tapping it navigates to the module page where the quiz renders inline. Fully responsive for both mobile and desktop.

### Changes

**File: `src/components/academy/dashboard/StartLearningCard.tsx`**

1. Import the `QUIZ_MAP` keys (or hardcode the slug check) and `useNavigate`
2. After the "Watch Now" button, add a conditional "Take the Quiz" button that appears only when the current lesson's `module_slug` has a quiz entry in `QUIZ_MAP`
3. The button navigates to `/academy/learn/chapter-10-vault-archive-legacy-replays-advanced-library` (the module page where LessonQuiz auto-renders)
4. Style: ghost/outline variant with a distinctive icon (e.g. `Trophy` or `GraduationCap`), sits below the Watch Now button, full width, responsive sizing

**File: `src/components/academy/LessonQuiz.tsx`**

5. Export the `QUIZ_MAP` keys so the StartLearningCard can check availability without duplicating data:
   ```ts
   export const QUIZ_SLUGS = Object.keys(QUIZ_MAP);
   ```

### Quiz Availability Logic
```ts
import { QUIZ_SLUGS } from "@/components/academy/LessonQuiz";
const hasQuiz = lesson && QUIZ_SLUGS.includes(lesson.module_slug);
```

If `hasQuiz` is true, render the "Take the Quiz" button below "Watch Now". Otherwise, nothing extra shows.

### Responsive
- Mobile (current 390px viewport): full-width stacked buttons, comfortable tap targets (py-3)
- Desktop: same full-width layout within the card, consistent with existing card design

