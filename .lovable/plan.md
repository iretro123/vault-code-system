

## Performance Audit: Tab Switching + Layout Stability

### Findings

**1. HeroHeader Particle Canvas (193ms self-time)**
The canvas particle animation runs continuously via `requestAnimationFrame` even when the dashboard is not visible (navigated to another tab). Since React Router unmounts/remounts pages on navigation, this re-initializes 30 particles + connection lines every time you return to Dashboard — causing a visible paint burst.

**2. Dashboard CLS = 0.21 (needs improvement)**
The staggered `animate-fade-in` with `opacity-0` initial state + `animationDelay` up to 400ms causes layout shifts. Elements start invisible at `opacity-0` with `translateY(10px)`, then pop in with delays — the browser reports this as cumulative layout shift.

**3. Community tabs already use CSS-toggle mounting (good)**
`AcademyCommunity.tsx` keeps all 4 tabs mounted and toggles `hidden/block` — this is correct. But `RoomChat` still does work on mount (fetching messages, setting up realtime subscriptions) for ALL 4 rooms simultaneously, even the hidden ones.

**4. Page transitions cause full remount**
Each sidebar nav click unmounts the old page and mounts a new one (standard React Router). The `AcademyLearn` page fires 3 hooks on mount (`useAcademyModules`, `useAcademyLessons`, `useLessonProgress`), `AcademyTrade` fires `useTradeLog` + balance fetch. Each mount shows a loading skeleton briefly.

### Plan

**File: `src/components/academy/dashboard/HeroHeader.tsx`**
- Reduce `PARTICLE_COUNT` from 30 to 18 and `CONNECT_DIST` from 80 to 60 — fewer particles = fewer O(n²) distance checks per frame
- Add `document.hidden` check inside the draw loop — skip frames when tab/page isn't visible
- Use `visibilitychange` listener to pause/resume the animation

**File: `src/pages/academy/AcademyHome.tsx`**
- Remove staggered `animationDelay` and `opacity-0` initial states — render all cards immediately visible
- Keep a single subtle `animate-fade-in` on the outer container only (one 200ms fade, no stagger) to avoid CLS
- This eliminates the 0.21 CLS score from 6 shifting elements

**File: `tailwind.config.ts`**
- Remove the `translateY(10px)` from `fade-in` keyframes — use opacity-only fade to prevent layout shifts
- Reduce duration from 0.3s to 0.15s

**File: `src/pages/academy/AcademyCommunity.tsx`**
- No structural changes needed (CSS-toggle pattern is correct)
- The existing pattern already prevents remounts

**File: `src/components/academy/RoomChat.tsx`**
- Add an `active` prop (default `true`) — when `false`, skip the initial data fetch and realtime subscription setup
- In `AcademyCommunity.tsx`, pass `active={activeTab === "trade-floor"}` etc. so only the visible tab fetches data on mount; others defer until first shown
- Use a `hasBeenActive` ref so once a tab has been activated, it stays subscribed

These changes target the three main lag sources: particle canvas overhead, staggered animation CLS, and unnecessary concurrent data fetching for hidden community tabs.

