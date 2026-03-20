

## Revamp Getting Started Banner + Fix Balance Sync

### 1. Fix balance not loading after onboarding (`AcademyTrade.tsx`)
Add `onboardingDone` to the dependency array of the balance-fetch `useEffect` on line 198, changing `[user]` → `[user, onboardingDone]`. This re-reads `account_balance` immediately after onboarding completes.

### 2. Rewrite `GettingStartedBanner.tsx` with powerful new copy

**Headline:** "Your Trading OS is Active"

**Subtitle:** "This system learns how you trade — your patterns, your habits, your mindset. Every session makes it sharper. You're not doing this alone anymore."

**Step 1 — "Balance locked in ✓"**
- Shows as auto-completed when balance exists
- "Your starting point is set. The OS is tracking from here."

**Step 2 — "Open this before every trade"**
- "Use your Trading OS before you enter any position. Review your limits, check your mindset, and let the system keep you accountable. This is your edge."

**Step 3 — "Meet your AI Coach"**
- "Built into every session is an AI coach that studies your behavior, spots your blind spots, and helps you eliminate bad habits. The more you trade, the smarter it gets. It learns YOU — and pushes you to become the disciplined trader you're meant to be."

**Footer line:** "Consistency is the cheat code. Show up every day and watch this system transform your trading."

### Files Changed
1. `src/pages/academy/AcademyTrade.tsx` — one-line dep array fix
2. `src/components/trade-os/GettingStartedBanner.tsx` — full copy rewrite

