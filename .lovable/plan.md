

## Discord-Style Link Previews in Community Chat

### How it works

When a user posts a message containing a URL, the chat will detect it, render the URL as a clickable link, and display an embedded preview card below the message showing the site's title, description, and image (pulled from Open Graph / SEO meta tags).

### Changes

**1. New Edge Function: `supabase/functions/unfurl-link/index.ts`**
- Accepts a URL, fetches the page HTML server-side
- Parses Open Graph meta tags (`og:title`, `og:description`, `og:image`, `og:site_name`, `og:favicon`)
- Returns JSON with `{ title, description, image, siteName, favicon, url }`
- Includes CORS headers, input validation (valid URL check), and a short timeout (5s) to avoid hanging
- Caches results in a new `link_previews` table to avoid re-fetching the same URL

**2. Database: New `link_previews` cache table**
- Columns: `url` (text, primary key), `title`, `description`, `image`, `site_name`, `favicon`, `fetched_at` (timestamp)
- No RLS needed — edge function uses service role; frontend reads via the edge function
- Prevents redundant fetches for the same link shared multiple times

**3. New Component: `src/components/academy/chat/LinkPreviewCard.tsx`**
- Compact Discord-style embed card: colored left border, site name, title, description (2-line clamp), and image thumbnail
- Dark themed to match existing chat UI (`bg-white/[0.04]`, `border-white/[0.08]`)
- Renders below the message bubble
- Loading skeleton while fetching, graceful fallback (no card) if unfurl fails
- Uses a custom `useLinkPreview(url)` hook that calls the edge function

**4. New Hook: `src/hooks/useLinkPreview.ts`**
- Takes a URL string, calls `supabase.functions.invoke('unfurl-link', { body: { url } })`
- Returns `{ data, loading, error }`
- Client-side in-memory cache (Map) so repeated renders don't re-fetch

**5. Update `renderPlainBody` in `RoomChat.tsx`**
- Add URL detection regex to find raw URLs (https?://...) in message text
- Render detected URLs as clickable links (already partially handled for markdown links)
- Extract the first URL from the message body
- Pass it to a new `<LinkPreviewCard url={firstUrl} />` rendered below the message content

### File summary
1. `supabase/functions/unfurl-link/index.ts` — new edge function
2. Migration — `link_previews` cache table
3. `src/components/academy/chat/LinkPreviewCard.tsx` — new preview card component
4. `src/hooks/useLinkPreview.ts` — new hook
5. `src/components/academy/RoomChat.tsx` — wire URL detection + preview card into message rendering

