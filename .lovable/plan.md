

## Stack Settings Navigation on Mobile

**Problem:** The horizontal pill-based nav on mobile requires swiping to discover hidden tabs, creating friction.

**File:** `src/pages/academy/AcademySettings.tsx`

**Change:** Replace the horizontal scrolling pill row (lines 76-93) with a vertical stacked list for mobile. Each nav item becomes a full-width row with icon + label, similar to iOS Settings style. When a section is selected, show the content below the list (or replace the list with the section content + a back button).

**Approach:** Vertical list with tap-to-reveal pattern:
- Default view: stacked list of all 7 settings sections (Profile, Trading Preferences, Billing, Notifications, Privacy & Data, Security, Help) as full-width rows
- Tapping a row shows that section's content with a "← Settings" back link at top
- This eliminates hidden tabs entirely and matches native mobile settings patterns

No changes to desktop layout.

