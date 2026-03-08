

## Fix: Mobile Inbox Should Open Inside the Sidebar Sheet (Not Replace It)

### Root Cause

On mobile, the sidebar renders inside a Radix `Sheet` component. The `InboxDrawer` is a **child** of the sidebar. The previous fix calls `setOpenMobile(false)` when inbox opens — this closes the Sheet, which unmounts the InboxDrawer too. The user loses access to both navigation and inbox.

### Solution

**Keep the sidebar open. Render the inbox as an overlay panel *inside* the sidebar Sheet on mobile.**

Instead of closing the sidebar and going full-screen, the inbox should appear as a panel that slides over the sidebar content within the same Sheet. The user can close the inbox (back to sidebar) or close the whole sidebar.

### Changes

**1. `src/components/layout/AcademySidebar.tsx`** (line 292)
- Remove `if (isMobile) setOpenMobile(false);` — stop closing the sidebar when inbox opens

**2. `src/components/academy/InboxDrawer.tsx`** (lines 590-628)
- On mobile: instead of `fixed inset-0`, render as an **absolute overlay inside the sidebar** using `absolute inset-0 z-[60]` — this fills the Sheet content area without escaping it
- This way the inbox panel sits on top of the sidebar nav within the same Sheet, and closing the inbox reveals the sidebar again
- The thread view gets the same treatment

Specifically, change the mobile class from:
```
"inset-0 w-full rounded-none"   (fixed, full-screen)
```
to:
```
"absolute inset-0 w-full rounded-none"   (fills parent Sheet)
```

And remove the `fixed` from the base class — use conditional `fixed` (desktop) vs `absolute` (mobile):
```tsx
className={`z-50 flex flex-col border border-white/[0.08] bg-[hsl(220,18%,7%)]/95 backdrop-blur-xl shadow-2xl overflow-hidden ${
  isMobile
    ? "absolute inset-0 w-full rounded-none"
    : "fixed left-[var(--sidebar-width,16rem)] top-14 bottom-4 w-[340px] max-w-[90vw] rounded-xl"
}`}
```

This ensures:
- Sidebar stays open on mobile
- Inbox appears as an overlay within the sidebar sheet
- User can close inbox (X button) to return to sidebar nav
- User can close sidebar (swipe/overlay click) to dismiss everything

