

## Premium Countdown Timer — Dynamic Color Urgency System

### The Redesign

**Visual direction:** Large, cinematic countdown pills with dynamic color shifting based on urgency. Think Apple event countdown meets luxury trading terminal.

### Color Urgency Tiers
- **> 1 hour away** → Blue (calm, informational) — `#3B82F6`
- **15–60 min away** → Amber/Yellow (attention) — `#FBBF24`
- **< 15 min away** → Red (urgent, pulse effect) — `#EF4444`
- **LIVE** → Red with animated pulse glow

### Changes

**1. Bigger, bolder countdown pills**
- Increase pill size from `min-w-[48px] text-xl` → `min-w-[56px] text-2xl py-3`
- Add subtle radial gradient background on each pill that shifts color with urgency tier
- Bottom glow/shadow that matches the current urgency color
- Colon separators get the urgency color too

**2. Dynamic color system**
- Compute urgency tier from `diff` (time remaining in ms)
- All pill borders, text, glow shadows, and "Starts In" label shift to match the tier
- When < 15 min: pills get a subtle pulse animation on the seconds digit
- When < 5 min: entire countdown section gets a faint border glow

**3. Larger "Starts In" label**
- Bump from `text-[10px]` to `text-xs` with the urgency color at reduced opacity

**4. LIVE state enhancement**
- Bigger pulsing dot, red glow behind the "Live Now" badge
- "Join Now" button turns red instead of primary blue

### File Changed

| File | Change |
|------|--------|
| `src/components/academy/dashboard/NextGroupCallCard.tsx` | Urgency color logic, bigger pills, dynamic glow/shadows, live state polish |

