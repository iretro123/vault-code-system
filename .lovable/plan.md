

## Add Bottom Padding Below Chat Content

The chat content area (line 68) fills the panel edge-to-edge with no bottom spacing. Need to add padding at the bottom of the tab content container so messages don't sit flush against the panel's bottom edge.

### Change in `src/pages/academy/AcademyCommunity.tsx`

**Line 68**: Add `pb-3` to the tab content wrapper:
```
<div className="flex-1 overflow-hidden relative pb-3">
```

This adds 12px bottom padding inside the panel, matching the `m-3` outer margin spacing.

