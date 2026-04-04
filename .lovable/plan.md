

## Fix & Upgrade Animated Candlestick Background

### Problems
1. **Candles aren't visibly moving** — the animation only nudges the last candle every 60 frames (~1 second) by a tiny amount. The `getBoundingClientRect()` call every frame also causes issues since canvas coordinates use logical pixels but the rect changes aren't reflected properly.
2. **Candles are centered/left** — they need to shift right so the animated "live edge" candle is prominent on the right side of the card.

### Solution — Rewrite `CandlestickCanvas` component

**File: `src/components/academy/dashboard/CommunityCard.tsx`**

Replace the entire `CandlestickCanvas` function with a new implementation that has:

**Continuous scrolling chart animation:**
- Candles slowly scroll left (like a live trading chart feed)
- New candles spawn on the right edge every ~2 seconds
- The rightmost candle's close price fluctuates smoothly every frame (not every 60 frames)
- A glowing price line traces across the top of the latest candle, pulsing subtly

**Shifted right composition:**
- Start generating candles from the center-right of the card
- Leave the left side more open (where the text overlay sits) so text stays readable
- Denser candle cluster on the right half

**Visual upgrades:**
- Brighter candle opacity (green: `rgba(34,197,94,0.7)`, red: `rgba(239,68,68,0.6)`)
- Subtle green glow trail on the moving price line
- Faint horizontal price-level lines that drift with the chart
- Smoother grid lines with slightly more visibility (`rgba(255,255,255,0.04)`)

**Animation approach:**
- Store candles in an array, track a global `scrollX` offset that increments each frame
- Every ~120 frames, push a new candle to the array and remove the oldest
- The last candle's close smoothly interpolates toward a random target using lerp (not abrupt jumps)
- A horizontal "price line" extends from the last candle's close to the right edge with a glow

**Performance:**
- Canvas dimensions set once on mount/resize (not every frame)
- Use `requestAnimationFrame` with delta time for smooth 60fps
- Cap candle array at ~20 items max

### Files changed
- `src/components/academy/dashboard/CommunityCard.tsx` — rewrite `CandlestickCanvas` only, card layout stays the same

