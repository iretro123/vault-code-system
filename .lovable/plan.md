

## GIPHY GIF Picker for Community Chat

### Secret Needed
A `GIPHY_API_KEY` is required. You can get a free one at [developers.giphy.com](https://developers.giphy.com) by creating an app (select "API" type). I'll prompt you to add it.

### Files to Create

**1. `supabase/functions/giphy-search/index.ts`** — Edge function proxy
- Reads `GIPHY_API_KEY` from secrets
- Accepts `{ q?: string, type: "trending" | "search" }` in body
- Calls GIPHY API v1: `/gifs/trending` or `/gifs/search`
- Returns simplified array: `{ id, url, preview_url, width, height, title }`
- Uses `rating=pg` to keep content clean

**2. `src/components/academy/chat/GifPicker.tsx`** — Popover component
- Discord-style "GIF" text button (bold, small badge) placed after the emoji picker
- On open: fetches trending GIFs via the edge function
- Search bar at top with 300ms debounce
- 2-column masonry grid using small preview URLs (`fixed_height_small`)
- Clicking a GIF calls `onSelect(gifUrl)` and closes popover
- Loading skeleton while fetching
- Same dark popover styling as EmojiPicker

**3. Update `supabase/config.toml`** — Add `[functions.giphy-search]` with `verify_jwt = false`

### File to Modify

**4. `src/components/academy/RoomChat.tsx`** (line ~1551)
- Import `GifPicker`
- Add it after `<EmojiPicker>` in the icon row
- `onSelect` handler calls `handleSend("", [{ type: "image", url: gifUrl, filename: "gif", size: 0, mime: "image/gif" }])`
- GIF renders using existing image attachment rendering — no display changes needed

### Composer Layout
```text
[📎] [😊] [GIF] ─── [textarea] ─── [Send ➤]
```

### Steps
1. Add `GIPHY_API_KEY` secret
2. Create edge function + config
3. Create GifPicker component
4. Wire into RoomChat composer

