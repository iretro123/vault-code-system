

## Plan: Replace "Weekly Review" with Animated LIVE Indicator

Replace the "Weekly Review" button in the CockpitPanel's Quick Actions with a **LIVE** indicator that links to `/academy/live`. When a session is active (or scheduled soon), it shows a breathing/pulsing red dot animation. When no session is live, it shows a calm static state. Non-intrusive — no modals, no popups, just a subtle visual cue.

### Changes: `src/components/academy/community/CockpitPanel.tsx`

1. **Remove** the `ClipboardCheck` import and the `weekly-review` action from the actions array and switch case

2. **Replace** with a `live` action that navigates to `/academy/live`

3. **Add a custom `LiveIndicator` icon component** inline — a small circle with CSS keyframe animation:
   - **Idle state**: Gray dot + "Live Sessions" label
   - **Live state** (simulated for now via a prop or schedule check): Red breathing dot (scale 1→1.4→1 loop, ~2s duration) + "LIVE" label in red with subtle pulse on the text
   - Animation uses `@keyframes` via Tailwind `animate-` class — add a `breathe` keyframe to the component via inline style or tailwind config

4. **CSS animation** (inline style on the dot):
   ```css
   @keyframes breathe {
     0%, 100% { transform: scale(1); opacity: 0.7; }
     50% { transform: scale(1.5); opacity: 1; }
   }
   ```
   Applied as `style={{ animation: 'breathe 2s ease-in-out infinite' }}` on a small red circle `<span>`

5. The button row keeps the same layout as other quick actions — icon + label + chevron — so it doesn't disrupt the sidebar visually

### Files Modified
- `src/components/academy/community/CockpitPanel.tsx` — swap Weekly Review → LIVE indicator with breathing animation

