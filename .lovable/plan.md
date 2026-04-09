

## Performance & Polish Overhaul

### Problems Found

1. **Too many realtime channels** — Up to 15+ Supabase realtime channels open simultaneously (vault-state, inbox, unread x3, live-now, daily-vault, room messages, reactions, typing, thread, notifications, presence per-user, daily-setups). Each keeps a WebSocket alive and fires re-renders on events. This is the single biggest source of sluggishness.

2. **Waterfall data fetching on boot** — `AcademyDataContext` fires 4 parallel fetches (onboarding, notifications, inbox, referrals), but `useSmartNotifications`, `useLoginReminder`, `useRoleEvolution`, and `useStudentAccess` each fire their own independent DB calls too. That's 10+ sequential/parallel DB round-trips before the dashboard renders useful content.

3. **`useLiveNow` sets loading on every refresh** — `setLoading(true)` on line 28 causes a flash every time it re-checks. The MobileNav imports this hook, so the bottom nav re-renders on every live session check.

4. **`useHotTickers` polls every 5 minutes** with a full 200-message scan — expensive and unnecessary for most pages.

5. **`transition-all` used 605 times** across 64 files — many on large containers where it triggers layout recalculation on every CSS property change. Should be scoped to specific properties.

6. **`backdrop-blur` on always-visible elements** — The top header uses `backdrop-blur-md` which forces compositing on every frame. The mobile nav uses `backdrop-blur-sm`. These are always on screen.

7. **`usePresenceHeartbeat` fires a DB write every 60 seconds** — an UPDATE to profiles table, which triggers realtime events on every listener watching that table (including `useUserPresence` for every user card visible).

8. **No `React.memo` on expensive list items** — Chat messages, lesson sidebar items, and community cards all re-render when parent state changes.

9. **Google Fonts loaded via CSS `@import`** — Blocks rendering until the font stylesheet is downloaded and parsed.

### Plan

#### 1. Consolidate realtime channels
Merge the 3 unread channels + inbox channel + notifications channel into a single multiplexed channel. This alone cuts 4 WebSocket connections.

| File | Change |
|------|--------|
| `src/hooks/useUnreadCounts.ts` | Merge 3 channels into 1 multi-table channel |
| `src/contexts/AcademyDataContext.tsx` | Share the same channel for inbox realtime |

#### 2. Fix `useLiveNow` flash
Remove `setLoading(true)` from refresh — only set loading on initial mount. This stops MobileNav from flickering.

| File | Change |
|------|--------|
| `src/hooks/useLiveNow.ts` | Only set loading true on first fetch, use ref to track |

#### 3. Lazy-load `useHotTickers`
Only run the ticker scan when the Trade Floor tab is actually visible, not globally.

| File | Change |
|------|--------|
| `src/hooks/useHotTickers.ts` | Accept an `enabled` parameter, default false |
| `src/components/academy/community/TradeFloorHeader.tsx` | Pass `enabled={true}` only when rendered |

#### 4. Reduce presence heartbeat frequency
Change from 60s to 120s. Same UX (3-min online threshold still works), half the DB writes.

| File | Change |
|------|--------|
| `src/hooks/usePresenceHeartbeat.ts` | Change interval to 120s |

#### 5. Replace `backdrop-blur` on always-visible chrome
Use solid semi-transparent backgrounds instead of blur on the top header and mobile nav. Blur is expensive on every scroll frame.

| File | Change |
|------|--------|
| `src/components/layout/AcademyLayout.tsx` | Replace `backdrop-blur-md` on header with solid `bg-background/95` |
| `src/components/layout/MobileNav.tsx` | Remove `backdrop-blur-sm`, use solid background |

#### 6. Batch `transition-all` → scoped transitions on key components
Replace `transition-all` with `transition-colors` or `transition-opacity` on the most impactful components (sidebar, nav items, cards). Won't touch every instance — just the layout-critical ones.

| File | Change |
|------|--------|
| `src/components/layout/AcademySidebar.tsx` | Scope transitions |
| `src/components/layout/MobileNav.tsx` | Scope transitions |
| `src/components/layout/AcademyLayout.tsx` | Scope transitions |

#### 7. Move Google Font import to `<link>` with preconnect
Move the `@import url(...)` from CSS to `index.html` as a `<link rel="preload">` with `<link rel="preconnect">` to unblock rendering.

| File | Change |
|------|--------|
| `index.html` | Add preconnect + font link |
| `src/index.css` | Remove `@import url(...)` line |

#### 8. Add haptic-style feedback to key interactions
Add subtle micro-interactions: button press scale effect, toast success animations, and nav tap feedback for a premium feel.

| File | Change |
|------|--------|
| `src/index.css` | Add `.press-scale` utility class with active:scale-[0.97] transform |
| `src/components/layout/MobileNav.tsx` | Add press feedback to nav items |

#### 9. Memoize chat message components
Wrap the most-rendered list items with `React.memo` to prevent unnecessary re-renders during scroll and state updates.

| File | Change |
|------|--------|
| `src/components/academy/RoomChat.tsx` | Memo-wrap individual message rows |

### Expected Result
- Fewer realtime channels (from ~15 to ~11 on community page)
- No more loading flashes on MobileNav
- Faster paint on header/nav (no blur compositing)
- Snappier interactions with scoped transitions
- Font loads non-blocking
- Premium tactile feel on taps

