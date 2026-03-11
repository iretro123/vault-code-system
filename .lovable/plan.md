

# Fix custom contract input to allow full clearing

**Problem**: When the user deletes all digits in the custom contracts input, it doesn't clear — the old value persists. They want to be able to clear the field entirely and type a fresh number.

**Solution**: Use a string-based local state for the input display, syncing to the numeric `customContracts` state on valid input.

**File**: `src/components/vault-planner/VaultTradePlanner.tsx`

- Change the input to use a local string state (e.g. `customContractsInput`) that mirrors `customContracts`
- Allow the field to be empty (show empty string when cleared)
- On change: update the string state freely; if parseable as a number ≥ 1, also update `customContracts`
- On blur: if empty or invalid, reset both to `1`
- Keep the ± buttons updating both states

Alternatively (simpler): just change the input to allow empty by storing as string directly:
- `value={customContracts || ""}` won't work since it's a number
- Simplest: track a `customContractsText` string state, default `"5"`, parse on change, commit on blur

~10 lines changed.

