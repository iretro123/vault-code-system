

## Fix: Use Short Labels for ALL Mobile Tabs

### Problem
On mobile, the active tab still shows "Start Your Day" (wraps to 2 lines). Current logic: `isMobile && !isActive ? shortLabel : label` — active tab always gets the full label.

### Fix — `OSTabHeader.tsx`
1. Change `shortLabel` for plan tab: `"Plan"` → `"Start"`
2. Change render logic from `isMobile && !isActive ? tab.shortLabel : tab.label` to `isMobile ? tab.shortLabel : tab.label` — all tabs use short labels on mobile, regardless of active state

