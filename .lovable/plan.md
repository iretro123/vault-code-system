

## Gamified Trade OS Onboarding + AI Trader Profile Engine

### What We're Building
A premium, iOS-feel onboarding flow that replaces the current V1Onboarding with a multi-step gamified experience. Plus a backend AI "Trader DNA" engine that builds a personalized model for each user, getting smarter with every trade.

### The Onboarding Flow (5 Steps)
Each step is a full-screen card with smooth transitions, progress dots, and one clear action per screen.

1. **Welcome** — "Your Trading OS is ready." Hero animation, single "Let's Go" CTA
2. **Who Are You?** — Pick trading style: Scalper / Day Trader / Swing Trader (replaces old intraday/multi_day binary)
3. **Your Capital** — Enter starting balance with a slick monospaced input, real-time risk preview ("Vault will protect $X/day")
4. **Your Edge** — Pick 1-3 focus areas: Options / Futures / Stocks, and experience level (Beginner / Intermediate / Advanced)
5. **Activation** — Animated "Vault Initialized" confirmation with personalized summary of what the OS just configured

### AI Trader DNA (Backend)

**New DB table: `trader_dna`**
Stores a per-user JSON profile that the AI coach and insights engine read from. Seeded at onboarding, updated after every trade and daily review.

| Column | Type | Purpose |
|--------|------|---------|
| user_id | uuid (PK, FK) | Owner |
| trading_style | text | scalper / day_trader / swing_trader |
| instruments | text[] | What they trade |
| experience_level | text | beginner / intermediate / advanced |
| strengths | jsonb | AI-detected patterns (e.g., "strong morning entries") |
| weaknesses | jsonb | AI-detected leaks (e.g., "revenge trades after losses") |
| personality_tags | text[] | AI-derived labels ("patient", "impulsive on Fridays") |
| insights_version | int | Increments each time AI recalculates |
| last_analyzed_at | timestamptz | |
| raw_profile | jsonb | Full AI analysis blob for coach-chat context |

**New Edge Function: `update-trader-dna`**
- Triggered after trade logs, daily reviews, and weekly recaps
- Pulls last 30 trades + check-in history + vault state
- Calls Lovable AI (Gemini Flash) with structured output to extract patterns
- Merges new insights with existing DNA (never overwrites — accumulates)
- Writes back to `trader_dna`

**Coach-chat integration**: The existing `coach-chat` edge function gets updated to include `trader_dna.raw_profile` in the system prompt context, making the AI coach aware of each user's evolving personality and patterns.

### Technical Changes

**New files:**
- `src/components/vault/TradeOSOnboarding.tsx` — 5-step gamified onboarding component
- `supabase/functions/update-trader-dna/index.ts` — AI profile builder edge function

**Modified files:**
- `src/pages/TraderCockpit.tsx` — Swap `V1Onboarding` for `TradeOSOnboarding`
- `src/components/vault/V1Onboarding.tsx` — Keep as fallback, but no longer imported
- `supabase/functions/coach-chat/index.ts` — Add trader_dna to student context fetch
- `src/hooks/useTradeLog.ts` — After successful trade log, trigger DNA update

**Database migration:**
- Create `trader_dna` table with RLS (user can only read/update own row)
- Update `complete_onboarding` RPC or create new `complete_onboarding_v2` to accept expanded fields (trading_style as scalper/day_trader/swing, instruments, experience_level) and seed the `trader_dna` row
- Update `profiles.default_trading_style` to accept new style values

### Design Details
- Full-screen steps with `animate-in` slide transitions
- Progress indicator: 5 dots at top, active dot glows primary
- Dark glassmorphism cards matching vault aesthetic
- Each step has one emotional headline + one action
- Step 3 (balance) shows a real-time preview: "Your daily risk budget: $X"
- Step 5 plays a subtle "system online" animation before redirecting to the dashboard

