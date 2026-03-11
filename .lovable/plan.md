

# Add `{{name}}` Personalization to SMS Broadcast

## Problem
The edge function sends the raw message to every member without replacing `{{name}}`. The `display_name` is available (already fetched from `profiles`), it's just never substituted into the message text.

## Changes

### 1. Edge Function (`supabase/functions/ghl-broadcast-sms/index.ts`)
- **Single user path (line ~150)**: Before passing `message.trim()` to `sendSmsToContact`, replace `{{name}}` with `profile.display_name` or fallback `"there"`
- **Broadcast loop (line ~181)**: Same replacement per member using `p.display_name || "there"`

```typescript
const personalizedMsg = message.trim().replace(/\{\{name\}\}/gi, displayName || "there");
```

### 2. Broadcast UI (`src/components/admin/AdminBroadcastTab.tsx`)
- Add a small hint below the Message textarea when SMS channel is selected: `Use {{name}} to personalize — e.g. "Hey {{name}}, check today's setup!"`

### Guarantee
- If a member has a `display_name` set (required at signup via first_name + last_name), it will always show their name
- If somehow empty, falls back to "there" so the message still reads naturally ("Hey there, ...")
- The `profiles` table requires `first_name` and `last_name` at registration, which get combined into `display_name` — so in practice every member will have a name

