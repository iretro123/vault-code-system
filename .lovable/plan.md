

# Add Dismiss (X) to Cutoff Banner + "End Session" Red Button

## Changes in `src/pages/academy/AcademyTrade.tsx`

### 1. Dismissable cutoff/closed banners
- Add a `dismissedBanner` state (`useState<boolean>(false)`)
- Add an X button (lucide `X` icon) to the right side of both the amber "Cutoff reached" banner (line 642) and red "Session closed" banner (line 648)
- Clicking X sets `dismissedBanner = true`, hiding the banner
- Reset `dismissedBanner` to false when `sessionPhase` changes (useEffect)

### 2. Red "End Session" button below the SessionSetupCard
- After `<SessionSetupCard>` (line 638) and before the banners, add a red destructive-styled button: **"End Session"**
- Only visible when session times are set (sessionPhase is not null)
- On click: transitions user to the Review stage via `setStage("review")`
- Styled: full-width, red background (`bg-red-500/15 border-red-500/20 text-red-400 hover:bg-red-500/25`), with a `Square` or `StopCircle` icon

