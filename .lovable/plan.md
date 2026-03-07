

## Add "Auto DM" Tab to Broadcast (Skool-style)

Like the Skool screenshot — a simple editor where you can toggle the auto welcome DM on/off, edit the message body, save it, and preview it. The trigger reads from the database so changes take effect immediately.

### Changes

**1. Database migration**

- Create `system_settings` table (simple key-value store for app config)
- RLS: only operator / manage_notifications can read/write
- Seed it with the current welcome DM content as the `welcome_dm` key
- Update `send_welcome_inbox()` trigger to read config from `system_settings` dynamically instead of hardcoded text
- If `enabled = false`, skip the insert entirely

**2. `AdminBroadcastTab.tsx` — Add 4th tab: "Auto DM"**

Add a tab matching the Skool UI pattern:
- **On/Off toggle** (top-right, like Skool)
- **Message textarea** with `{first_name}` placeholder support and character count
- **Link input** (optional, where to send them)
- **Save button** — upserts to `system_settings`
- **Preview button** — shows the message with `{first_name}` replaced by "Alex"
- Helper text: "Use {first_name} to personalize. Sent once when a new member joins."

No other tabs or existing functionality changes.

### Files

| What | Where |
|------|-------|
| `system_settings` table + seed + updated trigger function | DB migration |
| Add "Auto DM" tab | `src/components/admin/AdminBroadcastTab.tsx` |

