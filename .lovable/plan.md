

## Fix: Discord-style GIF rendering in chat

### What Discord does
- GIFs render at a **constrained size**: max ~300px wide, ~200px tall, with the aspect ratio preserved
- **No filename label** shown under GIFs — they look clean, inline
- GIFs use a **smaller/optimized URL** (not the massive original)
- Regular image uploads stay at their current larger size

### Changes

**1. `supabase/functions/giphy-search/index.ts`** (line 72)
- Change the `url` field from `images.original.url` to `images.downsized.url` (GIPHY caps these at ~2MB vs 10MB+ originals) — much faster load, still good quality

**2. `src/components/academy/RoomChat.tsx`** (lines 1224–1238)
- Detect GIF attachments via `att.mime === "image/gif"` or `att.filename === "gif"`
- For GIFs: apply `max-w-[240px] max-h-[200px] object-contain`, no border, no filename label — matching Discord's compact inline style
- For regular images: keep current behavior unchanged (`max-w-[360px]`)

### Result
GIFs will render as small, clean, borderless inline images — exactly like Discord. Regular image uploads remain unaffected.

