

# Replace Right Rail with Stage-Aware Guidance Panel

## What changes

**File: `src/components/trade-os/OSControlRail.tsx`** — full rewrite

**File: `src/pages/academy/AcademyTrade.tsx`** — pass `activeStage` prop to OSControlRail

## Design

Replace the current dead-end "No active plan / Build Plan" rail with a **stage guide panel** that adapts to whichever tab (Plan, Live, Review, Insights) is active. Premium iOS aesthetic with glassmorphism cards and clear hierarchy.

### Layout (top to bottom):

1. **"YOUR WORKFLOW" section label** — tiny uppercase header
2. **Active stage hero card** — frosted glass card with icon, stage name, and a 1-2 sentence explanation of what to do right now. Uses the luxury glassmorphism style (`bg-white/[0.04] backdrop-blur border-white/[0.06]`). Highlighted with a subtle left accent border in primary blue.
3. **Stage roadmap** — the other 3 stages listed below as compact rows (icon + name + one-liner). Muted styling, clickable to switch tabs. Completed stages get an emerald checkmark.
4. **Divider**
5. **Active plan summary** (if exists) — keep existing plan card with ticker/direction/contracts
6. **Block reason** (if exists) — keep existing amber warning
7. **No CTA button** — the guidance IS the CTA now. The left panel already has the real actions.

### Stage descriptions (simple, direct):

| Stage | Icon | Description |
|-------|------|-------------|
| **Plan** | Calendar | Pick your ticker, direction, size, and max loss. Approve it before the market opens. |
| **Live** | Radio | Your plan is locked in. Execute your trade. Log the result when you're done. |
| **Review** | ClipboardCheck | Check if you followed your rules. Complete your daily review. |
| **Insights** | Brain | AI scans your trades for patterns. See your grade, biggest leak, and what to fix. |

### Active stage card gets:
- Larger text (text-xs for description vs text-[10px] for others)
- Left border accent (`border-l-2 border-l-primary/40`)
- Frosted glass background
- Icon in primary color
- "You are here" dot indicator

### Inactive stages get:
- Compact single-line rows
- Muted text (`text-muted-foreground/50`)
- Completed stages: emerald check icon instead of stage icon
- Hover: `hover:bg-white/[0.03]` for clickability

## Props change

Add `activeStage: SessionStage` and `onSelectStage: (stage: SessionStage) => void` to `OSControlRailProps`. Pass them from AcademyTrade where `activeStage` and `setStage` already exist.

## Files touched

| File | Change |
|------|--------|
| `src/components/trade-os/OSControlRail.tsx` | Rewrite with stage guide panel |
| `src/pages/academy/AcademyTrade.tsx` | Pass `activeStage` and `onSelectStage` props (~2 lines) |

