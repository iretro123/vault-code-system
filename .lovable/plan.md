

# Upgrade: AI Mentor → Trading Performance Intelligence Engine

## Problem
The edge function sends raw text rows to the AI and hopes for specific output. The AI invents patterns because it has no pre-computed stats. There's no progression tracking, no confidence thresholds, no structured evidence chain, and too many output fields competing for attention.

## Architecture: Compute First, Then Narrate

The key shift: **the edge function becomes the analytics engine**. It computes hard behavioral metrics server-side, then feeds the AI pre-computed facts it can narrate — not raw data it has to interpret.

## Changes

### 1. Edge Function `supabase/functions/trade-focus/index.ts` — Full Rewrite

**Data expansion**: Fetch last 50 trades (not 20) + `trading_rules` for the user's own configured limits.

**Pre-computation layer** (all computed before the AI call):

| Metric | How | Fields Used |
|---|---|---|
| Sizing consistency | Std deviation of `risk_used`, mean, min, max | `risk_used` |
| Revenge sizing | After each loss, compare next trade's `risk_used` to mean. Flag if >30% above avg | `risk_used`, `risk_reward` |
| Overtrading | Group by `trade_date`, count per day, compare outcomes on high-count days vs low | `trade_date` |
| Time-of-day perf | Extract hour from `trade_date`, bucket AM (pre-11) / Midday (11-14) / PM (14+), win rate per bucket | `trade_date`, `risk_reward` |
| Symbol perf | Group by `symbol`, per-symbol win rate + avg R | `symbol`, `risk_reward` |
| Post-loss behavior | For each loss, check next trade: did `followed_rules` drop? Did `emotional_state` drop? | Sequential analysis |
| Plan adherence | Trades with `plan_id` vs without — compare win rates | `plan_id`, `risk_reward` |
| R-multiple distribution | Avg winner R, avg loser R, best, worst | `risk_reward` |
| Rule-breaking patterns | Correlate `followed_rules=false` with time of day, symbol, emotional state | Multi-field |
| **Progression**: recent 10 vs prior 10 | Compare win rate, compliance, avg risk, avg emotional state between halves | All fields |
| Confidence flags | Boolean flags like `hasRevengeSizing` (only true if 3+ instances), `hasOvertradingPattern` (3+ days with >configured max) | Computed |

**Data sufficiency check**: If < 10 trades, mark `dataConfidence: "low"` and instruct the AI to state evidence gaps explicitly.

**Restructured system prompt**:
- Opens with pre-computed stats block (hard numbers, not raw rows)
- Includes progression delta (recent vs prior)
- Includes confidence flags
- Strict instructions: "If a confidence flag is false, you MUST say 'Not enough evidence yet' for that field. Do NOT invent patterns."
- Tone directive: "Sound like a performance auditor. No motivational language. No filler. Every sentence must reference a number."

**New output schema** (reduced from 9 fields to 6 focused ones):

```
primaryLeak: string          // #1 performance killer — with evidence, risk, and fix
primaryLeakConfidence: "high" | "medium" | "insufficient"
strongestEdge: string        // What's working — with evidence
nextAction: string           // Single most important thing to do next session
progressVerdict: string      // Improving/declining/flat — comparing recent vs prior with numbers
riskGrade: "A" | "B" | "C" | "D" | "F"
dataDepth: number            // How many trades analyzed (shown to user)
```

Each field is a single focused block. No `encouragement`, no `focusRule`, no `nextSessionTip` — those are merged into the 3-field core: leak, edge, action.

**Model**: Switch to `google/gemini-2.5-pro` for deeper reasoning on the richer dataset.

### 2. Frontend `src/pages/academy/AcademyTrade.tsx` — `AIFocusResult` + Carousel

**Updated interface**:
```ts
interface AIFocusResult {
  primaryLeak: string;
  primaryLeakConfidence: "high" | "medium" | "insufficient";
  strongestEdge: string;
  nextAction: string;
  progressVerdict: string;
  riskGrade: "A" | "B" | "C" | "D" | "F";
  dataDepth: number;
  date: string;
  tradeCount: number;
}
```

**Carousel slides reduced to 4** (clean, not overwhelming):

1. **PRIMARY LEAK** (red accent) — The biggest issue with evidence. Shows confidence badge ("HIGH CONFIDENCE" / "NEEDS MORE DATA"). This is the hero slide.
2. **STRONGEST EDGE** (emerald accent) — What's actually working, backed by numbers.
3. **NEXT ACTION** (blue accent) — The single thing to do before the next session.
4. **PROGRESS** (gradient accent) — Improving/declining/flat with the comparison data.

**Risk Grade badge** in the header (color-coded A=emerald through F=red), replacing the discipline badge.

**Data depth indicator**: "Based on 47 trades" shown in header subline.

**Confidence handling**: If `primaryLeakConfidence === "insufficient"`, the leak slide shows a muted state with "Need more trade data to identify your primary leak with confidence" instead of fabricated insight.

**Remove the encouragement/coach-note final slide entirely**. No motivational fluff.

### Summary

| File | What |
|---|---|
| `supabase/functions/trade-focus/index.ts` | Full rewrite: 50 trades, pre-compute 10+ behavioral metrics, progression tracking, confidence flags, reduced/focused AI schema, gemini-2.5-pro |
| `src/pages/academy/AcademyTrade.tsx` | New `AIFocusResult` interface (6 fields), 4-slide carousel, risk grade badge, confidence states, no fluff slides |

