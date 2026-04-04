

## Remove Pulsing Animation from Countdown Colon Separators

### Change
**File: `src/components/academy/dashboard/NextGroupCallCard.tsx`**

In the `ColonSep` component, remove `animate-pulse` from the class list so the colons stay static.

Current: `className="text-white/30 font-mono text-xl font-bold animate-pulse mb-4"`
New: `className="text-white/30 font-mono text-xl font-bold mb-4"`

### Files changed
- `src/components/academy/dashboard/NextGroupCallCard.tsx`

