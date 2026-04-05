

## Fix: AskCoachCard Text Not Passed to Coach Drawer

### Problem
When a user types a question in the AskCoachCard input and hits Enter/Send, the drawer opens but the text is lost. The user has to retype their question. This is because:
1. `AskCoachCard` dispatches `toggle-coach-drawer` without including the typed text
2. `CoachDrawer` doesn't look for any `question` field in the event detail

### Changes

**1. `src/components/academy/dashboard/AskCoachCard.tsx`**
- Pass the typed text in the CustomEvent detail: `new CustomEvent("toggle-coach-drawer", { detail: { tab: "instant", question: value } })`
- Only clear `value` after dispatching
- If input is empty, still open the drawer (current behavior)

**2. `src/components/academy/CoachDrawer.tsx`** (event handler ~line 154)
- In the `toggle-coach-drawer` handler, check for `detail?.question`
- If a question string is present: set `tab` to `"instant"`, set `chatInput` to the question text, force `open` to `true` (not toggle), and auto-trigger `handleChatSend` after a short delay so the AI starts responding immediately
- If no question: keep current toggle behavior

This way, typing a question in the dashboard card opens the drawer and immediately sends it to the AI coach — no retyping needed.

### Files Changed
- `src/components/academy/dashboard/AskCoachCard.tsx`
- `src/components/academy/CoachDrawer.tsx`

