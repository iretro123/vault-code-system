

## Add Navigation Buttons to Vault AI Responses

### Problem
When the AI coach mentions pages like `/academy/live`, it just renders as plain text. Users have to manually navigate there. The AI should surface clickable navigation buttons that take users directly to the referenced page.

### Approach
Follow the same pattern as video recommendations — parse a structured format from the AI response, strip it from the markdown, and render as tappable navigation cards below the message.

### Changes

**`supabase/functions/coach-chat/index.ts`** — Add a navigation link format rule to the system prompt:
- Add instruction: When mentioning a page the user should visit, output on its own line: `🔗 **Go to:** PAGE_LABEL (/route/path)`
- Example: `🔗 **Go to:** Live Calls (/academy/live)`
- Keep it to 1-2 nav links max per response, only when relevant

**`src/components/academy/CoachDrawer.tsx`** — Parse and render nav buttons:
- Add a `parseNavigationLinks` function (regex pattern: `🔗 \*\*Go to:\*\*\s*(.+?)\s*\((/[^\)]+)\)`)
- Strip nav link lines from displayed markdown (same approach as video recs)
- Render parsed links as styled navigation cards below the message bubble, before the actions row
- Each card shows the label + route with an arrow icon, and uses `useNavigate` to navigate + close the drawer on tap
- Use the same card style as `VideoCard` but with a navigation icon (e.g., `ExternalLink` or `ArrowRight`)

### Route map available to AI
The system prompt already has the full APP NAVIGATION section with all routes. The AI just needs the output format instruction to trigger the parsing.

### Files Changed
- `supabase/functions/coach-chat/index.ts`
- `src/components/academy/CoachDrawer.tsx`

