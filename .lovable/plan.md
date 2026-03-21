

## Add Dismissible X Button to Getting Started Banner with Confirmation

### What changes

**1. Database: Add `getting_started_dismissed` column to `profiles` table**
- New nullable `boolean` column, default `false`
- Persists the user's choice across sessions/devices

**2. `GettingStartedBanner.tsx` — Add X button + confirmation dialog**
- White X button in the top-right corner of the banner card
- Clicking X opens an AlertDialog requiring the user to type "CONFIRM"
- Small warning: "This will permanently hide the Getting Started guide. Make sure you've completed all steps."
- On confirm, calls `onDismiss()` callback

**3. `AcademyTrade.tsx` — Wire dismiss logic**
- Fetch `getting_started_dismissed` from the user's profile
- Banner shows when `!hasData && !dismissed`
- On dismiss: update `profiles.getting_started_dismissed = true` via Supabase, update local state immediately

### Files changed
1. **Migration** — `ALTER TABLE profiles ADD COLUMN getting_started_dismissed boolean NOT NULL DEFAULT false`
2. **`src/components/trade-os/GettingStartedBanner.tsx`** — Add X button + AlertDialog with "CONFIRM" typed input
3. **`src/pages/academy/AcademyTrade.tsx`** — Read dismissed state from profile, pass `onDismiss` prop, update DB on confirm

