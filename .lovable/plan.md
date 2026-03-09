

## Fix: GIF Picker Edge Function + Client Debounce

### Root Cause
The edge function logs show: `TypeError: supabase.auth.getClaims is not a function`. The `getClaims()` method doesn't exist on the Supabase JS client. This causes a 500 error, which the client sees as "Failed to send a request to the Edge Function."

### Plan

**1. Fix `supabase/functions/giphy-search/index.ts`**
- Replace `supabase.auth.getClaims(token)` with `supabase.auth.getUser(token)` for auth validation
- Check `userData.user?.id` instead of `claimsData.claims.sub`

**2. Fix `src/components/academy/chat/GifPicker.tsx`**
- The two useEffects (open + search) both call `fetchGifs()` simultaneously on open, causing duplicate requests
- Consolidate: only the `open` effect fetches trending; the `search` effect only fires when search is non-empty
- Add an `AbortController` or guard to prevent stacking requests

### Changes
- `supabase/functions/giphy-search/index.ts`: ~3 lines changed (auth method)
- `src/components/academy/chat/GifPicker.tsx`: minor cleanup to prevent duplicate fetches on open

