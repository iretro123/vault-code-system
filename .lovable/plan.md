

## Gameplan Card: Show First Group, "Show More" for Rest (Mobile)

**What:** On mobile, always show the first task group (Foundation) inline. Hide the remaining groups behind a "Show More" button. On desktop, show everything as-is.

### Changes to `GameplanCard.tsx`

- Remove the `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent` wrapping (no longer collapsing the whole card)
- Remove the chevron from the header
- Add `expanded` state (default `false` on mobile, always `true` on desktop)
- Render `groups[0]` (Foundation) always visible
- Render `groups.slice(1)` (This Week + Consistency + Recently Completed) only when `expanded` or on desktop
- Add a "Show More" / "Show Less" button at the bottom on mobile that toggles `expanded`
- Button styled as a subtle full-width text button with chevron icon

**Result:** Mobile users see the header, progress bar, and first 3 tasks immediately. One tap on "Show More" reveals the rest. Desktop unchanged.

**Files:** 1 edit (`GameplanCard.tsx`)

