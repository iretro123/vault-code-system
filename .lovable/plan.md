

## Dashboard Cards Overhaul — Match Luxury Design System + Inline Video Player

### Problem
The three new cards (Next Group Call, Start Learning, Ask Coach) use amber/gold buttons and styling that doesn't match the existing design system. The design system uses **blue as the primary accent** with dark luxury cards. The "Start Learning" card also just navigates away — the user wants an **inline video player** right on the dashboard.

### Changes

**File: `src/components/academy/dashboard/StartLearningCard.tsx`** — Major rewrite
- Fetch the latest lesson including `video_url` field
- Show a **video thumbnail/preview** area (extract YouTube thumbnail from video URL, or show a dark preview with a centered play button)
- When user clicks play, expand an inline iframe video player (same `getEmbedUrl` logic from AcademyModule) — no navigation away
- Replace amber/gold button with the design system's **blue primary** button (`bg-primary hover:bg-primary/90`)
- Use blue accent for "START LEARNING" badge instead of emerald
- Add a "Watch Now" button that toggles the video player open/closed

**File: `src/components/academy/dashboard/NextGroupCallCard.tsx`** — Restyle
- Replace all amber/gold colors with **blue primary** accent (`text-primary`, `bg-primary`)
- Countdown pills: use `bg-primary/[0.08]` background with `text-primary` text instead of amber
- Button: `bg-primary text-white` solid button instead of gold gradient
- Icon color: `text-primary` instead of `text-amber-400`

**File: `src/components/academy/dashboard/AskCoachCard.tsx`** — Restyle
- Already uses `text-primary` — keep as-is, just ensure the input border and send button match the luxury card system
- Refine input styling to match the dark card aesthetic better

### Video Thumbnail Logic
Extract YouTube video ID from URL → construct thumbnail: `https://img.youtube.com/vi/{VIDEO_ID}/hqdefault.jpg`. For non-YouTube, show a dark placeholder with a play icon. Clicking opens an inline iframe embed within the card.

### Design Consistency
- All buttons: `bg-primary text-white rounded-xl` (no more gold gradients)
- All badges/labels: `text-primary` blue accent
- All cards: `vault-luxury-card` with existing dark background system
- Countdown pills: dark bg with blue text

### Helper
- Extract `getEmbedUrl` and a new `getYouTubeThumbnail` as shared utils (or inline in StartLearningCard)

