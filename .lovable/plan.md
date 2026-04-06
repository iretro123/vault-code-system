

## Fix Trade OS Card Container Width — Stop Text Cutoff

### Problem
The previous change set the container to `max-w-2xl` (672px), which is too narrow for the 3-column card grid in the "Go Live" stage. At 672px, each of the three cards gets ~200px, causing text labels like "DAILY BUFFER", "RISK / TRADE", "Set Your Session Window" to overflow and become unreadable.

### Fix
Widen the container from `max-w-2xl` to `max-w-3xl` (768px). This gives each card in the 3-column grid ~240px — enough room for all labels and values to render cleanly, while still being much narrower than the old `max-w-7xl` (1280px). The layout stays centered and focused.

### File: `src/pages/academy/AcademyTrade.tsx`

**Line 697** — Change:
```
max-w-2xl mx-auto
```
To:
```
max-w-3xl mx-auto
```

One line change. The 3-column "Go Live" grid, metric cells, session window card, and focus card will all have proper breathing room.

