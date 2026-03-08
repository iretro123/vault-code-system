

## Upgrade SessionTimer to Premium Retro-Digital Style

### What Changes

Restyle `src/components/academy/live/SessionTimer.tsx` to have a compact, luxury retro-digital look that fits the Vault dark card aesthetic:

**Countdown (pre-session):**
- Small inline container with `border border-blue-500/20 bg-blue-500/5 rounded-lg px-3 py-1.5`
- Digits in `text-blue-400 font-mono tracking-widest` — retro digital feel
- Colon separators dimmed (`text-blue-400/40`)
- Format: `06 : 32 : 14` with small unit labels (`h`, `m`, `s`) in `text-blue-400/50 text-[10px]`
- Drop the emoji, add a subtle `Clock` icon from lucide in `text-blue-400/60`

**Live (during session):**
- Same bordered container but `border-red-500/20 bg-red-500/5`
- Pulsing red dot + "LIVE" badge stays
- Elapsed digits in `text-red-400 font-mono tracking-widest`

**Design rules:**
- Compact — `mt-2` spacing, small padding, fits under the date line
- No heavy effects, just border + subtle tinted background
- Matches the Vault ash/blue color system

### File

| File | Change |
|------|--------|
| `src/components/academy/live/SessionTimer.tsx` | Restyle both states with bordered retro-digital look |

