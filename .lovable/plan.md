

## Tweak / Verify Existing Inbox + Broadcast System

### Current State
- **AdminBroadcastTab** — fully functional compose UI with single/all recipient, templates, history, resend/delete. Works via `inbox_items` insert.
- **InboxDrawer** — shows items in Inbox tab (coach_reply, reminder) and What's New tab (announcement, new_module, live_scheduled).
- **inbox_items RLS** — INSERT restricted to `operator` app role or `user_id = auth.uid()`. SELECT restricted to own items or broadcasts (`user_id IS NULL`).
- **broadcast_messages RLS** — gated by `has_academy_permission('manage_notifications')`.
- **Admin Panel access** — already server-side gated: `broadcast_messages` table requires `manage_notifications` permission. The `AdminPanel.tsx` page checks `view_admin_panel` / `manage_users` / `manage_notifications` permissions + CEO/operator role.
- **No welcome trigger exists yet.**

### Issues Found

1. **INSERT policy on `inbox_items` only allows `operator` role** — Admins/Coaches with `manage_notifications` permission but without the `operator` app role cannot insert inbox items for other users from the Broadcast tab. Need to also allow `has_academy_permission('manage_notifications')`.

2. **No automated welcome message** — Need a `SECURITY DEFINER` trigger on `profiles` AFTER INSERT.

3. **AdminBroadcastTab UX** — Minor improvements: add a Link field (currently hardcoded to `null`), add a confirm dialog before send, and show success feedback more clearly.

### Changes

**1. Database migration — Fix inbox_items INSERT policy + add welcome trigger**

```sql
-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Operators or self can insert inbox items" ON public.inbox_items;

-- New INSERT policy: operator OR manage_notifications OR self
CREATE POLICY "Operators or admins can insert inbox items"
  ON public.inbox_items FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'operator'::app_role)
    OR has_academy_permission(auth.uid(), 'manage_notifications'::text)
    OR (user_id = auth.uid())
  );

-- Welcome message trigger (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.send_welcome_inbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Idempotent: skip if welcome already exists for this user
  IF NOT EXISTS (
    SELECT 1 FROM public.inbox_items
    WHERE user_id = NEW.user_id
      AND type = 'reminder'
      AND title = 'Welcome to Vault OS'
  ) THEN
    INSERT INTO public.inbox_items (user_id, type, title, body, link)
    VALUES (
      NEW.user_id,
      'reminder',
      'Welcome to Vault OS',
      'Start here (2 minutes): 1) Complete your Gameplan Foundation 2) Set your Starting Balance 3) Log your first trade (or mark a No-Trade Day).',
      '/academy/home'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_welcome_inbox
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.send_welcome_inbox();
```

**2. `src/components/admin/AdminBroadcastTab.tsx` — Add Link field + confirm dialog**

- Add a `link` state field below Body in the compose form (optional, placeholder "e.g. /academy/home")
- Pass `link` value to the `inbox_items` insert instead of hardcoded `null`
- Add a confirmation step before `handleSend` executes (reuse existing AlertDialog pattern)
- No structural changes to history/templates tabs

### Security Summary
- `inbox_items` SELECT: users see only their own items + broadcasts (`user_id IS NULL`) — unchanged
- `inbox_items` INSERT: operator OR `manage_notifications` permission OR self — tightened from original "any authenticated" policy
- Welcome trigger: `SECURITY DEFINER` — runs with elevated privileges, inserts only for the new user, idempotent
- No PII exposure introduced
- Members cannot access Admin Panel routes or Broadcast tab (enforced by both page-level guards and `broadcast_messages` RLS)

### Files
| What | Where |
|------|-------|
| Fix INSERT RLS + welcome trigger | DB migration |
| Add link field + confirm dialog | `src/components/admin/AdminBroadcastTab.tsx` |

