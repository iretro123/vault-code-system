

# Redesign: Insufficient Data State in Performance Intelligence

## Problem
When the AI returns `primaryLeakConfidence: "insufficient"`, the slides show grey/muted text like "NEEDS MORE DATA" and "Insufficient data to identify primary leak with confidence. Log more trades." — this feels like an error message. Users think they did something wrong instead of understanding they're on a progression path.

## Solution
When `isInsufficient` is true, replace the standard 4-slide carousel with a **single progress-oriented card** that feels like a milestone tracker, not an error. Think iOS unlock screen.

### New Insufficient Data UI

Replace the carousel entirely when `isInsufficient` with a single branded card:

1. **Progress ring** — circular progress indicator showing trades logged vs. 10 (the threshold for medium confidence) or 20 (for high confidence). Use `{tradeCount}/10` with a smooth arc.

2. **Headline**: "Log {remaining} more trades to unlock full analysis" — positive, forward-looking.

3. **Mini milestone pills** showing what unlocks at each tier:
   - `3 trades` — Basic scan (check, already unlocked)
   - `10 trades` — Pattern detection (locked/unlocked based on count)
   - `20 trades` — Full behavioral audit (locked)

4. **Subtle CTA**: "Log a Trade" button linking to the trade logger section.

5. **Keep the Risk Grade badge** visible but dimmed (shows them it exists).

6. Maintain the same card chrome (border glow, scan lines) so it feels part of the system, not a fallback.

### Edge function prompt update
Update `supabase/functions/trade-focus/index.ts` — when `dataConfidence` is low, instead of returning "Insufficient data..." text, return a shorter message like "Building your profile. More trades needed for reliable detection." This way even if the UI doesn't catch the insufficient state, the text is still friendly.

| File | Change |
|---|---|
| `src/pages/academy/AcademyTrade.tsx` | Add `InsufficientDataCard` component; render it instead of carousel when `isInsufficient`; add progress ring SVG and milestone pills |
| `supabase/functions/trade-focus/index.ts` | Update prompt to return friendlier copy when data confidence is low |

