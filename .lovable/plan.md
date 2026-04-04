

## Fix Quiz Readability — Clear Title + Bold Question

### Problem
The quiz header says "How Price Actually Moves (Simple Mode)" in small muted text — students don't know what it is. The question text is too small and not prominent enough. Needs a clear "VAULT OS QUIZ" label and the question in full white bold.

### Changes

**File: `src/components/academy/LessonQuiz.tsx`**

1. **Header section** (~line 161-181): Replace the small muted subtitle with a prominent "VAULT OS QUIZ" title in bold white, with the topic name as a smaller subtitle below it

2. **Question text** (~line 190-195): Make the question larger (`text-lg`), full white (`text-white`), and bold (`font-bold`) so it stands out clearly. Keep "Question X of 6" as a small label above.

3. **Teaching line** (~line 186-188): Keep as-is but ensure it reads as a "lesson hint" before the question

4. **Answer options** (~line 198-230): Bump text size slightly for readability

### Result
- Big bold "VAULT OS QUIZ" at the top — instantly clear what this is
- Question in large white bold text — impossible to miss
- Answers clearly listed below with good spacing

