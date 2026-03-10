

## Center the Reset All Button

**File**: `src/components/vault-planner/VaultTradePlanner.tsx` (lines 541-554)

Move the Reset All button to center alignment so it sits directly under the content, aligned with the "VAULT Trade Planner" headline. Keep the existing styling but change `md:justify-end` to `justify-center` and make the button slightly wider with `px-8`.

```tsx
// Line 542: change from
<div className="flex justify-center md:justify-end">
// to
<div className="flex justify-center">
```

```tsx
// Line 549: change from
w-full md:w-auto justify-center"
// to
md:w-auto justify-center px-8"
```

One file, two small class changes.

