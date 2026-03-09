

## Chat Easter Eggs — Local Visual Effects on Trigger Words

Add a lightweight effect system to the community chat. When a user **sends** a message containing a trigger keyword, a visual effect plays **on their screen only** (local, no DB changes). Effects auto-dismiss after a few seconds.

### Triggers & Effects

| Trigger | Effect | Duration |
|---------|--------|----------|
| `67` | Screen shake (CSS animation on chat container) | 500ms |
| `snow` | Snowflake particles falling from top | 4s |
| `W` (exact, or `let's go`, `lfg`) | Confetti burst from bottom | 3s |
| `moon`, `🚀` | Rocket emoji flies from bottom to top | 2s |
| `gg`, `GG` | Gold confetti / sparkle burst | 3s |

### Implementation

**New file: `src/components/academy/chat/ChatEffects.tsx`**
- A single component that renders overlay effects using CSS animations (no heavy libraries)
- Accepts `activeEffect` prop (`"shake" | "snow" | "confetti" | "rocket" | "gg" | null`)
- Shake: applies a CSS keyframe to the parent via a className callback
- Snow: renders ~30 absolute-positioned snowflake spans with staggered `animation-delay`, falling via CSS `@keyframes`
- Confetti/GG: renders ~40 small colored squares/circles with random horizontal spread + upward burst trajectory
- Rocket: single 🚀 emoji animated from bottom-center to top with slight wobble
- All particles use `pointer-events: none` and `position: fixed` / `absolute` so they don't interfere with chat
- Auto-clears after duration via `useEffect` + `setTimeout`

**New file: `src/lib/chatEffects.ts`**
- `detectChatEffect(message: string): EffectType | null` — pattern matcher
  - Checks for `67` anywhere in text → `"shake"`
  - Checks for `snow` → `"snow"`
  - Checks for exact `W`, `lfg`, `let's go` → `"confetti"`
  - Checks for `moon`, `🚀` → `"rocket"`
  - Checks for `gg` (case-insensitive) → `"gg"`

**Modified: `src/components/academy/RoomChat.tsx`**
- Add `const [chatEffect, setChatEffect] = useState<string | null>(null)` state
- In `handleSend`, after `sendMessage()` succeeds, call `detectChatEffect(body)` and set the effect
- Render `<ChatEffects activeEffect={chatEffect} onComplete={() => setChatEffect(null)} />` at the top of the chat container
- For shake specifically, conditionally add a `animate-shake` class to the chat wrapper div

**Modified: `tailwind.config.ts`**
- Add `shake` keyframe: rapid small translateX oscillation over 500ms

### Performance Rules (per project guidelines)
- All animations use `transform` and `opacity` only — no layout thrashing
- Particles are absolutely positioned with `will-change: transform`
- No heavy libraries (pure CSS + minimal DOM nodes)
- Effects ≤ 4s max, no infinite loops
- `pointer-events: none` on all overlays so chat remains interactive during effects

### No database changes. No backend changes. Purely client-side.

