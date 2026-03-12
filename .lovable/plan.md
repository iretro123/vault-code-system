

# Fix: Trade Log Screenshot Upload (Dead Button)

## Problem
The "Tap to attach screenshot" button in `LogTradeSheet.tsx` (line 284-290) is a **dead placeholder** — it has no `onClick` handler, no file input reference, and no upload logic. Users tap it and nothing happens.

Additionally, the `trade_entries` table has **no `screenshot_url` column**, so even if upload worked, there's nowhere to store it.

## Fix

### 1. Database Migration
- Add `screenshot_url text` column to `trade_entries` (nullable, default null)

### 2. Storage Bucket
- Create a `trade-screenshots` storage bucket (public reads, authenticated uploads)
- RLS: users can only upload to their own folder (`user_id/...`)

### 3. Wire Up Screenshot Upload in `LogTradeSheet.tsx`
- Add a hidden `<input type="file" accept="image/*">` with a ref
- Add state for the selected file (`screenshotFile`)
- Connect the button's `onClick` to trigger the file input
- Show file name + remove button when a file is selected
- Pass the file through to the parent via `TradeFormData` (add `screenshotFile?: File` field)

### 4. Handle Upload in `AcademyTrade.tsx` (parent submit handler)
- Before inserting into `trade_entries`, upload the file to `trade-screenshots/{user_id}/{timestamp}.{ext}`
- Get the public URL and include `screenshot_url` in the insert
- Display the screenshot in the trade detail/history view

### Files Changed
- **Database migration**: Add `screenshot_url` column + create storage bucket + RLS policies
- **`src/components/academy/LogTradeSheet.tsx`**: Wire up file input, state, preview, pass file in form data
- **`src/pages/academy/AcademyTrade.tsx`**: Upload file to storage before inserting trade entry, display screenshot in trade list

