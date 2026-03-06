

## @Mention System with Notifications (Admin/CEO/Operator Only)

### Overview
Add the ability for admins, CEOs, and operators to @mention users in chat messages. When someone is @mentioned, they receive an in-app notification (the existing notification tray pops open). Admins can also use `@everyone` to notify all users.

### 1. Database: Create `mention_notifications` trigger via Edge Function approach
No new tables needed. We'll insert into the existing `academy_notifications` table when a mention is detected. This happens client-side after a successful message send (simpler than a DB trigger, avoids edge function complexity).

### 2. Mention Autocomplete Dropdown (RoomChat.tsx)
- Detect `@` typed in the composer textarea
- Query profiles via `get_community_profiles` RPC or a lightweight query for display_name/username
- Show a small dropdown above the cursor with matching users (filtered as user types)
- Only show the autocomplete for users with admin/CEO/operator permissions (use `useAcademyPermissions`)
- Include `@everyone` option at top of list (admin/CEO/operator only)
- On selection, insert `@username` into the draft text

### 3. Send Flow: Extract Mentions & Create Notifications (RoomChat.tsx + useRoomMessages.ts)
After `sendMessage` succeeds:
- Parse the message body for `@username` patterns
- If `@everyone` is found (and sender is admin/CEO/operator), insert a broadcast notification (`user_id: null`) into `academy_notifications`
- If specific `@user` found, look up their user_id and insert a targeted notification into `academy_notifications` with their user_id
- Notification title: `"{sender_name} mentioned you in #{room}"`, body: message preview, link_path: `/academy/community`

### 4. Render @mentions with highlight (RoomChat.tsx)
- In `renderPlainBody`, detect `@username` or `@everyone` patterns and render them as highlighted spans (e.g., `text-primary font-semibold bg-primary/10 rounded px-0.5`)

### 5. Permission Gate
- The `@` autocomplete only activates for users where `useAcademyPermissions` returns `isCEO || isAdmin || isOperator`
- Regular members can type `@` but it won't trigger autocomplete or create notifications

### Files to create/modify:
- **New**: `src/hooks/useMentionAutocomplete.ts` — fetches user list, filters by typed query
- **Edit**: `src/components/academy/RoomChat.tsx` — add mention autocomplete UI in composer, parse mentions on send, highlight mentions in body
- **Edit**: `src/hooks/useRoomMessages.ts` — add mention notification insertion after successful send

### Technical Notes
- User list for autocomplete is fetched once via `supabase.from('profiles').select('user_id, display_name, username, avatar_url')` (operator RLS allows this; for non-operators we use the existing `get_community_profiles` RPC)
- Notifications use the existing `academy_notifications` table and realtime subscription — the notification tray auto-opens when a new notification arrives (already implemented)
- `@everyone` inserts with `user_id: null` which broadcasts to all users per existing RLS policy

