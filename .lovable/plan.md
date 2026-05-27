## Goal

Replace the cold email/password screen with a premium Welcome → Intro Carousel → Auth flow. Guest path bypasses signup but is locked to Live Sessions only.

## Flow

```
/welcome  (NEW, default landing for unauthenticated)
   │  [Get Started] ─────────────► /intro?next=signup
   │  [Already have an account → Sign in] ──► /auth (existing)
   │  [Continue as guest] ───────► /intro?next=guest
   ▼
/intro  (NEW, 4-slide carousel)
   ├─ Slide 1: Wins
   ├─ Slide 2: Community Chat
   ├─ Slide 3: Live Sessions
   └─ Slide 4: 1:1 Vault OS Mentoring
   [→ swipe / arrow button on each slide]
   On final slide:
     - next=signup → /signup
     - next=guest  → enables guest mode → /guest (Live only)
```

## Screens & copy

**1. /welcome (WelcomePage.tsx)**
- Hero: `Welcome to Vault OS`
- Subheadline: `Join a team of serious traders.`
- Primary CTA: `Get Started →` (routes to `/intro?next=signup`)
- Secondary link: `Already have an account? Sign in` → `/auth`
- Tertiary link: `Continue as guest` → `/intro?next=guest`
- Footer line: `Powered by Vault Trading Academy`
- Same dark radial-gradient background as current `/auth`

**2. /intro (IntroCarousel.tsx)**
- 4 slides, embla carousel (already in project), swipe + right-arrow button
- Each slide: full-bleed screenshot image (dimmed/gradient overlay) + headline + 1-line subcopy + right-arrow circular button
- Progress dots at top
- `Skip` link top-right
- Final slide arrow CTA label: `Get Started` (signup path) or `Enter Live` (guest path)
- Slides:
  1. **Wins** — "Real trader wins, every week." (screenshot of community wins tab)
  2. **Community Chat** — "Trade alongside a serious team." (screenshot of Trade Floor)
  3. **Live Sessions** — "Daily live coaching with real traders." (screenshot of Live page)
  4. **1:1 Vault OS Mentoring** — "Personal coaching tuned to your trading." (screenshot of mentoring/coach desk)

**3. /auth (existing)** — keep as-is for returning users (email + password). Remove "Continue as Guest" from here since it now lives on /welcome. Add `Powered by Vault Trading Academy` footer line.

**4. /signup (existing)** — unchanged.

**5. /guest (existing GuestPreview)** — already live-sessions-only; confirm nothing else is reachable from it (route guard in `App.tsx`).

## Slide images

Auto-capture current app pages via `browser--screenshot` after navigating to:
- `/academy/community` (Wins tab)
- `/academy/community` (Chat tab)
- `/academy/live`
- Coach Desk drawer / mentoring page

Save under `src/assets/intro/` as optimized JPGs (e.g. `intro-wins.jpg`, `intro-community.jpg`, `intro-live.jpg`, `intro-mentoring.jpg`) and import via ES6.

## Routing changes (src/App.tsx)

- Add routes: `/welcome` → `WelcomePage`, `/intro` → `IntroCarousel`.
- Unauthenticated visitors hitting `/` get redirected to `/welcome` (keep `/auth` reachable for the "Sign in" link and existing deep links).
- Use `sessionStorage` flag `vault-intro-seen` so returning users skip intro automatically when they tap "Get Started" again (optional polish).

## Guest mode

- "Continue as guest" on /welcome routes to `/intro?next=guest`. Final slide CTA calls `enableGuestMode()` (existing `src/lib/guestMode.ts`) and navigates to `/guest`.
- Verify `useGuestMode` + route guards block access to community, signals, trade OS, learn — only `/guest` (Live Sessions) is reachable. Add a fallback redirect in `App.tsx` for guests hitting any non-`/guest` route.

## Files

**New**
- `src/pages/Welcome.tsx`
- `src/pages/IntroCarousel.tsx`
- `src/assets/intro/intro-wins.jpg`
- `src/assets/intro/intro-community.jpg`
- `src/assets/intro/intro-live.jpg`
- `src/assets/intro/intro-mentoring.jpg`

**Edited**
- `src/App.tsx` — new routes, unauthenticated redirect to `/welcome`, guest route guard
- `src/pages/Auth.tsx` — remove "Continue as Guest" block, add "Powered by Vault Trading Academy" footer

## Out of scope

No backend, RLS, billing, notifications, chat, or trade logic changes. Pure UX/routing.
