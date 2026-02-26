

## Floating Light Workspace — Implementation Plan

### Strategy
Wrap the Community content in a rounded, inset panel with dark gutter visible on all sides. Keep all light surfaces inside. Use layered light tones (not flat white). Ensure popovers/emoji pickers are not clipped.

### File Changes

**1. `AcademyCommunity.tsx`**
- Outer div: change `bg-[hsl(220,10%,90%)]` → `bg-background` (dark shell)
- Add inner wrapper div with: `m-3 rounded-2xl overflow-hidden border border-[hsl(220,20%,25%)] shadow-[0_4px_24px_rgba(0,0,0,0.3),0_0_0_1px_rgba(59,130,246,0.06)] bg-[hsl(220,15%,95%)]`
- Move admin bar + tabs + content inside this inner wrapper
- Tab pill container: `bg-[hsl(220,12%,91%)]` border matching workspace
- Active tab: add `shadow-[0_0_6px_rgba(59,130,246,0.12)]`

**2. `CommunityTradeFloor.tsx`**
- Outer bg: `bg-[hsl(220,14%,94%)]` (light gray-blue workspace base)
- Cockpit panel bg: `bg-[hsl(220,12%,91%)]` (slightly darker light surface for structure)
- Border between feed and cockpit: `border-[hsl(220,12%,85%)]`

**3. `TradeFloorHero.tsx`**
- Header surface: `bg-[hsl(220,14%,97%)]` (near-white, not transparent)
- Add `shadow-[0_1px_2px_rgba(0,0,0,0.04)]` under header for clean transition
- Keep light text and blue accents

**4. `CockpitPanel.tsx`**
- Wrapper bg already matches parent (`bg-[hsl(220,12%,91%)]` from parent)
- Cards stay `bg-white` with existing light borders — creates layered depth
- No changes needed beyond what parent provides

**5. `DateSeparator.tsx`**
- Line: `bg-[hsl(220,12%,86%)]` (soft gray-blue)
- Text: `text-[hsl(220,10%,52%)]` — slightly softened

**6. `RoomChat.tsx`**
- Main container bg: `bg-[hsl(220,14%,94%)]` (workspace surface, not flat white)
- Loading skeleton bg: match workspace surface
- Fix dark-mode text leftovers:
  - Announcement text `text-white/90` → `text-[hsl(220,15%,15%)]`
  - Announcement label `text-amber-300/80` → `text-amber-600`
  - `text-amber-400/80` → `text-amber-600`
  - Pinned message body `text-white/80` → `text-[hsl(220,15%,25%)]`
  - Pinned unpin button `text-white/30` → `text-[hsl(220,10%,55%)]`
  - Moderator lock button `text-white/40` → `text-[hsl(220,10%,55%)]`
- Message bubbles: keep as-is (white others, blue own — already correct)
- Composer: keep as-is (white frame, blue send — already correct)
- **Critical**: The outer `AcademyCommunity` wrapper uses `overflow-hidden` but all popovers (emoji picker, dropdown menus, context menus) already use Radix portals which render at `document.body` level — no clipping risk

### What stays unchanged
- All backend/data/auth/routing/hooks
- Tab functionality, chat posting, reactions, threads
- Message grouping, typing indicator, file upload
- Composer behavior, emoji picker, trade recap forms
- Cockpit panel data and quick actions

