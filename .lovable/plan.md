

## Fix: Privacy Delete Should Also Reset Onboarding

### Root Cause
"Delete Journal & Progress" in `SettingsPrivacy.tsx` resets `account_balance` to 0 but never sets `onboarding_completed = false`. The onboarding gate in `AcademyTrade.tsx` checks `profile.onboarding_completed` — still `true` — so the onboarding flow never reappears. Additionally, `vault_state`, `vault_events`, and `trader_dna` are not cleaned up, and the cached profile in `useAuth` is never refreshed.

### Changes

**1. `src/components/settings/SettingsPrivacy.tsx`**
- After deleting trade entries and journal entries, also:
  - Set `onboarding_completed = false` and `account_balance = 0` on the profile (already does balance)
  - Delete `trader_dna` row for the user
  - Delete `vault_state` row for the user
  - Delete `vault_events` for the user
- Call `refetchProfile()` from `useAuth` after all deletes complete, so the in-memory profile updates immediately
- Navigate to `/academy/trade` so onboarding triggers

**2. `src/components/settings/SettingsSecurity.tsx`**
- In `handleResetTradeOS`, also call `refetchProfile()` after resetting `onboarding_completed = false`, so the profile cache is updated without requiring a page reload

### Technical Detail
Both components need to import `refetchProfile` from `useAuth()` and call it after mutating the profile. Without this, the React state still holds the old `onboarding_completed: true` value from the cached profile, and the gate never fires.

### Data I need to reset now (via insert tool)
- Set `onboarding_completed = false` for user `6f863212-a859-4812-9775-0b1388bc21b3` so onboarding shows immediately for testing

