

## Plan: Simplify Broadcast + Update Welcome DM

### Current State
- Welcome trigger `send_welcome_inbox` **already exists** and fires on `profiles` AFTER INSERT with duplicate check. Body uses the old generic text, not the Skool-style personalized version.
- Broadcast tab works. Has Email/SMS channel options that are confusing (disabled but visible). Templates include "coach_replied" which isn't useful for manual sends.
- RLS on `inbox_items` is correct (manage_notifications OR operator OR self).

### Changes

**1. Database: Update welcome trigger body to Skool-style with first name**

Replace the `send_welcome_inbox` function to use `NEW.display_name` for personalization:

```sql
CREATE OR REPLACE FUNCTION public.send_welcome_inbox()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  first_name text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.inbox_items
    WHERE user_id = NEW.user_id AND type = 'reminder' AND title = 'Welcome to Vault OS'
  ) THEN
    first_name := split_part(COALESCE(NULLIF(NEW.display_name, ''), 'there'), ' ', 1);
    INSERT INTO public.inbox_items (user_id, type, title, body, link)
    VALUES (
      NEW.user_id, 'reminder', 'Welcome to Vault OS',
      'Hey ' || first_name || E' — welcome in.\n\nQuick check:\n• Are you new to trading? (Yes/No)\n• What motivated you to join?\n\nStart here (2 minutes): Complete your Gameplan Foundation → Set your Starting Balance → Log your first trade (or mark a No-Trade Day).',
      '/academy/home'
    );
  END IF;
  RETURN NEW;
END;
$$;
```

No structural schema change — just replacing the function body. Trigger stays attached.

**2. `AdminBroadcastTab.tsx` — Simplify compose UI**

- **Remove Mode selector** (motivation_ping vs broadcast toggle). Default everything to `motivation_ping` mode with `in_app` channel. This removes the confusing Email/SMS channel picker entirely.
- **Remove the channel selector block** and SMS opt-in notice — channel is always `in_app`.
- **Update Broadcast button label** from the conditional draft/send to just "Send".
- **Trim templates** to 4 useful ones: "Weekly Review", "Log Your Trades", "New Lesson Available", "Live Session Starting".
- Keep: recipient selector (Single/All), title, body, link, confirm dialog, history tab, templates tab.

### Files

| What | Where |
|------|-------|
| Update welcome function body (Skool-style + first name) | DB migration |
| Simplify compose UI (remove mode/channel selectors, update templates) | `src/components/admin/AdminBroadcastTab.tsx` |

No RLS changes needed — current policies are correct. No new tables.

