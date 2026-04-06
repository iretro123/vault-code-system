

## Remove "Your Workflow" Left Rail from Trade OS

### Problem
The left-side `OSControlRail` ("Your Workflow" section) makes the layout too wide and cluttered on desktop. The screenshot shows it should be a single-column centered layout with just the tabs + content.

### Fix
Remove the left guide rail `div` (lines 763-782) and the wrapping `flex` container, so the hero OS card contains only the tabs + content column directly.

### File: `src/pages/academy/AcademyTrade.tsx`

**Lines 761-785** — Remove the `flex` wrapper and the entire left rail block:

```tsx
// Before:
<div className="vault-os-card overflow-hidden">
  <div className="flex">
    {/* LEFT GUIDE RAIL */}
    <div className="hidden lg:block w-[240px] ...">
      <OSControlRail ... />
    </div>
    {/* RIGHT: Tabs + Content */}
    <div className="flex-1 min-w-0">

// After:
<div className="vault-os-card overflow-hidden">
    <div className="min-w-0">
```

And remove the corresponding closing `</div>` for the deleted flex wrapper.

Also remove the `OSControlRail` import at line 48 since it's no longer used.

### Result
- Single centered column layout matching the screenshot
- Tabs (Start Your Day / Go Live / Review / My Insights) sit directly at top of the hero card
- No side panel competing for space

