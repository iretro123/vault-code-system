

## Fix Mobile Nav Settings Link

**Problem:** The bottom mobile nav links Settings to `/settings` (Vault OS beta settings) instead of `/academy/settings` (the full Academy settings with Profile, Trading Preferences, Billing, Notifications, Security, Help).

**File:** `src/components/layout/MobileNav.tsx`

**Change:** Update line 8 — change the Settings path from `"/settings"` to `"/academy/settings"`. Also update the `isActive` check (line 18) to use `startsWith` so it highlights correctly when on `/academy/settings`.

