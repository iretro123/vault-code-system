

## Add Video Title + Interactive Quiz to Chapter 10

### Overview
Two changes to the Chapter 10 lesson page:
1. Update the lesson title in the database to the full training session name
2. Build an inline quiz component below the video/notes section with the 6-question "leapfrog style" quiz

### Database Change (Data Update via Insert Tool)

Update the lesson title:
```sql
UPDATE academy_lessons 
SET lesson_title = 'Trading Imbalances + Liquidity (Full Breakdown) — Group Training Session'
WHERE module_slug = 'chapter-10-vault-archive-legacy-replays-advanced-library' 
AND video_url LIKE '%yGXIxEGEQRM%';
```

### New Component: `src/components/academy/LessonQuiz.tsx`

A self-contained quiz component with:
- 6 hardcoded questions (matched to this specific lesson by a quiz ID/slug system)
- Each question: 1-line teaching prompt → question → 3 choices
- Wrong answer: show hint (not the answer), allow retry up to 3 attempts
- After 3 wrong: reveal correct answer + explanation, auto-advance
- Correct answer: show explanation, green confirmation, advance
- Completion screen: "You don't need more indicators. You needed a map."
- Progress dots at top showing which question user is on
- Premium dark solid card styling (no glass)
- Smooth transitions between questions

Quiz data structure (hardcoded array for this lesson):
```ts
interface QuizQuestion {
  teach: string;
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
  explanation: string;
}
```

State: `currentQ`, `attempts` per question, `revealed` (show answer after 3 tries), `completed`

### File Change: `src/pages/academy/AcademyModule.tsx`

After the Study Notes section (~line 417), render `<LessonQuiz moduleSlug={moduleSlug} lessonId={activeLesson.id} />`. The component internally checks if a quiz exists for the given lesson and renders nothing if not.

### Quiz-Lesson Mapping

For now, hardcode the quiz data inside `LessonQuiz.tsx` keyed by `module_slug`. This keeps it simple — one file, no DB schema changes. Future quizzes can be added to the same map.

### Files
1. **DB update** — rename lesson title
2. **`src/components/academy/LessonQuiz.tsx`** — new quiz component (all 6 questions, hint/retry logic, completion screen)
3. **`src/pages/academy/AcademyModule.tsx`** — render `<LessonQuiz>` below study notes

