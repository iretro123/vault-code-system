

## GIF Picker for Community Chat — Tenor Integration

### Overview
Add a Discord-style GIF picker button next to the emoji picker in the chat composer. Uses Tenor API v2 for trending GIFs and search. Available in all community tabs (Chat, Announcements, Signals, Wins).

### Architecture

**Tenor API Key**: Tenor's API key is a publishable Google Cloud key (safe for client-side use, like Discord does). We'll store it as a constant. User needs to get a free key from [Google Cloud Console > Tenor API](https://console.cloud.google.com/apis/api/tenor.googleapis.com).

Alternatively, we proxy through an edge function to keep the key server-side. Given this is a premium product, the edge function approach is cleaner.

### Files to Create/Modify

**New: `supabase/functions/tenor-search/index.ts`**
- Edge function that proxies Tenor API v2 requests
- Endpoints: `featured` (trending) and `search?q=term`
- Requires `TENOR_API_KEY` secret
- Returns array of `{ id, url, preview_url, width, height }`

**New: `src/components/academy/chat/GifPicker.tsx`**
- Popover component (same pattern as EmojiPicker)
- Icon: a "GIF" text button or film icon, placed next to the smiley face
- Shows trending GIFs on open, search bar at top
- Masonry-style 2-column grid of GIF thumbnails (using preview URLs for performance)
- Clicking a GIF calls `onSelect(gifUrl)` and closes the popover
- Debounced search (300ms) hitting the edge function

**Modified: `src/components/academy/RoomChat.tsx`**
- Import `GifPicker` next to `EmojiPicker`
- Add `GifPicker` button in the composer icon row (line ~1551, after EmojiPicker)
- `onSelect` handler: sends a message with the GIF URL as an image attachment (same `Attachment` format already used)
- GIF renders in chat using existing image rendering logic

### UI Layout (Composer Bar)
```text
[📎 Attach] [😊 Emoji] [GIF] ─── [textarea] ─── [Send ➤]
```

The GIF button uses a small "GIF" text badge (like Discord) rather than an icon — more recognizable.

### GIF Message Format
When a user selects a GIF, it sends as an attachment:
```json
{
  "type": "image",
  "url": "https://media.tenor.com/...",
  "filename": "gif",
  "size": 0,
  "mime": "image/gif"
}
```
This reuses the existing attachment rendering — no changes needed to message display.

### Edge Function Flow
1. Client calls `supabase.functions.invoke("tenor-search", { body: { q, type } })`
2. Edge function reads `TENOR_API_KEY` from secrets
3. Calls `https://tenor.googleapis.com/v2/featured` or `/v2/search`
4. Returns simplified results array

### Steps
1. Add `TENOR_API_KEY` secret (user provides free key from Google Cloud)
2. Create `tenor-search` edge function
3. Create `GifPicker` component
4. Wire into `RoomChat` composer

