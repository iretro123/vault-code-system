

## Enhanced Chat Effects — From Basic to Premium

### Current State
- Snow: 30 snowflakes, simple fall
- Confetti/GG: 40 particles, single burst from bottom
- Rocket: 1 lonely rocket, straight line up
- Shake: basic oscillation

### Enhancements

**1. Rocket ("moon") — Rocket Swarm**
- 8-12 rockets instead of 1, staggered launch from random horizontal positions
- Each rocket has slight random rotation, different sizes (28-48px), different speeds (1.5-2.5s)
- Add exhaust trail: small orange/yellow dots that fade behind each rocket
- Extend duration to 3s for the swarm feel
- Add a subtle screen flash (white overlay, 0→0.05→0 opacity over 200ms) at launch

**2. Confetti ("W" / "lfg") — Multi-wave Explosion**
- Increase to 60 particles
- Two-wave burst: first wave at 0ms, second wave at 300ms delay
- Add ribbon shapes (tall thin rectangles that tumble) mixed with circles
- Particles spread from full width (10-90%) not just center
- Add gentle gravity curve so particles arc and fall after peaking
- Longer duration: 3.5s

**3. Snow — Blizzard Upgrade**
- 50 flakes instead of 30
- Mix ❄ with ✦ and ● (small white dots) for depth layering
- Add gentle horizontal sway (sinusoidal via a new keyframe)
- Three depth layers: large/slow (foreground), medium, small/fast (background) with opacity variation
- Duration stays 4s

**4. GG — Gold Celebration**
- 60 gold particles + 5 large "GG" text elements that float up and fade
- Add ✨ emoji sparkles (8-10) scattered with pop-in animation
- Particles originate from center with wider spread

**5. Shake ("67") — Screen Punch**
- More aggressive shake: add slight scale pulse (1.0 → 1.01 → 1.0) mixed with translation
- Add a brief red/orange border flash on the chat container (box-shadow glow for 300ms)
- Faster, punchier: 400ms

### Files to Change

**`src/components/academy/chat/ChatEffects.tsx`** — Full rewrite of effect components:
- `RocketEffect`: render 10 rockets with randomized props + exhaust particles
- `ConfettiEffect`: 60 particles, ribbon shapes, two-wave timing, full-width spread
- `SnowEffect`: 50 mixed particles, 3 depth layers, sway animation
- `ConfettiEffect gold`: add floating "GG" text elements + sparkle emojis
- Update durations: rocket→3000, confetti→3500

**`src/index.css`** — Enhanced keyframes:
- `chat-rocket-fly`: add wobble via slight X oscillation
- `chat-rocket-exhaust`: small dots fading behind rockets
- `chat-snow-fall`: add horizontal sway component
- `chat-confetti-burst`: add gravity (y peaks then falls)
- `chat-spark-pop`: scale 0→1→0 for sparkle emojis
- `chat-gg-float`: "GG" text rising and fading
- `chat-flash`: brief white overlay pulse

**`tailwind.config.ts`** — Update `chat-shake` keyframe to include scale pulse

**`src/lib/chatEffects.ts`** — No changes needed

### Performance
- Max ~70 DOM nodes per effect (still lightweight)
- All animations use only `transform` + `opacity`
- No layout thrashing, no re-renders during animation

