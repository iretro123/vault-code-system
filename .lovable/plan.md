

## Smart Coach: Ask Before Showing Images + Deep Trading Knowledge

### Problem
The coach currently auto-dumps all chart images the moment it mentions a trigger phrase. It should **ask first** ("Want to see a real chart example?") and only show images when the user says yes. The coach also needs deeper knowledge of core trading concepts to give proper, simplified responses.

### Changes

**1. Update system prompt (`supabase/functions/coach-chat/index.ts`)**

Replace the current image trigger rule with:
- "If a visual would help, **ask the user first**: 'Want me to show you a real chart example?' Do NOT auto-show images. Wait for them to say yes."
- Add trigger phrases the AI should use ONLY after user confirms: "Here are some real chart examples" (for supply/demand) or "Here's a real chart showing what an imbalance looks like" (for imbalances)

Add a `TRADING KNOWLEDGE` section to the system prompt with simplified definitions:
- **Supply Zone**: Area where big sellers stepped in, pushing price down. When price comes back, it often drops again.
- **Demand Zone**: Area where big buyers stepped in, pushing price up. When price returns, it often bounces up again.
- **Imbalances**: When smart money places huge orders that overwhelm the other side — not enough buyers to match sellers (or vice versa). Price moves fast, leaving a gap. When price revisits that gap later, it usually slows down and can reverse. It's like "unfinished business" the market comes back to.
- **Market Structure**: The pattern of higher highs/higher lows (uptrend) or lower highs/lower lows (downtrend). A break of structure means the trend is shifting.
- **Smart Money Concepts (SMC)**: The idea that big institutions (banks, hedge funds) move markets. Retail traders can learn to read their footprints — supply/demand zones, imbalances, and liquidity grabs.
- **Liquidity**: Clusters of stop losses sitting above highs or below lows. Smart money often pushes price into these areas to fill their orders before reversing.

Add a `CONTEXT` section: "You are inside Vault Academy — a premium trading education platform focused on structured learning, disciplined trading, and coaching. Students are mostly beginners learning supply/demand, smart money concepts, and risk management."

**2. Update auto-trigger logic (`src/components/academy/CoachDrawer.tsx`)**

Change the current auto-insert behavior:
- Keep the trigger phrase detection but only fire when the AI has confirmed (i.e., user asked for it and AI responds with the trigger phrase)
- This already works correctly since the AI will only say the trigger phrase after the user confirms — no code logic change needed for the "ask first" part, it's purely a prompt change
- The existing auto-trigger logic stays as-is (it fires when AI says the phrase, which now only happens after user confirms)

**3. Deploy edge function**

### Files
- **Edit** `supabase/functions/coach-chat/index.ts` — rewrite system prompt with ask-first rule + trading knowledge base
- **Deploy** `coach-chat`

