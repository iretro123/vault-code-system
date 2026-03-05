

## Plan: Gamified "Claim Your Role" Modal on Dashboard

### What we're building

Instead of redirecting users to `/academy/start`, clicking "Claim Role" from the dashboard (GameplanCard or ClaimRoleBanner) opens a sleek, gamified modal right on the home page. The modal has animated level cards with icons, XP-style theming, and a celebration effect on selection. The role saves permanently to the `profiles` table and auto-evolves as users complete lessons/modules.

### Changes

**1. New component: `src/components/academy/ClaimRoleModal.tsx`**

A Dialog-based modal with:
- 3 role cards (Beginner / Intermediate / Advanced) displayed as large selectable tiles with unique icons (Sprout, Flame, Crown) and color accents (green, blue, purple)
- Each card shows: role name, short description, and a "what you'll focus on" bullet
- Selecting a card highlights it with a glow ring + scale animation
- "Lock In" button saves to `profiles.role_level` + `onboarding_state.claimed_role`
- On save: brief confetti-style success state (checkmark + "Role Claimed!" text with fade-in), then auto-closes after 1.5s
- Clean dark card design consistent with the premium Vault aesthetic

**2. Auto-evolution logic: `src/hooks/useRoleEvolution.ts`**

A hook that checks lesson/module completion counts and auto-upgrades `role_level`:
- 0–2 lessons completed → beginner
- 3–8 lessons → intermediate  
- 9+ lessons → advanced

Runs on dashboard mount, compares current `role_level` with computed level, and silently updates `profiles` if changed. Shows a toast: "You've leveled up to Intermediate!"

**3. Update `src/components/academy/ClaimRoleBanner.tsx`**

Instead of navigating to `/academy/start`, the banner opens the new `ClaimRoleModal` via a state prop.

**4. Update `src/components/academy/dashboard/GameplanCard.tsx`**

The "Claim your role" task (foundation-claim-role) opens the modal instead of navigating to `/academy/start`.

**5. Update `src/pages/academy/AcademyHome.tsx`**

- Add `ClaimRoleModal` state management
- Wire the banner and gameplan card to open it
- Add the `useRoleEvolution` hook call

**6. No database changes needed** — `profiles.role_level` and `onboarding_state.claimed_role` already exist.

### Files
- `src/components/academy/ClaimRoleModal.tsx` (new)
- `src/hooks/useRoleEvolution.ts` (new)
- `src/components/academy/ClaimRoleBanner.tsx` (update)
- `src/components/academy/dashboard/GameplanCard.tsx` (update)
- `src/pages/academy/AcademyHome.tsx` (update)

