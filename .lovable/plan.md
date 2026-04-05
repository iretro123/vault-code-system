

## First-Login Luxury Onboarding Experience

### Overview

Create a full-screen, multi-step onboarding flow that fires ONLY on a user's very first login (before `profile_completed` is true). It replaces the current `/academy/profile` page approach with an immersive, gamified walkthrough that teaches users what each section of the app does, collects their profile info, and marks them as onboarded. Think Robinhood's first-launch experience: full-bleed dark screens, big typography, smooth slide transitions, progress indicator, and a cinematic "activation" finale.

### Gating Logic

Add a check in `AcademyLayoutInner` (after auth/access checks resolve): if `profile?.profile_completed` is falsy, render `<AppOnboarding />` instead of the normal layout. This means first-time users see NOTHING of the sidebar/dashboard until they complete onboarding. Once done, `profile_completed` is set to `true` in the DB and the layout renders normally. Second login onwards skips this entirely.

### Steps (7 screens)

1. **Welcome** — Cinematic hero. "Welcome to Vault Academy" with a subtle animated glow. Large CTA: "Let's Set Up Your Vault". Sets the tone.

2. **Your Identity** — First name, last name, display name, timezone auto-detected. Optional avatar upload (reuse existing crop logic from `AcademyProfileForm`). Clean form, big inputs, dark luxury card.

3. **Your Experience** — Pick experience level (Beginner / Intermediate / Advanced). Each option is a large selectable card with a short description. Sets `role_level` and `academy_experience`.

4. **Your Vault Tour** — This is the "sticky" educational step. Shows each sidebar section one at a time with a large icon, title, and 1-line description:
   - **Dashboard**: Your command center. See what to do next, every day.
   - **Learn**: Video lessons that build your trading foundation.
   - **Trade OS**: Your personal risk cockpit. Tracks every session.
   - **Community**: Connect with other traders. Share wins, get feedback.
   - **Live**: Join live coaching calls with real traders.
   - **Ask Coach**: Your AI-powered trading mentor, available 24/7.
   
   Each item slides in one by one with a tap/swipe to advance (auto-advances on mobile with a subtle animation). Progress dots show advancement through the 6 items.

5. **Your Trading Goal** — Simple single-select: "What's your #1 goal right now?" Options: "Build consistency", "Manage risk better", "Find my edge", "Stay accountable". Saved to profile as `trading_goal`.

6. **Notifications Permission** — Clean ask for push notification permission (if on mobile/PWA). Skip button available. Not a hard gate.

7. **Activation** — Cinematic finale. Animated checkmark with glow. "Your Vault is Ready." Shows a summary of their selections. 2-second auto-advance into the dashboard.

### Technical Details

**New files:**
- `src/components/onboarding/AppOnboarding.tsx` — Main component with step state machine, all 7 screens
- `src/components/onboarding/OnboardingStep.tsx` — Reusable wrapper with slide animation, progress dots
- `src/components/onboarding/VaultTourCarousel.tsx` — The sidebar-feature tour carousel (step 4)

**Modified files:**
- `src/components/layout/AcademyLayout.tsx` — Add onboarding gate before normal layout render
- `supabase/migrations/` — Add `trading_goal` column to profiles table (nullable text)

**Design system:**
- Full-screen dark background with the same ambient radial gradients from `AcademyLayout`
- Each step uses `animate-in fade-in slide-in-from-bottom-4 duration-500` for entrance
- Progress dots bar at top (same style as TradeOSOnboarding but wider, 7 steps)
- Cards use `vault-luxury-card` styling — solid dark surface, 16px radius, subtle blue edge glow
- CTAs use `vault-cta` class — full-width, h-14, uppercase tracking, shimmer on final activation
- No pills, no weak icons — large custom SVG-style icons or Lucide at 32-40px with glowing containers
- Avatar upload reuses the existing `cropToSquare` utility from `AcademyProfileForm`

**Data persistence:**
- On final step, single batch update to `profiles` table: `display_name`, `first_name`, `last_name`, `timezone`, `role_level`, `academy_experience`, `trading_goal`, `profile_completed: true`
- Also upserts `onboarding_state` with `claimed_role: true`
- Calls `refetchProfile()` to update auth context and dismiss the gate

**What happens to existing pages:**
- `/academy/profile` keeps its redirect logic (already redirects if `profile_completed` is true)
- `/academy/start` keeps working but users won't hit it naturally anymore since the new onboarding covers role selection

### Files Changed
- `src/components/onboarding/AppOnboarding.tsx` (new)
- `src/components/onboarding/OnboardingStep.tsx` (new)
- `src/components/onboarding/VaultTourCarousel.tsx` (new)
- `src/components/layout/AcademyLayout.tsx`
- New migration: add `trading_goal` text column to profiles

