

## Premium Go Live Enhancement — NYSE Bar + Discipline Metrics

### What We're Adding

Two new components and integration into the existing Go Live stage. No logic changes, no architecture changes — pure UI/UX enhancement.

---

### 1. NYSE Session Progress Bar

**New file: `src/components/trade-os/NYSESessionBar.tsx`**

A premium horizontal timeline showing the full NYSE trading day (9:30 AM – 4:00 PM ET) as a track, with the user's session window highlighted.

Visual structure:
```text
 9:30                    11:00        12:00                    4:00
  |━━━━━━━━━━━━━━━━━━━━━━|━━━━━━━━━━━|========================|
  ▲ market open    user cutoff  user close           market close
       [  active glow  ] [ amber  ]  [    dimmed/locked     ]
                    ▼ animated now-marker
```

- Full bar = NYSE 9:30 AM – 4:00 PM ET (6.5 hours)
- User's session window (`loadTimes()` from SessionSetupCard) highlighted as the "active zone" with a subtle primary glow
- Pre-session zone: dimmed with muted styling
- Post-cutoff zone: amber border, fading opacity
- Post-hard-close zone: red-tinted, locked feel
- Animated current-time marker: small glowing dot that moves along the bar, updated every second via existing `now` state
- Time labels at: market open, user start, user cutoff, user hard close, market close
- Dark luxury styling: `bg-white/[0.03]`, `border-white/[0.06]`, primary glow on active zone
- Receives `sessionTimes` and `now` as props — pure presentational component

### 2. Discipline Metrics Strip

**New file: `src/components/trade-os/DisciplineMetricsStrip.tsx`**

A horizontal row of 6 small frosted-glass metric cards.

Metrics (all derived from existing `useTradeLog` data):
- **Vault Status**: dot + label from `vaultState.vault_status` (GREEN/YELLOW/RED)
- **Discipline Score**: weighted composite — 60% `complianceRate` + 25% `weeklyComplianceRate` + 15% inverse of today's loss streak
- **Session Grade**: today-specific — based on today's trades `followed_rules` rate, weighted by discipline (not P/L). Shows A/B/C/D/F or "—" if no trades yet
- **Discipline Streak**: `currentStreak` from useTradeLog
- **Rule Follow Rate**: `complianceRate` from useTradeLog (all-time)
- **Weekly Consistency**: `weeklyComplianceRate` from useTradeLog

Styling per card:
- `rounded-xl bg-white/[0.03] border border-white/[0.06]`
- Value: `text-sm font-bold tabular-nums`
- Label: `text-[8px] text-muted-foreground/50 uppercase tracking-wider`
- Horizontal scroll on mobile, grid on desktop

### 3. Go Live Stage Integration

**File: `src/pages/academy/AcademyTrade.tsx` (Go Live section, lines ~1009–1106)**

Insert the two new components into the existing Go Live layout:

Current order:
1. StageHeadline
2. VaultStatusBadge
3. LiveSessionMetrics + RewardTargetsStrip
4. Active rules summary
5. Session Timer
6. Focus Reminders
7. Quick Log Trade
8. End Session

New order:
1. StageHeadline (keep)
2. **DisciplineMetricsStrip** (new — horizontal strip below headline)
3. VaultStatusBadge (keep)
4. **NYSESessionBar** (new — below vault status, above metrics)
5. LiveSessionMetrics + RewardTargetsStrip (keep)
6. Active rules summary (keep)
7. Session Timer (keep)
8. Focus Reminders (keep)
9. Quick Log Trade (keep)
10. End Session (keep)

Props wiring:
- `NYSESessionBar`: reads `loadTimes()` internally (same pattern as `SessionCountdownLine`), manages its own `now` interval
- `DisciplineMetricsStrip`: receives `vaultStatus`, `complianceRate`, `weeklyComplianceRate`, `currentStreak`, `todayTrades` (today's entries from useTradeLog), `lossStreak` from parent

---

### Files Summary

| File | Type | Change |
|------|------|--------|
| `NYSESessionBar.tsx` | New | Premium session timeline bar |
| `DisciplineMetricsStrip.tsx` | New | 6-metric discipline strip |
| `AcademyTrade.tsx` | Edit | Insert both components into Go Live stage |

### What Does NOT Change
- No logic changes, no hook changes, no DB changes
- All existing Go Live components stay in place
- Architecture, styling system, and stage flow untouched

