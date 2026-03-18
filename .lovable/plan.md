
Goal: Fix the mobile `/signup` agreement modal so users can reliably scroll the legal text to the bottom and still access the checkbox + “Accept & Continue” button.

What I found
- The modal currently relies on `ScrollArea` inside `DialogContent`.
- `DialogContent` base styles include `grid`, while this modal tries to use `flex`; this can cause unstable layout sizing on mobile.
- The legal section scroll behavior is inconsistent in mobile/touch contexts, which matches your report.

Implementation plan

1) Make modal layout deterministic for mobile
- File: `src/pages/Signup.tsx`
- Force the agreement modal container to true flex column with explicit override (`!flex !flex-col`) and keep a viewport-bound height.
- Keep `max-h` tied to viewport and safe margins so modal never exceeds screen.

2) Replace modal legal-body scrolling with native touch scrolling
- In this modal only, replace `ScrollArea` with a native `div` scroll container for better mobile reliability.
- Apply mobile-safe scroll classes:
  - `overflow-y-auto`
  - `overscroll-contain`
  - `touch-pan-y`
  - `[-webkit-overflow-scrolling:touch]`
  - `min-h-0 flex-1`
- Keep the same legal copy and premium visual styling.

3) Keep footer controls always visible and tappable
- Ensure checkbox + button block stays `shrink-0` below the scroll container.
- Add small safe-area-aware bottom padding in the modal footer so controls are not cramped near gesture/home indicators on phones.

4) Validate behavior on mobile viewport (390x720)
- Open `/signup` → tap “Review & Accept”.
- Verify swipe scrolling works inside the legal text area (can reach final paragraph).
- Verify checkbox remains visible and tappable.
- Verify “Accept & Continue” is reachable without content getting stuck.
- Re-check main signup page still scrolls top↔bottom after closing modal.

Acceptance criteria
- Users can scroll the agreement text smoothly on mobile touch.
- Checkbox and accept button remain visible and interactive.
- No regression to desktop modal appearance or signup flow.
