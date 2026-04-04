

## Luxury White Countdown Timer for Next Group Call

### Overview
Restyle the countdown timer pills to white text on dark elevated surfaces with a premium gamified feel — glowing separators, subtle pulse on seconds, and a "STARTS IN" label.

### Changes — `src/components/academy/dashboard/NextGroupCallCard.tsx`

**Pill component (lines 81-92)** — Replace blue-tinted pills with luxury white design:
- Background: `bg-white/[0.06]` with `border border-white/[0.10]` — dark glass tile
- Text: `text-white font-mono text-xl font-bold` — crisp white digits
- Label: `text-white/40` instead of `text-muted-foreground/50`
- Add subtle inner glow via `shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]`

**Countdown section (lines 111-118)** — Add gamified elements:
- Add a "STARTS IN" micro-label above the pills (`text-[10px] uppercase tracking-[0.2em] text-white/30`)
- Add animated colon separators between pills (`:` characters that pulse with `animate-pulse`)
- Seconds pill gets a subtle ring animation: `ring-1 ring-white/[0.08]` with a pulsing glow

**Header badge (line 98)** — Keep `text-primary` for the "Next Group Call" label (blue accent per design system)

**Session title (line 109)** — Change to `text-white` for stronger contrast

### Visual Result
```text
┌─────────────────────────────────┐
│  📹  NEXT GROUP CALL            │
│  Session Title Here             │
│                                 │
│         STARTS IN               │
│   ┌──┐   ┌──┐   ┌──┐   ┌──┐   │
│   │05│ : │12│ : │34│ : │08│   │
│   │HR│   │HR│   │MN│   │SC│   │
│   └──┘   └──┘   └──┘   └──┘   │
│                                 │
│     [ View Calls → ]            │
└─────────────────────────────────┘
```

White digits on dark tiles, pulsing colon separators, seconds pill with subtle glow ring. Clean, premium, gamified countdown feel.

### Files changed
- `src/components/academy/dashboard/NextGroupCallCard.tsx`

