

## Fix Avatar Rendering in Admin Inbox (Verified Live)

### What I found by testing

**Bug 1 — Inbox list**: `SenderAvatar` (line 59-64) treats ALL non-HTTP avatars the same — falls back to `rzAvatar`. John Doe's avatar is likely `icon:diamond|hsl(...)` or `initials:hsl(...)` format, which is not an HTTP URL, so it shows the admin's photo instead of JD's initials/icon.

**Bug 2 — Thread view**: Admin's outgoing messages (line 201-204) only render `AvatarFallback` with initials. The admin's `profile.avatar_url` is also in `icon:` format (not HTTP), so `AvatarImage` has nothing to render and falls back to a plain "R". The `ChatAvatar` component from `chatAvatars.tsx` already handles all three formats (`icon:`, `initials:`, `http`) correctly — but is not used here.

### Fix (single file: `InboxDrawer.tsx`)

**1. Import `ChatAvatar`** from `@/lib/chatAvatars`

**2. Replace `SenderAvatar` component (lines 43-72)**
- Check if sender is an operator (role = CEO/Admin/Coach/Operator) → use `rzAvatar` import as before
- For regular members → use `ChatAvatar` component with `item.sender_avatar` and `item.sender_name`, which correctly parses `icon:`, `initials:`, and HTTP formats

**3. Fix admin's own avatar in thread messages (lines 200-204)**
- Replace the plain `Avatar`/`AvatarFallback` with `ChatAvatar` using `(profile as any)?.avatar_url` and `userName`
- This will render the admin's actual icon/image avatar instead of just "R"

**4. Fix member avatar in thread messages (lines 206-209)**
- Replace the plain `Avatar` with `ChatAvatar` using `item.sender_avatar` and `senderName`

**5. Fix thread header avatar (lines 165-168)**
- Replace `Avatar`/`AvatarFallback` with `ChatAvatar` for the member's header avatar

### Result
- Inbox list: member messages show member's actual avatar (icon/initials), admin messages show RZ photo
- Thread view: admin's messages show their actual avatar, member's messages show member's avatar
- All avatar formats (`icon:`, `initials:`, `http`) render correctly everywhere

