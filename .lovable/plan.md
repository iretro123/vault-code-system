

## Mobile-Optimize Community Tabs (iOS-friendly)

**File:** `src/pages/academy/AcademyCommunity.tsx`

### Changes

1. **Tab container** (line 50): Change `inline-flex` → `flex w-full md:inline-flex md:w-auto` so tabs stretch full-width on mobile
2. **Tab buttons** (line 56): Add `flex-1 md:flex-none`, reduce padding to `px-2 md:px-5`, reduce font to `text-[11px] md:text-[12px]` — balanced spacing, not cramped, not overflowing
3. **Container gap** (line 50): Keep `gap-0.5` — just enough breathing room between tabs without wasting space

Result: 4 equal-width tabs fill the bar edge-to-edge on mobile with comfortable tap targets. Desktop stays unchanged.

