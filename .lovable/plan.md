

## Redesign Activity Ticker — Luxury Card Carousel (Max 3 Items)

### What Changes

Replace the infinite scrolling marquee with a **single-card auto-swipe carousel** showing 3 activity items max. Each item displays as its own luxury dark card that fades/slides to the next one every ~4 seconds.

### Design

- **Max 3 items** picked from recent wins + lesson completions (shuffled)
- **One card visible at a time**, auto-rotating with a smooth crossfade + slight translateX transition (~500ms)
- **Dark luxury card style** matching vault-luxury-card system: dark radial gradient background, 1px blue shimmer top border, subtle shadow
- **Personalized text**: "Edward just posted a win", "Alex completed Module 3", "A student finished a lesson"
- **Colored icon glow** per type (amber for wins, blue for lessons)
- **3 dot indicators** at the bottom showing which card is active (blue dot = active)
- **"LIVE" pulse** — small green pulsing dot + "LIVE" label on the left

### Implementation

**File: `src/components/academy/dashboard/ActivityTicker.tsx`** — Full rewrite:

1. Keep existing data fetching logic (wins + lessons from Supabase, localStorage cache)
2. Slice to max 3 items instead of 15
3. Replace CSS marquee with a `useState` index that auto-increments every 4s via `setInterval`
4. Render one item at a time with `transition-all duration-500` (opacity + translateX)
5. Dark card styling:
   ```
   bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent_70%)]
   bg-[hsl(222,20%,10%)] border border-white/[0.06]
   shadow-[0_0_20px_rgba(59,130,246,0.05)]
   ```
6. 3 small dots at bottom right showing position
7. Green pulsing "LIVE" indicator at left edge

### File

| File | Change |
|------|--------|
| `src/components/academy/dashboard/ActivityTicker.tsx` | Full rewrite — luxury single-card carousel, max 3 items, auto-swipe |

