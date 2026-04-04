

## Add Cartoony White Mascot Logo to Quiz Card

### Change

**File: `src/components/academy/LessonQuiz.tsx`** — lines 188-198

Restructure the header to `justify-between` layout and replace the small PenLine icon on the left with just the text. On the **right side**, add a cartoony white mascot — a simple inline SVG of a round smiley character holding a pencil, rendered in white. Think chibi/cartoon style: big round head, dot eyes, curved smile, tiny pencil in hand.

**Current layout:**
```
[pencil-icon] [VAULT ACADEMY QUIZ]
```

**New layout:**
```
[VAULT ACADEMY QUIZ]  ─────  [cartoony mascot logo]
              subtitle          (white, ~40x40px)
```

The mascot SVG will be a simple inline illustration:
- Round head with two dot eyes and a curved smile
- Small body/arm holding a pencil at an angle
- All white (`fill="white"`) with slight opacity variations for depth
- Sized at `h-10 w-10`, no background badge — just the character floating

Also add the same mascot (slightly larger) to the completion screen next to the trophy.

### Files changed
- `src/components/academy/LessonQuiz.tsx` — header restructure + inline SVG mascot

