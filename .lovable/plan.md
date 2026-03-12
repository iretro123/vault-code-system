

# Redesign: AI Mentor → Swipeable Premium Card Carousel

## Problem
Currently the AI Mentor shows 6 stacked cards all at once — Pattern, Mistake, Directive, Sizing, Session Tip, Risk Assessment. On mobile and even desktop, this creates a wall of text that feels cluttered and cheap. No interactivity, no delight.

## Solution
Replace the stacked cards with a **swipeable carousel** (using `embla-carousel-react`, already installed) where each insight gets a **full-bleed hero card** with rich visuals. Think Robinhood's portfolio insight cards — one card at a time, dot indicators, swipe left/right.

## UI Design

```text
┌─────────────────────────────────┐
│  ⦿ AI MENTOR  ·  LIVE          │  ← Compact header stays
│  ┌─────────────────────────────┐│
│  │  ◎ PATTERN DETECTED         ││  ← Full-height hero card
│  │                             ││
│  │  "You tend to over-size     ││  ← Large readable text
│  │   after a winning streak"   ││
│  │                             ││
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━  ││  ← Accent gradient line
│  └─────────────────────────────┘│
│         ● ○ ○ ○ ○ ○            │  ← Dot indicators
│               Re-scan ↻         │
└─────────────────────────────────┘
```

Each card is a distinct "slide" with:
- A large icon with glow effect at top
- The category label (PATTERN / MISTAKE / SIZING etc.)
- The AI-generated insight text, larger and more readable
- Subtle gradient accent matching the category color
- Smooth swipe transitions with spring physics

## Backend Enhancement (Edge Function)
The `trade-focus` edge function already ingests trades, journal, plans, and vault state. We'll add two more data sources:

1. **Daily checklist** (`vault_daily_checklist`) — readiness/mental state data
2. **Live session attendance** (`vault_focus_sessions`) — track if they actually show up and complete sessions

Update the system prompt to reference these pipelines so the AI can comment on attendance patterns, readiness trends, and session completion rates.

## Changes

### 1. `src/pages/academy/AcademyTrade.tsx` — `AIFocusCard` component (~lines 727-955)
- Replace the stacked `sections.map()` with an Embla carousel
- Each section becomes a full-bleed slide
- Add dot indicators + touch/drag swipe
- Discipline badge moves into the header
- Encouragement becomes the last slide (special styling)
- Add staggered entrance animation on first load
- Card height is consistent (no layout shift between slides)

### 2. `supabase/functions/trade-focus/index.ts`
- Add parallel fetch for `vault_daily_checklist` (last 10 entries) and `vault_focus_sessions` (last 10)
- Append readiness/checklist data and session attendance data to the system prompt
- Add `attendanceInsight` field to the tool schema — a 1-sentence observation about their session discipline
- This makes the AI aware of whether the student is checking in, showing up, and mentally prepared

### 3. `src/pages/academy/AcademyTrade.tsx` — `AIFocusResult` interface
- Add `attendanceInsight?: string` to the interface
- Add it as a new slide in the carousel (with a calendar/clock icon)

## Technical Details

**Carousel setup** (Embla is already in `package.json`):
```tsx
import useEmblaCarousel from "embla-carousel-react";

const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "center" });
const [selectedIndex, setSelectedIndex] = useState(0);

// Sync selected index
useEffect(() => {
  if (!emblaApi) return;
  const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
  emblaApi.on("select", onSelect);
  return () => { emblaApi.off("select", onSelect); };
}, [emblaApi]);
```

**Slide styling** — each slide fills the viewport width of the container with consistent height (~160px), centered text, large icon glow, and the category's accent gradient as a subtle background wash.

**Dot indicators** — small circles below the carousel, active dot uses the current card's accent color with a glow.

**Mobile**: Full swipe gesture. **Desktop**: Drag or click dots. Both feel premium.

