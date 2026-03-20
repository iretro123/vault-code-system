

## Fix Tab Header Text Wrapping on Mobile

### Problem
"Start Your Day" and "My Insights" wrap to two lines on mobile (390px), creating a cheap, cluttered feel.

### iOS Design Pattern
Apple uses **short labels on inactive tabs** and only shows the full label on the active one. Think of iOS segmented controls — compact single-line text, never wrapping.

### Solution
Add a `shortLabel` to the TABS config used only on mobile for inactive tabs. Active tab shows the full label.

| Key | Full Label | Short Label |
|-----|-----------|-------------|
| plan | Start Your Day | Plan |
| live | Go Live | Live |
| review | Review | Review |
| insights | My Insights | Insights |

On mobile: inactive tabs show `shortLabel`, active tab shows full `label`. On desktop: always show full `label`.

### Changes — `OSTabHeader.tsx`
- Add `shortLabel` field to TABS array
- Render logic: `isMobile && !isActive ? tab.shortLabel : tab.label`
- This keeps all tabs single-line on mobile while the active tab gets the full descriptive name

