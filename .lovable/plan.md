

## Auto-Fill Stop Price When Using "Use Ideal" / "Use Max" Chips

**Problem**: When a user clicks "Use Ideal" or "Use Max", only the Buy Price is filled. The Stop Price stays empty, forcing the user to manually calculate/enter it.

**Solution**: When either chip is clicked, also auto-fill the Stop Price with the suggested stop value (`lowestStop = entryVal - maxStopW`, floored at 0.01). This uses the same "Suggested stop" value already shown in the guidance text.

### Changes in `src/components/vault-planner/VaultTradePlanner.tsx`

**Lines 429-430** — Update the two `GuidanceChip` onClick handlers:

Currently:
```typescript
<GuidanceChip label="Use Ideal" onClick={() => setEntryPremium(idealPrem.toFixed(2))} />
<GuidanceChip label="Use Max" onClick={() => setEntryPremium(aggressivePrem.toFixed(2))} />
```

Change to calculate the corresponding stop and set both values:
```typescript
<GuidanceChip label="Use Ideal" onClick={() => {
  setEntryPremium(idealPrem.toFixed(2));
  setStopPremium(Math.max(0.01, idealPrem - maxStopW).toFixed(2));
}} />
<GuidanceChip label="Use Max" onClick={() => {
  setEntryPremium(aggressivePrem.toFixed(2));
  setStopPremium(Math.max(0.01, aggressivePrem - maxStopW).toFixed(2));
}} />
```

This uses the entry price being set (not the current `entryVal`) to compute the correct stop for that specific premium. The formula is the same `lowestStop` logic already in the code.

**One file, ~4 lines changed. No logic/formula changes.**

