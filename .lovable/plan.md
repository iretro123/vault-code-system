

## Fix: Full-size chat images on mobile

### Problem
On mobile, chat attachment images have `max-w-[360px]` which can exceed the chat bubble width, causing overflow or awkward layout. Trade card chart images are completely hidden on mobile (`hidden sm:block`).

### Changes — `src/components/academy/RoomChat.tsx`

**1. Regular chat attachments (line 1102)**
Change `max-w-[360px]` to `max-w-full sm:max-w-[360px]` so images fill the available bubble width on mobile and cap at 360px on larger screens.

**2. Trade card chart image (line 125)**
Remove `hidden sm:block` so the chart image shows on mobile too. Change the container to display below the trade fields on mobile (full width) and beside them on desktop. Update to: `block sm:hidden:false` — specifically change to a bottom section on mobile with `sm:border-l` and `sm:max-w-[280px]`, showing full-width on small screens.

Two lines changed, no logic changes.

