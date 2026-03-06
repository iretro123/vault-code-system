

## Luxury Dark Theme for Community Chat

### Problem
The community section uses a light grey workspace (`hsl(220,16%,96%)`) that clashes with the rest of the dark premium UI. The tab bar, chat backgrounds, message bubbles, input area, and cockpit panel all use light greys that feel out of place.

### Approach
Convert the entire community section to match the existing dark "neutral ash" design system. Premium, calm, dark surfaces with subtle borders — consistent with Dashboard, Learn, and other pages.

### Files & Changes

**1. `src/pages/academy/AcademyCommunity.tsx`**
- Outer panel: Remove the light grey `bg-[hsl(220,16%,96%)]` floating workspace. Use `bg-card` (dark card surface) with dark border `border-white/[0.05]`.
- Tab bar: Dark pill-style tabs — background `bg-white/[0.04]`, active tab `bg-white/[0.1]` with light text, inactive `text-muted-foreground`.
- Remove the blue underline indicator on active tab.

**2. `src/components/academy/community/CommunityTradeFloor.tsx`**
- Main container: `bg-background` instead of light grey.
- Cockpit panel border/bg: dark theme (`bg-card`, `border-white/[0.05]`).

**3. `src/components/academy/community/TradeFloorHero.tsx`**
- Strip bg: dark surface `bg-white/[0.03]` with `border-white/[0.05]`.
- Ticker text: keep blue accent, but on dark surface.

**4. `src/components/academy/RoomChat.tsx` (bulk of changes)**
- Main feed bg: `bg-background` (dark workspace).
- Loading skeletons: dark shimmers (`bg-white/[0.06]`).
- Message row hover: `hover:bg-white/[0.03]`.
- Other-user bubbles: `bg-white/[0.06] border-white/[0.06]` with light text.
- Own-user bubbles: keep blue gradient (already premium).
- Admin/CEO bubbles: `bg-amber-500/[0.08] border-amber-500/20` with light amber text.
- Deleted message: dark muted surface.
- Timestamps/meta text: `text-muted-foreground`.
- File attachment links: dark surface style.
- Reaction/thread buttons: dark hover states.
- Composer bar: dark input surface (`bg-card border-white/[0.08]`), textarea text white, placeholder muted.
- Send button: keep blue gradient.
- Reply preview: dark surface.
- Quick-action chips: dark hover.
- Read-only notice: dark text.
- Date separator: dark tones.

**5. `src/components/academy/community/CockpitPanel.tsx`**
- Cards: dark surfaces (`bg-card`, `border-white/[0.05]`).
- Text colors: light foreground instead of dark grey HSL values.
- Metric rows: light text with accent colors preserved.

### Design Principles
- All `hsl(220,xx%,9x%)` light greys → dark equivalents using CSS vars or `white/[0.xx]` opacity patterns.
- Message readability preserved: other-user bubbles get subtle frosted dark surface, own bubbles stay blue.
- Borders: `white/[0.05]` to `white/[0.08]` range.
- No backdrop-blur on large areas (performance rule).

