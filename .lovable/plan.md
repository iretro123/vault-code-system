

## Luxury Quiz Upgrade

### Overview
Elevate the quiz from a basic card to a premium, polished component matching the Vault luxury design system — layered backgrounds, subtle glows, refined typography, smooth micro-interactions.

### Changes

**File: `src/components/academy/LessonQuiz.tsx`** — full visual overhaul:

1. **Outer card** — Replace flat `bg-[hsl(var(--card))]` with layered radial gradient background (dark center, subtle blue edge glow), thicker border with `border-white/[0.06]`, and `shadow-[0_10px_40px_rgba(0,0,0,0.5)]` for depth

2. **Header** — Add a subtle top-edge shimmer line (1px gradient from transparent → primary → transparent), make "VAULT OS QUIZ" use letter-spacing (`tracking-widest`), add a small shield/brain icon beside it

3. **Progress bar** — Replace plain dots with segmented glass-style bar (like XPProgressBar), completed segments glow primary blue with a subtle pulse on the active segment

4. **Teaching line** — Upgrade to a premium inset card with left accent border (2px solid primary), slightly deeper background, and a `Lightbulb` icon instead of emoji

5. **Question text** — Bigger (`text-xl`), white, bold, with slight text-shadow for depth

6. **Answer options** — Larger touch targets (`py-4`), letter badges with ring borders, hover lift effect (`hover:-translate-y-0.5 hover:shadow-lg`), correct = emerald glow border + bg, wrong = red glow, idle = subtle border with hover brightening

7. **Hint card** — Amber left-border accent, slightly more prominent

8. **Explanation card** — Emerald left-border accent, clean

9. **Next button** — Full-width gradient button with subtle glow on hover (`shadow-[0_0_16px_hsl(217_91%_60%/0.15)]`)

10. **Completion screen** — Trophy with animated glow ring, score displayed as a large fraction, quote in italic serif-like styling, "Retake" button ghost-styled

**File: `src/index.css`** — Add 2 small utility animations:
- `.vault-quiz-glow` — subtle pulsing blue glow for active progress segment
- `.vault-quiz-trophy-ring` — rotating ring animation for completion trophy

### Result
The quiz feels like a premium interactive experience — clean, dark, elevated with subtle depth cues and micro-interactions. No glass/transparency — solid dark luxury surfaces throughout.

