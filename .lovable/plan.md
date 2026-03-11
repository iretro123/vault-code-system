

# Add SMS Broadcast via GHL to Admin Panel

## What You Already Have
- `GHL_API_KEY` and `GHL_LOCATION_ID` secrets already configured
- `ghl-password-reset` edge function already sends SMS via GHL Conversations API (proven pattern)
- Broadcast tab with compose UI, recipient selector, templates, and history

## Plan

### 1. New Edge Function: `ghl-broadcast-sms`
Sends SMS to one or all members via GHL.

- Accepts `{ recipientType: "all" | "single", userId?: string, message: string }` from admin
- Auth-gated: validates caller has operator role
- If `single`: fetches phone from `profiles` → upserts GHL contact → sends SMS
- If `all`: fetches all profiles with phone numbers → loops through each, upserts contact + sends SMS
- Returns `{ sent: number, failed: number, errors: string[] }`
- Uses same GHL Conversations API pattern as `ghl-password-reset`

### 2. Update Broadcast Compose UI
Add a **channel selector** to the existing compose form:

- Toggle between "In-App" and "SMS (GHL)" channels
- When SMS is selected, show a note: "Will send to members with phone numbers on file"
- On send: calls `ghl-broadcast-sms` edge function instead of inserting inbox_items
- Still logs to `broadcast_messages` table with `channel: "sms"` and status from the response
- History tab already shows channel badge — will display "sms" automatically

### 3. Export CSV Button on Members Tab
Quick addition to `AdminMembersTab`:
- "Export CSV" button in the header area
- Downloads `display_name, email, phone_number` for all members
- Useful for manual GHL import or other tools

### Files Changed
- **New**: `supabase/functions/ghl-broadcast-sms/index.ts`
- **Edit**: `supabase/config.toml` — add `verify_jwt = false` entry
- **Edit**: `src/components/admin/AdminBroadcastTab.tsx` — add SMS channel option + call edge function
- **Edit**: `src/components/admin/AdminMembersTab.tsx` — add Export CSV button

