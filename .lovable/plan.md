

## Fix Onboarding Sync + Experience Badge + Reset Button

### Problems Found
1. **Experience level never saved to profile**: `TradeOSOnboarding` writes `experience_level` to `trader_dna` but never updates `profiles.academy_experience` or `profiles.role_level` — so chat badges won't reflect the selection.
2. **Chat role mapping mismatch**: `useRoomMessages.computeRole()` checks for `"veteran"` and `"active"` as experience values, but onboarding writes `"beginner"`, `"intermediate"`, `"advanced"`. These need to be aligned.
3. **No reset onboarding option**: User wants a "Reset System" button in Settings that resets `onboarding_completed`, clears `trader_dna`, and forces the onboarding flow again.

### Changes

**1. `src/components/vault/TradeOSOnboarding.tsx`**
After the `complete_onboarding` RPC call, add a profile update to set `academy_experience` and `role_level` to the selected experience level (`beginner`/`intermediate`/`advanced`).

**2. `src/hooks/useRoomMessages.ts`**
Fix `computeRole()` to also recognize `"beginner"`, `"intermediate"`, `"advanced"` values (in addition to legacy `"veteran"`/`"active"`), so chat badges display correctly for new onboarding users.

**3. `src/components/settings/SettingsSecurity.tsx`**
Add a "Reset Trade OS" button (with confirmation) that:
- Sets `profiles.onboarding_completed = false`
- Deletes the user's `trader_dna` row
- Clears `vault_state` back to defaults
- Navigates to `/academy/trade` to re-trigger onboarding

**4. `src/components/academy/ExperienceLevelBadge.tsx`**
Already supports beginner/intermediate/advanced — no changes needed.

### Testing
After implementation, the flow will be: Onboarding → selects experience → badge shows in chat → can reset from Settings → sees onboarding again.

