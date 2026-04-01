

## Premium Profile System Upgrade

### Overview
Replace transparent/glass profile cards with solid dark premium surfaces. Add `banner_url` column to profiles for unique user banners. Upgrade the profile card, profile editing, and post-signup onboarding to feel personal and polished.

### Database Changes

**Migration 1 — Add `banner_url` to profiles + update RPC:**
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_url text DEFAULT NULL;

-- Update get_community_profiles to return banner_url
CREATE OR REPLACE FUNCTION public.get_community_profiles(_user_ids uuid[])
RETURNS TABLE(...existing cols..., banner_url text)
-- re-create with banner_url included
```

**Storage:** The `avatars` bucket already exists with proper RLS. Banners will also be stored in the same bucket under `{user_id}/banner-{timestamp}.webp`.

### File Changes

**1. `src/index.css` — Replace glass styles with solid dark**
- `.vault-profile-card`: remove `backdrop-filter`, `hsla` background. Use solid `hsl(var(--card))` with clean border and shadow
- `.vault-profile-avatar-ring`: keep gradient glow but on solid background
- Keep the enter animation

**2. `src/components/academy/community/UserProfileCard.tsx` — Full redesign**
- Solid dark card background (`bg-[hsl(220,15%,10%)]`), no transparency/blur
- Banner area: show user's `banner_url` if set, otherwise generate a unique gradient from their `user_id` (hash-based hue rotation — no two feel the same)
- Larger avatar (18x18) with a solid-bordered ring, positioned overlapping the banner
- Clean sections: name/username, badges, bio, social pills, stats
- Add pencil edit icon (visible only when viewing your own profile) — links to `/academy/settings`
- Online indicator with solid border matching card background

**3. `src/hooks/usePublicProfile.ts` — Add `banner_url` to PublicProfile type and fetch**

**4. `src/components/academy/AcademyProfileForm.tsx` — Add banner editing**
- New "Banner" section at top of form with:
  - Preview of current banner (or generated default)
  - Upload button (same flow as avatar: crop to 4:1 ratio, max 5MB, webp)
  - Clear button to reset to default gradient
- Bio field already exists — keep as-is
- Avatar + banner editing with clear pencil/edit icons
- Fast, single-card layout — no clutter

**5. `src/pages/academy/AcademyProfile.tsx` — Upgrade onboarding profile page**
- After signup, new users land here (already routed via `profile_completed` gate)
- Redesign as a clean welcome screen:
  - "Welcome to Vault Academy" header
  - Step indicators: Banner → Avatar → Bio (all on one page, scrollable)
  - Each section is a compact card with clear edit affordance
  - "Continue" button at bottom sets `profile_completed = true`
  - All fields optional — user can skip and continue
  - Clean, fast, no overload

**6. `src/pages/Signup.tsx` — After successful signup, navigate to `/academy/profile` instead of `/academy`**
- Change line 193: `navigate("/academy/profile")` so new users hit the welcome/profile setup

**7. `src/lib/bannerGradient.ts` — New utility**
- `generateBannerGradient(userId: string): string` — deterministic gradient CSS from user ID hash
- Uses hue rotation so every user gets a unique-feeling default banner
- Returns a CSS `background` string

### Design Rules Followed
- No glass/transparency — solid dark surfaces everywhere
- Pencil edit icon clearly visible on own profile card
- Responsive: card works on desktop popover and could be used on mobile
- No hidden actions — edit is one click
- Banner defaults are unique per user via hash-based gradient generation
- All uploads use existing `avatars` bucket with established RLS

### Privacy Model (Unchanged)
- Public: avatar, banner, display name, username, role, bio, socials, member since, lessons completed
- Private: email, phone, balance, discipline score, trading style, timezone

