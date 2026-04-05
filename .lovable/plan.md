
## Fix: Vault AI / Ask Coach reliability, truthfulness, and true new-conversation behavior

### What’s broken now
1. **“New chat” is not truly new**
   - `CoachDrawer.tsx` keeps `chatMessages` in memory when the drawer closes/reopens.
   - Opening Ask Coach with a fresh question still appends to prior context.
   - Result: stale replies, weird carry-over, and responses that don’t feel like a clean AI assistant session.

2. **Trade math in the backend is wrong for newer trade logs**
   - In `coach-chat/index.ts`, trade P/L is still calculated as `risk_used * risk_reward`.
   - But newer trade entries store `risk_reward` as the **actual signed dollar P/L** when `outcome` exists.
   - That mismatch can explode values and produce nonsense like “down $1 million.”

3. **The AI is over-eager with personal data**
   - The prompt encourages referencing user data broadly.
   - So the model can lead with dramatic trade commentary even when the user just asks a simple question.
   - That makes it feel less like a clean Gemini/ChatGPT-style assistant and more like a buggy audit bot.

4. **Conversation UX is too stateful and not controlled enough**
   - The drawer has a “New” button, but no clear conversation session model.
   - History is stored as isolated Q/A rows, while the live chat is an in-memory thread.
   - This creates a mismatch between what users expect and what the app is doing.

### Implementation plan

#### 1) Make every “new conversation” actually reset
**File:** `src/components/academy/CoachDrawer.tsx`

- Add a dedicated `startNewConversation()` helper that clears:
  - `chatMessages`
  - `chatInput`
  - any streaming state / pending visual state if needed
- Use it in all “fresh start” paths:
  - when user taps **New**
  - when drawer opens from dashboard/sidebar without continuing prior chat
  - when drawer opens with a prefilled question from `AskCoachCard`
- Update the `toggle-coach-drawer` event handling so:
  - plain open/close toggles still work
  - events with a question create a **fresh thread first**, then send the question
- Keep existing conversation only when the user is already inside the open drawer and actively continuing.

#### 2) Fix backend P/L math so coach context is truthful
**File:** `supabase/functions/coach-chat/index.ts`

- Add a small shared P/L helper in the edge function mirroring app logic:
  - if `outcome` exists → use `risk_reward` directly as signed P/L
  - otherwise → use legacy `risk_reward * risk_used`
- Replace all incorrect calculations with that helper:
  - live balance
  - trade snapshot net P/L
  - recent trade list P/L
- This removes the impossible exaggerated loss numbers immediately.

#### 3) Rework the prompt so it behaves like a real assistant first
**File:** `supabase/functions/coach-chat/index.ts`

Refine the system prompt to enforce:
- treat each request as a normal assistant conversation unless the user explicitly asks for:
  - trade review
  - progress review
  - account review
  - rule compliance analysis
- do **not** open with trade stats unless directly relevant
- do **not** infer emotional or performance conclusions from limited data
- if user asks a simple concept question, answer that question first like a normal AI bot
- only reference personalized context when it clearly improves the answer
- if trade data looks inconsistent or incomplete, say so instead of asserting conclusions

This will make the coach feel closer to built-in Gemini/ChatGPT behavior while still being personalized.

#### 4) Add safer context selection instead of dumping everything into every reply
**File:** `supabase/functions/coach-chat/index.ts`

- Keep the current data fetches, but change how the prompt frames them:
  - curriculum is always available
  - student context is available but should be used selectively
- Add explicit instruction hierarchy:
  1. answer the user’s direct question
  2. ask a clarifying question if needed
  3. only then bring in relevant trade/rule/profile context
- Add a “truthfulness” rule:
  - never state a performance claim unless directly supported by the provided data
  - never overstate size, streak, or drawdown
  - if uncertain, say “based on the trades I can see…”

#### 5) Tighten the frontend conversation model
**File:** `src/components/academy/CoachDrawer.tsx`

- Make the header action label clearer:
  - “New Chat” instead of just “New”
- Optionally clear chat on drawer close for AI tab only, if you want the experience to always feel ephemeral and fresh
- Keep “Past Conversations” as a separate history view so users can review old answers without contaminating the active thread
- Ensure starter chips always begin a fresh conversation when no active thread is intended

### Expected result
After this fix:
- Ask Coach opens like a real clean AI assistant
- New question flows start from zero context unless intentionally continued
- No more absurd fake loss summaries from broken P/L math
- Personalized context helps when relevant, but doesn’t hijack every response
- The assistant should feel much closer to a polished built-in Gemini/ChatGPT experience inside Vault

### Files to update
- `src/components/academy/CoachDrawer.tsx`
- `supabase/functions/coach-chat/index.ts`

### Technical notes
- The core bug is confirmed by code:
  - frontend stores active chat in `chatMessages` and only clears it when pressing the “New” button
  - backend still uses legacy `risk_reward * risk_used` math even though newer trade logs store signed dollar P/L directly when `outcome` exists
- No schema change is required for this fix.
