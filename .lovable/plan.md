

## Dashboard Optimization — Simplified, Futuristic Layout

### Overview
Redesign the Academy dashboard to match the reference screenshot's clean card-based flow. Remove 3 cards (Trade OS, Coach bio, Live Calls list) and replace with 3 new premium cards: **Next Group Call** (with live countdown timer), **Start Learning** (latest uploaded lesson), and **Ask Coach** (inline input that opens coach drawer).

### Current Dashboard Layout
1. HeroHeader (greeting + Quick button) — **KEEP**
2. GameplanCard ("Your Onboarding") + MyTradesCard grid — **KEEP GameplanCard, REMOVE MyTradesCard**
3. CoachCard (RZ bio + "Meet Your Personal Trading Coach") — **REMOVE**
4. LiveCallsCard (list of upcoming calls) — **REMOVE**
5. QuickAccessRow (5 icon buttons) — **REMOVE**

### New Dashboard Layout (top to bottom)
1. **HeroHeader** — keep as-is
2. **GameplanCard** — keep, full width (remove the grid split with MyTradesCard)
3. **NextGroupCallCard** — NEW: shows next scheduled `live_sessions` row, live countdown timer (days/hours/minutes/seconds), "View Calls →" button linking to `/academy/live`. Gold/amber accent like reference.
4. **StartLearningCard** — NEW: queries `academy_lessons` ordered by `created_at DESC LIMIT 1`, shows module title, lesson title, duration estimate, "Start Module →" button. Green dot + "START LEARNING" badge.
5. **AskCoachCard** — NEW: clean card with icon, description text, input field. Clicking send or pressing Enter opens the coach drawer (dispatches `toggle-coach-drawer` event). Minimalist like reference.

### Changes

**File: `src/components/academy/dashboard/NextGroupCallCard.tsx`** — NEW
- Query `live_sessions` for next upcoming session (`session_date > now()`, order ASC, limit 1)
- Live countdown timer using `setInterval` every second — displays days/hours/minutes/seconds in styled pill badges (dark bg, amber text like reference)
- "View Calls →" full-width amber/gold gradient button → navigates to `/academy/live`
- `vault-luxury-card` wrapper with subtle gold border accent

**File: `src/components/academy/dashboard/StartLearningCard.tsx`** — NEW
- Query `academy_lessons` joined with `academy_modules` for the most recently created visible lesson
- Shows: green "START LEARNING" badge, module title (small caps), lesson title (bold white), duration, "Start Module →" amber button
- Links to `/academy/learn/{module_slug}` or the module page

**File: `src/components/academy/dashboard/AskCoachCard.tsx`** — NEW
- Icon + "Ask Coach" title + subtitle text
- Text input with send button
- On submit: opens coach drawer via `window.dispatchEvent(new CustomEvent("toggle-coach-drawer"))` — the input is just a trigger, not actual message sending
- Clean dark card, subtle border

**File: `src/pages/academy/AcademyHome.tsx`** — MODIFY
- Remove imports: `MyTradesCard`, `CoachCard`, `LiveCallsCard`, `QuickAccessRow`
- Remove the `lg:grid-cols-5` grid — make `GameplanCard` full width
- Add the 3 new cards below GameplanCard in a vertical stack
- Order: HeroHeader → GameplanCard → NextGroupCallCard → StartLearningCard → AskCoachCard

### Design Language
- All cards use `vault-luxury-card` class
- Gold/amber accent for CTAs (matching reference's warm gold buttons)
- Countdown pills: dark rounded backgrounds with amber text
- Clean spacing, no clutter, futuristic dark aesthetic

