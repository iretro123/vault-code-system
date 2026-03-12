

# Upgrade AI Coach to Knowledge-Aware Luxury System

## What Changes

### 1. Edge Function: `coach-chat/index.ts` — Knowledge-Aware Context Injection
Before calling the AI, fetch the user's education context from **safe, RLS-protected tables only**:

- **`academy_lessons`** — `lesson_title`, `module_title`, `module_slug`, `video_url`, `notes` (visible only). This gives the AI the full curriculum catalog so it can recommend specific lessons and videos.
- **`trade_entries`** — user's last 10 trades for personalized coaching
- **`trading_rules`** — user's own rules for discipline feedback
- **`playbook_chapters`** — chapter titles for playbook references

All fetched using a **service-role client** scoped to the authenticated user's ID — no admin tables, no billing, no secrets.

**Security guardrails added to system prompt:**
- Hard block on discussing admin panels, billing, other users, system internals
- If asked about non-trading topics, redirect to trading education
- Never expose video URLs directly — only reference lesson titles naturally

**Video recommendation logic in prompt:**
- When the AI identifies a topic the user is struggling with or asking about, it matches to relevant `academy_lessons` and suggests them with title + module context
- Uses a specific trigger format: `📺 **Recommended Lesson:** "Lesson Title" in Module Name` — the frontend detects this and renders it as a clickable card that navigates to the lesson

**Model upgrade:** Keep `google/gemini-3-flash-preview` (already fast and capable)

### 2. Frontend: `CoachDrawer.tsx` — Luxury UI + Video Cards

**Luxury visual upgrades:**
- Header: Animated gradient border glow + "Vault AI" branding with pulsing brain icon
- Empty state: Premium greeting using `display_name`, animated sparkle icon
- AI message bubbles: Subtle glassmorphism with `bg-gradient-to-br from-white/[0.06] to-white/[0.02]` + soft border glow
- Typing indicator: 3-dot bounce animation instead of "Thinking..."
- Send button: Gradient background with hover glow effect
- Starter chips: Context-aware (dynamic based on whether user has trades/rules)

**Video recommendation cards:**
- Parse AI responses for the `📺 **Recommended Lesson:**` pattern
- Render as premium cards with play icon, lesson title, module name, and a "Watch Now" button
- On click, navigate to `/academy/learn/{module_slug}` with the lesson pre-selected
- Cards have glassmorphism styling with a subtle blue accent border

**Dynamic starter chips:**
- If user has trades → "How did my last trade go?", "Am I following my rules?"
- If user has no trades → Keep current beginner chips
- Always include: "What should I study next?"

### 3. CSS Animations: `index.css`
- `@keyframes vault-ai-pulse` — subtle brain icon pulse
- `@keyframes vault-ai-glow` — rotating border gradient for the header
- `@keyframes dot-bounce` — 3-dot typing indicator

### Security — What is explicitly excluded
- `user_roles`, `academy_user_roles`, `academy_role_permissions` — RBAC internals
- `stripe_webhook_events`, `allowed_signups` — billing/admin
- `audit_logs`, `system_settings`, `feature_flags` — internal config
- `broadcast_messages` — admin broadcasts
- Any edge function secrets, API keys, or infrastructure details
- Other users' data — only the authenticated user's own records

### Files Changed
- `supabase/functions/coach-chat/index.ts` — Context fetching + upgraded prompt + security guardrails
- `src/components/academy/CoachDrawer.tsx` — Luxury UI, video cards, dynamic chips, animations
- `src/index.css` — New animation keyframes

