

## Upgrade AI Focus Card to Real AI-Powered Mentor Feedback

### What Changes
Replace the hardcoded static `AIFocusCard` with a real AI-powered component that fetches the user's trade log, sends it to an edge function, and returns personalized mentor feedback. Requires minimum 3 logged trades to activate.

### Architecture

```text
User logs trade → entries ≥ 3? → Edge function "trade-focus"
                                    ├─ Reads last 20 trade_entries from DB
                                    ├─ Builds structured summary (symbols, outcomes, P/L, notes, rules followed, emotional state)
                                    ├─ Sends to Lovable AI (gemini-3-flash-preview)
                                    └─ Returns structured JSON via tool calling:
                                        { topMistake, focusRule, pattern, encouragement }

Frontend AIFocusCard
  ├─ entries.length < 3 → locked state with futuristic "scanning" UI
  ├─ entries.length ≥ 3 → calls edge function, caches result in localStorage (1 per day)
  └─ Renders AI response with animated futuristic styling
```

### Changes

**1. New edge function: `supabase/functions/trade-focus/index.ts`**
- Auth check (same pattern as coach-chat)
- Reads last 20 `trade_entries` for the authenticated user using service role
- Builds a trade summary prompt with: symbol, outcome, P/L, followed_rules, emotional_state, notes
- Calls Lovable AI with tool calling to extract structured output: `{ topMistake, focusRule, pattern, encouragement }`
- Returns JSON response (no streaming needed)

**2. Update `supabase/config.toml`**
- Add `[functions.trade-focus]` with `verify_jwt = false`

**3. Rewrite `AIFocusCard` in `src/pages/academy/AcademyTrade.tsx`**
- Accept `entries` prop (the full trade entries array)
- If `entries.length < 3`: show locked state with futuristic scan animation ("3 trades required to activate AI analysis")
- If `entries.length ≥ 3`: call `trade-focus` edge function on mount (cache result per day in localStorage)
- Display: loading shimmer → then topMistake, focusRule, pattern, encouragement
- Futuristic glass UI: scan-line animation, glowing primary accent, subtle pulse on the Brain icon
- "View reviewed trades" button stays functional

### UI Design (Futuristic)
- Dark glass card with subtle animated gradient border (CSS keyframe)
- Pulsing Brain icon with glow effect
- Section labels styled as "SYSTEM ANALYSIS" / "PATTERN DETECTED" / "DIRECTIVE"
- Scan-line CSS animation across the card on load
- Locked state shows a radar/scan animation with trade count progress (e.g., "1/3 trades scanned")

### Edge Function Prompt Strategy
The system prompt instructs the AI to act as a trading mentor analyzing the student's recent trade log. It uses tool calling to return exactly:
- `topMistake`: The most common error pattern (1 sentence)
- `focusRule`: A specific actionable rule for their next trade (1 sentence)  
- `pattern`: A behavioral pattern observed (e.g., "You tend to oversize on loss days")
- `encouragement`: One line of real coaching encouragement

