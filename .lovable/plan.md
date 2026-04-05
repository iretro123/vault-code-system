

## Fix Coach Drawer Issues + Upgrade AI Coach Experience

### Problems Identified

1. **"Yes" gives random response**: The `toggle-coach-drawer` event handler (line 154) has an empty dependency array `[]`, so `handleChatSend` inside the `setTimeout` captures a stale closure — it sends the question but `chatMessages` is always empty at that point. When the user types "yes" directly in the coach chat, this works correctly (the AI sees full history). The real issue is that the visuals trigger phrase fires automatically — the AI says "Here are some real chart examples" which triggers chart images even when the context may not warrant it. The system prompt's VISUALS RULE tells the AI to ask first, but once the user says "yes", the AI uses the trigger phrase and the client auto-injects chart images regardless of topic.

2. **Input cut off on mobile**: The modal uses `h-[95vh]` which on mobile (especially iOS with address bar) pushes the bottom composer below the visible area. Need `h-[100dvh]` with safe-area padding, or reduce to `h-[90vh]` with `pb-safe`.

3. **AI quality upgrade**: The system prompt lacks awareness of the app's features and navigation. It can't guide users to specific pages or explain what the platform offers. Adding an APP NAVIGATION section to the system prompt will let the AI direct users properly.

### Changes

**1. `src/components/academy/CoachDrawer.tsx` — Fix mobile cutoff + stale closure**

- Change modal height from `h-[95vh]` to `h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))]` on mobile, keeping `md:max-h-[85vh]` on desktop
- Add `pb-[env(safe-area-inset-bottom)]` to the composer container so it never hides behind iOS home bar
- Fix the `useEffect` dependency: the event handler needs access to current `chatMessages` and `handleChatSend`. Use a ref to hold the latest `handleChatSend` so the event listener doesn't go stale
- Make the chart trigger detection smarter: only inject chart images if the conversation context actually discussed supply/demand (check last few messages, not just the AI's response)

**2. `supabase/functions/coach-chat/index.ts` — Upgrade system prompt**

Add a new `APP NAVIGATION & FEATURES` section to the system prompt so the AI knows what the platform offers and can guide users:

```
APP NAVIGATION & FEATURES (use these to guide students):
- Dashboard (/academy/home): Their command center — shows next steps, upcoming calls, progress
- Learn (/academy/learn): Video lessons organized by module — supply/demand, risk, mindset, etc.
- Trade (/academy/trade): Where they log trades, journal, and get feedback
- Community (/academy/community): Trade Floor chat, Wins, Announcements, Daily Setups, Signals
- Live (/academy/live): Upcoming and past live coaching calls
- Trade OS (/academy/vault-os): Their personal trading cockpit — risk management, session tracking, discipline scoring
- Playbook (/academy/playbook): Step-by-step trading playbook with checkpoints
- Settings (/academy/settings): Profile, notifications, billing

When a student asks "where do I..." or "how do I..." about the platform:
- Tell them the exact page and what they'll find there
- Example: "Head to Trade → Log a Trade to post your setup. It'll show up in your journal and the Trade Floor."

When giving advice, connect it to platform actions:
- Instead of just "track your trades", say "Log it in Trade so your coach can review it and your Vault Score updates."
- Instead of just "review your risk", say "Check your Trade OS — it shows your risk budget and daily limits in real-time."
```

Also update the coaching mindset to be more conversational and ChatGPT-like:
- Remove the strict "3-5 sentences max" rule, change to "Be concise but thorough. Short for simple questions, longer for complex ones."
- Add: "Match the student's energy. If they're casual, be casual. If they're detailed, be detailed."
- Add: "When unsure what they mean, ask a clarifying question instead of guessing."

**3. Improve chart trigger logic in CoachDrawer.tsx**

Instead of blindly checking if the AI response contains trigger phrases, verify the conversation topic was actually about supply/demand or imbalances before injecting chart images. Check if any of the last 4 messages mention supply, demand, zone, or imbalance.

### Files Changed
- `src/components/academy/CoachDrawer.tsx`
- `supabase/functions/coach-chat/index.ts`

