

## Premium Signal System — Watchlist + Live Signal Cards

### Two signal types for coaches/admins in the Signals tab

**1. Watchlist Signal** — "What We're Watching"
- Ticker, Bias (Bullish/Bearish/Neutral), Key Levels, Notes, Chart image (optional)
- Rendered as a subtle blue-tinted luxury card with a radar icon

**2. Live Signal** — "Active Trade Alert"
- Direction (Calls/Puts), Ticker, Strike, Expiration, Fill Price, Notes, Chart image (optional)
- Rendered with green (Calls) or red (Puts) accent glow, crosshair icon

Both include chart image upload support using the existing file upload flow.

### Changes

**New: `src/components/academy/chat/SignalPostForm.tsx`**
- Dual-mode toggle form: Watchlist vs Live Signal
- Only visible to users with `canPost` permission in `daily-setups` room
- Watchlist fields: Ticker, Bias toggle, Key Levels, Notes, Chart image upload
- Live Signal fields: Direction toggle, Ticker, Strike, Exp date, Fill, Notes, Chart image upload
- On submit: sends structured body text + stores signal metadata in `attachments` JSONB as `{ type: "signal-watchlist", ... }` or `{ type: "signal-live", ... }` alongside any uploaded image attachments
- Replaces the default text input in the Signals tab

**New: `src/components/academy/chat/SignalCard.tsx`**
- Detects signal attachment type and renders a premium card
- Watchlist card: blue-tinted top glow, radar icon, bias pill, levels strip, chart image, notes, author row
- Live Signal card: green/red directional accent, crosshair icon, metadata grid (strike/exp/fill), chart image, notes, author row
- Dark-theme luxury styling matching `vault-luxury-card` aesthetic
- Compact, scannable — all key info visible at a glance

**Update: `src/components/academy/RoomChat.tsx`**
- In message renderer (~line 1400): detect signal attachments → render `<SignalCard>` instead of plain text body for those messages
- In composer area (~line 1618): when `roomSlug === "daily-setups"` and `canPost`, show `<SignalPostForm>` instead of `<TradeRecapForm>` or default input
- Import both new components

**Update: `src/index.css`**
- Add signal card CSS classes:
  - `.vault-signal-card` — base signal card (inherits luxury card aesthetic)
  - `.vault-signal-watchlist` — subtle blue top-glow
  - `.vault-signal-live-calls` — green accent edge glow
  - `.vault-signal-live-puts` — red accent edge glow

### Technical details

- No database migration needed — signal data stored in existing `attachments` JSONB column
- Signal attachment schemas:
  - Watchlist: `{ type: "signal-watchlist", ticker, bias, levels, notes }`
  - Live: `{ type: "signal-live", direction, ticker, strike, exp, fill, notes }`
- Chart images stored as regular `{ type: "image", url, filename, size, mime }` attachments alongside the signal attachment
- Existing `Attachment` type in `useRoomMessages.ts` already supports this — signal attachments use a broader type union
- Old plain-text messages continue rendering normally (backward compatible)
- The `handleSend` function already accepts `(text, attachments)` — the form composes both and calls it

### File summary
1. `src/components/academy/chat/SignalPostForm.tsx` — new dual-mode posting form
2. `src/components/academy/chat/SignalCard.tsx` — new premium signal card renderer
3. `src/components/academy/RoomChat.tsx` — wire form + card into Signals channel
4. `src/index.css` — signal card luxury CSS classes

