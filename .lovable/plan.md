## Goal

Ship a parallel, video-only membership ("basic-tier") that lives alongside the current app without touching any existing route, role, or RLS policy. Users on this tier get a brand-new signup page, a brand-new home, and access to only the Learn video library (no community, live, trade, coach, dashboard).

All work is additive. Existing `/welcome`, `/signup`, `/auth`, `/academy/*`, `/guest`, and current entitlements stay exactly as they are.

## New routes

```
/basic                  → BasicHome (Continue Watching + Library Grid)
/basic/learn/:slug      → BasicModule (reuses existing lesson player)
/create-account         → CreateAccount (new signup for basic tier)
/basic/welcome          → optional landing (we can skip; /create-account is the entry)
```

`/signup`, `/welcome`, `/auth`, `/academy/*` remain untouched.

## Access model

- Add a new value `'basic_tier'` to the existing `public.app_role` enum (additive — does not affect existing roles `free`, `vault_os_owner`, `vault_access`, `vault_intelligence`, `operator`).
- On successful `/create-account` signup, insert a row into `public.user_roles` with `role = 'basic_tier'` for that user.
- Add a hook `useIsBasicTier()` that returns true when the user has the `basic_tier` role.
- Add a route guard `BasicTierGate`:
  - Basic-tier users hitting `/academy/*`, `/cockpit`, `/log`, `/welcome`, etc. are redirected to `/basic`.
  - Non-basic-tier authenticated users hitting `/basic` are redirected to `/academy/home`.
  - Unauthenticated users hitting `/basic` are redirected to `/create-account`.

No existing RLS policy changes are required: `academy_modules` and `academy_lessons` are already readable by everyone / all authenticated users, so basic-tier users can fetch them through the existing hooks.

## Pages

### `/create-account` (`src/pages/CreateAccount.tsx`)
- Visual clone of `Welcome` + `Signup` style (dark radial gradient, "VAULT OS" wordmark, "Powered by Vault Trading Academy" footer).
- Fields: email, password, display name, agreement checkbox.
- On submit: `supabase.auth.signUp` → on success, insert `user_roles { user_id, role: 'basic_tier' }` → navigate to `/basic`.
- Tiny "Already have an account? Sign in" link → `/auth` (existing).
- No Stripe/billing wired up in this pass — purely role-based.

### `/basic` (`src/pages/basic/BasicHome.tsx`)
Netflix-style continue-watching home:
- Hero strip: "Welcome back, {firstName}" + a "Continue watching" card showing the most recent lesson the user has `lesson_progress` for (or the first lesson if none).
- Library grid: all visible `academy_modules` rendered as cover-image cards in a responsive grid. Clicking a card → `/basic/learn/:slug`.
- Top-right: avatar menu with **Sign out** (reuse existing sign-out call).
- Footer: "Powered by Vault Trading Academy".
- Dark premium styling consistent with current Welcome page.

### `/basic/learn/:slug` (`src/pages/basic/BasicModule.tsx`)
- Lightweight module page: module title + ordered list of lessons with video player.
- Reuses the existing `useAcademyLessons` hook and the same video-player component used in `AcademyModule`.
- Marks lessons complete via existing `lesson_progress` writes.
- Back link → `/basic`.

No sidebar, no community, no live, no trade — basic tier never sees the `AcademyLayout`.

## Routing changes (`src/App.tsx`)

Additive only:
- Lazy-import `CreateAccount`, `BasicHome`, `BasicModule`, `BasicTierGate`.
- Add three `<Route>` entries above the catch-all.
- Wrap `/basic` and `/basic/learn/:slug` with `BasicTierGate`.
- In `BasicTierGate`, when an authenticated user with `basic_tier` lands on any non-`/basic` authenticated page, redirect to `/basic`. Implement this as a small effect in the gate plus a check inside the top of `AcademyLayout` (early return `<Navigate to="/basic" />`) so existing pages don't render for basic users.

## Database migration (single, additive)

```sql
-- Add new enum value
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'basic_tier';
```

That's the only schema change. Role assignment uses the existing `user_roles` table and existing RLS (users can insert their own row at signup time — verify policy; if it requires operator, add a permissive insert policy scoped to `auth.uid() = user_id AND role = 'basic_tier'`).

## Files

**New**
- `src/pages/CreateAccount.tsx`
- `src/pages/basic/BasicHome.tsx`
- `src/pages/basic/BasicModule.tsx`
- `src/components/BasicTierGate.tsx`
- `src/hooks/useIsBasicTier.ts`
- `supabase/migrations/<timestamp>_add_basic_tier_role.sql`

**Edited (minimal, additive)**
- `src/App.tsx` — add three lazy routes + gate import
- `src/components/layout/AcademyLayout.tsx` — early redirect to `/basic` if user is basic tier (one-line guard at the top)

## Out of scope (this pass)

- Stripe checkout / billing for the basic tier
- Public marketing/landing page outside the app
- Admin UI to flip users between tiers (do it via SQL for now)
- Push notifications / email reminders for basic tier
- Mobile native shell changes (Capacitor build works automatically)

## Notes

- The name "basic-tier" is temporary per your direction — easy to rename later by changing the role string and the URL prefix.
- Existing users keep their existing role; nothing about their experience changes.
- Operators and existing tiers continue to see the full app exactly as today.
