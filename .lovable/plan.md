

## Build: Share Win Cards + Social Proof Activity Ticker

### Feature 1: Share Win Cards

**What**: A "Share" button on each win card in the Wins tab that generates a premium branded image (dark gradient background, Vault logo watermark, trade details, user avatar, referral QR/link). User downloads it and posts to IG Stories, X, etc.

**How it works**:
1. New `ShareWinModal` component — opens when user taps "Share" on a win card
2. Uses HTML Canvas API (`<canvas>`) to render a 1080×1920 (IG Story ratio) branded card client-side:
   - Dark gradient background with subtle Vault branding
   - User's display name + role badge
   - Win details (ticker, P&L, setup type, lesson learned) parsed from the structured fields
   - Trade screenshot if attached
   - Vault logo watermark + "vault-code-system.lovable.app" URL
   - User's referral link as text at the bottom (e.g., "Join me → vault-code-system.lovable.app/ref/{userId}")
3. "Download Image" button saves the canvas as PNG
4. On mobile (Capacitor), uses native share sheet via `navigator.share()` for direct IG/X sharing
5. No edge function needed — fully client-side canvas rendering

**Files**:
| File | Action |
|------|--------|
| `src/components/academy/community/ShareWinModal.tsx` | **Create** — canvas-based branded image generator + download/share UI |
| `src/components/academy/community/CommunityWins.tsx` | Add "Share" button next to the 🔥 reaction on each win card |

---

### Feature 2: Social Proof Activity Ticker

**What**: A subtle auto-scrolling horizontal ticker below the HeroHeader on the dashboard showing real-time community activity like "Jake logged a $450 win", "Sarah hit a 7-day streak", "Mike completed Module 3."

**How it works**:
1. New `ActivityTicker` component — horizontal marquee-style strip
2. Fetches recent activity from 3 existing tables (no new tables needed):
   - `academy_messages` where `room_slug = 'wins-proof'` → "{name} posted a win"
   - `vault_daily_checklist` recent completions → "{name} checked in"
   - `lesson_progress` recent completions → "{name} completed a lesson"
3. Queries last 24h of activity, picks 10-15 items, shuffles them
4. Renders as a CSS `@keyframes` marquee (no JS animation — pure CSS for performance)
5. Uses display names from profiles, respects privacy (first name only)
6. Subtle styling: small text, muted colors, blends with the dark dashboard aesthetic

**Files**:
| File | Action |
|------|--------|
| `src/components/academy/dashboard/ActivityTicker.tsx` | **Create** — fetches recent activity + renders CSS marquee |
| `src/pages/academy/AcademyHome.tsx` | Add `<ActivityTicker />` between HeroHeader and GameplanCard |

---

### Technical Notes

- **Share Win Card rendering**: Uses native Canvas 2D API. Draws gradient background → text → optional image → branding. Exports via `canvas.toDataURL("image/png")` then triggers download with an `<a>` tag or `navigator.share()`.
- **Activity Ticker data**: Single `useActivityFeed` hook makes 3 parallel queries with `.limit(10)` each. Caches in localStorage with 5-min TTL. No realtime subscription needed — refreshes on mount.
- **No database changes** — both features use existing tables only.
- **No edge functions** — both features are fully client-side.

