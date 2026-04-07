

## Fix: Vault AI Coach — Bad Responses, Broken Links, Poor Quality

### Problems Identified

After reviewing the full edge function and CoachDrawer code:

**1. Unstable AI Model**
The coach uses `google/gemini-3-flash-preview` — a preview model. Preview models are experimental and produce inconsistent, lower-quality responses. This is the primary cause of "bad coding, bad inputs, bad responses."

**2. Navigation Links Don't Work**
The AI is instructed to output links in a very specific format: `🔗 **Go to:** Label (/path)`. The frontend regex `NAV_PATTERN` only matches this exact pattern. If the AI outputs even slightly different formatting (which preview models do frequently — extra spaces, missing emoji, different bold syntax), the link never renders as a clickable card. The user sees raw markdown text instead of a button.

**3. Video Recommendations Break Similarly**
Same issue — the pattern `📺 **Recommended Lesson:** "Title" in Module` must be exact. Preview models often deviate.

**4. System Prompt Overload**
The system prompt is ~3,500 words with 10+ rule sections. Preview models struggle with long instruction sets and start ignoring rules or hallucinating formats.

### Fix

**1. Upgrade AI Model** (edge function)
Switch from `google/gemini-3-flash-preview` to `google/gemini-2.5-flash` — stable, fast, high-quality, and excellent at following structured output instructions.

**2. Add Resilient Link Parsing** (CoachDrawer.tsx)
Make the nav link regex more flexible to catch common AI format variations:
- Handle with or without emoji
- Handle extra whitespace
- Also detect standard markdown links like `[Label](/path)` that point to academy routes
- Same treatment for video recommendation patterns

**3. Tighten System Prompt** (edge function)
Reduce the system prompt by ~40% — remove redundant sections, consolidate rules, and make the output format instructions clearer and harder to deviate from. The format instructions move to a dedicated "OUTPUT FORMAT" section at the end (models pay most attention to the start and end of prompts).

**4. Add Fallback Navigation Detection** (CoachDrawer.tsx)
If the AI outputs a path like `/academy/live` anywhere in a markdown link, detect it and render it as a clickable NavLinkCard — even if the format doesn't match the emoji pattern.

### Files

| File | Change |
|------|--------|
| `supabase/functions/coach-chat/index.ts` | Switch model to `google/gemini-2.5-flash`, tighten system prompt |
| `src/components/academy/CoachDrawer.tsx` | Make nav link + video regex more resilient, add markdown link fallback detection |

