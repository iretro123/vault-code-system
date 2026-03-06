

## Remove Urgency Selector from Coach Drawer

### Change

**`src/components/academy/CoachDrawer.tsx`** (lines 704–720)

- Remove the entire "Urgency" section (label, toggle buttons for standard/priority, and description)
- Replace with a simple static line: `Standard: usually within 1–2 hours`
- Hard-code `urgency` to `"standard"` (remove the state setter usage for urgency selection, keep the state default so DB insert still works)
- Update the description text from "2–4 hours" to "1–2 hours"

Single file, ~15 lines replaced with ~3 lines.

