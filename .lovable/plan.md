

## Lock Tier Toggle When Account Size Is Entered

**Problem**: Users enter an account size (auto-detecting the correct tier), then accidentally click a different tier — which overrides their risk settings and causes confusion.

**Solution**: When an account size is entered, the tier toggle becomes read-only (visually dimmed, not clickable). The tier is always auto-detected from the account size. When the user clears the account size field, everything resets.

### Changes to `src/components/vault-planner/VaultTradePlanner.tsx`

1. **Remove `autoTierEnabled` state** — tier is now always auto-detected when account size exists, never manually overridable.

2. **Remove `handleTierChange`** — no longer needed since the toggle is locked when an account size is present.

3. **Make the `SegmentedToggle` disabled when `acctSize > 0`** — add a `disabled` prop to the toggle component. When disabled, buttons get `opacity-50 cursor-not-allowed pointer-events-none` styling. When no account size is entered, the toggle remains clickable to let users preview tier defaults.

4. **Auto-reset on clear** — update the `accountSize` effect: when account size is empty/zero, reset tier to "Small" and restore default percentages (same as current reset behavior).

5. **Update `SegmentedToggle` component** — add optional `disabled` prop that prevents clicks and dims the UI.

### No other changes
- No layout changes, no new files, no logic changes to the calc engine.

