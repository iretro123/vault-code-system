

## Redesign HeroHeader + Dashboard Fade-In

### What changes

**1. HeroHeader redesign** (inspired by the reference image, keeping blue accent):
- Add an "ONLINE" status indicator (green dot + uppercase label) above the greeting
- Time-aware greeting: "Good morning/afternoon/evening, {firstName}" — first name highlighted in **primary blue** (not gold, keeping current palette)
- Dynamic subtitle from `DashboardStatusLine` logic integrated directly into the hero card
- Wrap the whole hero in a card-like container with the dark layered background + subtle bottom gradient fade (matching the reference's rounded card style)
- Move the Create dropdown + Upgrade button to the right side of the card

**2. Dashboard fade-in animation**:
- Add a staggered "drop down + fade in" animation to the entire dashboard content in `AcademyHome.tsx`
- Each section gets a slight stagger delay (50-100ms increments) using inline animation-delay
- Use the existing `fade-in` keyframe (translateY + opacity) which already does the dropdown effect

### Files to edit
- **`src/components/academy/dashboard/HeroHeader.tsx`** — redesign layout: online badge, time-based greeting with blue name, card wrapper with gradient, integrate status line
- **`src/pages/academy/AcademyHome.tsx`** — wrap dashboard sections in staggered fade-in animation classes

