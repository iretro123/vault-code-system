

## User Profile Card — Discord-Style Popover in Community Chat

### What it is
When a user clicks on someone's avatar or username in the community chat, a premium popover card appears showing that user's public profile — avatar, display name, role, experience level, member since date, bio, social links, and progress stats. Like Discord's profile popup but with iOS luxury styling.

### Database changes

**Add columns to `profiles` table** (migration):
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_twitter text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS social_instagram text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS social_tiktok text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS social_youtube text DEFAULT NULL;
```

No new RLS needed — profiles already have a public SELECT for `get_community_profiles`. We'll update that RPC to also return these new fields.

**Update `get_community_profiles` RPC** to include `bio`, `social_twitter`, `social_instagram`, `social_tiktok`, `social_youtube`, `display_name`, `username`, `created_at`.

### Privacy model
- **Public** (shown on card): avatar, display name, username, role, experience level, bio, social links (only if user filled them), member since date, lessons completed count
- **Private** (never shown): email, phone, account balance, discipline score, trading style, timezone

### New component: `UserProfileCard.tsx`

A popover/floating card rendered via Radix Popover, triggered by clicking avatar or username in chat.

**Design — iOS luxury, not Lovable basic:**
- Frosted glass background (`backdrop-blur-xl bg-white/[0.06]`)
- Large avatar at top with subtle ring glow
- Display name + username + role badge + experience badge
- "Member since" date
- Bio section (max 160 chars, soft muted text)
- Social links row — small branded icon pills (Twitter/X, Instagram, TikTok, YouTube) — only shown if user has set them
- Progress stats strip: lessons completed, days active (from `lesson_progress` count + `vault_daily_checklist` count)
- Smooth scale-in animation
- Width ~280px, max-height capped

### Chat integration — `RoomChat.tsx`

- Wrap avatar + username in a clickable trigger
- On click: fetch the user's full public profile from `profiles` table (single query, cached)
- Open the `UserProfileCard` popover anchored to the avatar
- Clicking outside or pressing ESC closes it

### Settings integration — `AcademyProfileForm.tsx` or `SettingsProfile.tsx`

Add fields for bio and social links so users can fill them in from their settings page.

### New hook: `usePublicProfile.ts`

Fetches a single user's public profile data (bio, socials, created_at, lesson count) by user_id. Caches results for the session.

### Files
1. **New migration** — add `bio`, `social_twitter`, `social_instagram`, `social_tiktok`, `social_youtube` to `profiles`
2. **New migration** — update `get_community_profiles` RPC to return extended fields
3. **`src/components/academy/community/UserProfileCard.tsx`** — new luxury profile popover component
4. **`src/hooks/usePublicProfile.ts`** — new hook to fetch public profile + progress stats
5. **`src/components/academy/RoomChat.tsx`** — make avatar/username clickable, trigger popover
6. **`src/components/academy/AcademyProfileForm.tsx`** — add bio + social link fields
7. **`src/index.css`** — profile card animation + glow styles

