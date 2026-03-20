

## Trade OS — Center Identity + Clean & Simplify

### Problem
1. "Your Command Center" title is left-aligned, should be centered with the Trade OS pill
2. "Your Trading Day" card duplicates balance (shown again in hero risk card) and trade count (shown in HUD)
3. Stage breadcrumb trail (Start Your Day → Go Live → Review → My Insights) duplicates the OSTabHeader tabs
4. "Yesterday" recap, compliance ring, max loss today line, and luminous dividers add clutter

### Changes

**File: `AcademyTrade.tsx`**

**1. Center the Trade OS Identity (lines 601–632)**
Replace left-aligned layout with centered:
- Trade OS pill: centered, same style
- Title: "Trade OS" (not "Your Command Center"), centered, `text-2xl md:text-[28px]`
- Remove the stage breadcrumb trail (lines 609–630) — tabs already handle this
- Remove the bottom divider line (line 631)
- Clean, minimal: just pill + title + thin subtitle

**2. Simplify "Your Trading Day" card (lines 634–738)**
Strip it down to essential, non-duplicated info only:
- Keep: Today P/L pill (unique, not shown elsewhere)
- Keep: Day status dot + status text (e.g. "Rules locked — ready to trade")
- Remove: Balance display (already in hero risk card)
- Remove: Yesterday recap (noise)
- Remove: Win rate / Rules % inline stats (shown in Session Stats collapsible)
- Remove: Luminous divider + "X trades today · $X max loss today" line (duplicated in HUD/limits)
- Remove: Compliance ring (shown in Session Stats)
- Result: a slim, single-line status bar instead of a full card

**3. Clean up duplicated elements**
- The "Your Trading Day" card becomes a slim contextual status strip: just the day state + today P/L badge, no card wrapper — more like a subtle info line between the identity and the OS card

### Summary
3 targeted changes in one file. Centers the identity, strips duplicates from the Trading Day section, removes the redundant breadcrumb. Same premium feel, dramatically cleaner.

| File | Scope |
|------|-------|
| `AcademyTrade.tsx` | Center identity, slim down Trading Day, remove breadcrumb |

