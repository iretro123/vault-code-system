

# Replace contract count stepper span with editable input

**Current**: The custom size section shows `−  5  +` where the number is a non-editable `<span>`. Users can only use the stepper buttons.

**Change**: Replace the `<span>` on line 437 with a small `<input>` that allows direct typing while keeping the ± buttons on either side.

**File**: `src/components/vault-planner/VaultTradePlanner.tsx`

- Replace the `<span>` displaying `customContracts` with an `<input type="number">` (or text with numeric filtering)
- Style: `w-10 text-center text-base font-bold tabular-nums bg-transparent border-b border-white/10 outline-none` — minimal, matches the premium feel
- On change: parse to integer, clamp to `Math.max(1, value)`, update `setCustomContracts`
- On blur: if empty or invalid, reset to 1
- Keep the `−` and `+` buttons flanking it exactly as they are now

One small change, ~5 lines affected.

