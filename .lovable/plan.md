

## Fix Mobile Inbox Panel

### Problem
On mobile, clicking the inbox icon in the sidebar opens the `InboxDrawer` panel positioned at `left: var(--sidebar-width)` — which places it partially off-screen behind the sidebar overlay. The sidebar stays open, both compete for space, and the inbox content is clipped/unusable.

### Solution
On mobile, the InboxDrawer should render as a **full-screen panel** instead of a side-anchored floating panel. When opened on mobile:

1. **Close the sidebar first** — call `setOpenMobile(false)` before opening inbox
2. **Render full-screen on mobile** — instead of `fixed left-[var(--sidebar-width)] w-[340px]`, use `fixed inset-0` on mobile so the inbox takes the full viewport

### Changes

**File: `src/components/academy/InboxDrawer.tsx`**
- Accept `isMobile` prop (or use `useIsMobile` hook internally)
- On mobile: change the panel positioning from `fixed left-[var(--sidebar-width)] w-[340px]` to `fixed inset-0 w-full` (full-screen overlay)
- Apply this to both the main inbox view (line 613-617) and the thread view (line 590-593)

**File: `src/components/layout/AcademySidebar.tsx`**
- When inbox button is clicked on mobile: close the sidebar first (`setOpenMobile(false)`), then open inbox
- Update the inbox button `onClick` handler (line 289-293) to include `if (isMobile) setOpenMobile(false);`

### Technical Details

In `InboxDrawer.tsx`, add the `useIsMobile` hook and conditionally apply positioning:

```tsx
// Desktop: current anchored panel
"fixed left-[var(--sidebar-width,16rem)] top-14 bottom-4 z-50 w-[340px]"

// Mobile: full-screen overlay
"fixed inset-0 z-50 w-full max-w-full"
```

In `AcademySidebar.tsx`, update the inbox click handler:

```tsx
onClick={(e) => {
  e.preventDefault();
  e.stopPropagation();
  if (isMobile) setOpenMobile(false); // close sidebar first
  handleInboxChange(!inboxOpen);
}}
```

Both the main panel render and the thread view render need the mobile-aware class logic.

