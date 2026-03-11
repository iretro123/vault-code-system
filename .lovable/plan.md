

# Polish VAULT Approval — Luxury, Accessible, High-Ticket Feel

## What's Wrong Now
- "Use This Plan" button has a cramped checkmark and chevron that looks off-balance
- Contract choice cards feel flat — need more depth and tactile feedback
- Direction toggle looks basic — needs premium segmented control feel
- Rules strip chips are functional but not luxurious
- Overall spacing, touch targets, and visual hierarchy need refinement for all user types (ADHD, elderly, veterans, pros, young)

## Design Principles
- **Large touch targets** (min 48px height on interactive elements)
- **Clear visual hierarchy** — one thing demands attention at a time
- **High contrast** for readability (elderly/accessibility)
- **Satisfying feedback** — selection states feel tactile and rewarding
- **Minimal cognitive load** — ADHD-friendly, no clutter

## Changes to `VaultTradePlanner.tsx`

### 1. "Use This Plan" CTA Button
- Height → `h-14` (56px), properly centered content
- Remove the awkward `ml-auto` ChevronRight — replace with a clean right-arrow icon that flows naturally
- Add a subtle shimmer/shine animation on the gradient to make it feel alive
- Larger text (`text-[15px]`), proper `gap-3` spacing
- Disabled state: more obviously muted
- The check icon gets a proper circular badge treatment (small white circle with check) instead of a naked SVG

### 2. Contract Choice Cards
- Increase padding, min-height for larger tap targets
- Selected card: thicker ring (`ring-2`), deeper glow, subtle scale-up (`scale-[1.02]`)
- Hover: lift effect with `hover:-translate-y-0.5` and glow increase
- "Best" badge: slightly larger with a soft pulse animation
- Status badges: bigger (`text-[11px] px-3 py-1.5`), more readable
- Contract number: larger (`text-3xl`) with more breathing room
- Metric text: bump up to `text-[11px]` labels and `text-sm` values for readability

### 3. Direction Toggle
- Taller buttons (`py-4`) — bigger tap targets
- Selected state gets a filled pill background instead of just underline
- Smooth `transition-all duration-200` with subtle scale
- Icons slightly larger (`h-5 w-5`)

### 4. Rules Strip
- Chips get slightly more padding, larger text
- Values use `text-base font-bold` instead of `text-sm`
- Add subtle inner glow to the accent chip

### 5. Hero Decision Card
- Status text: `text-5xl` for maximum impact
- Detail rows: larger text (`text-sm` labels, `text-base` values) with more vertical spacing
- Coaching note: slightly larger text, more padding
- Overall card padding increased to `p-7`

### 6. Input Fields
- Contract price input: `h-16 text-2xl` — big, confident, easy to tap
- Ticker input: `h-12` with larger placeholder text
- Both get slightly thicker focus rings

### 7. CSS Addition (index.css)
- Add `.vault-cta-shine` keyframe for subtle gradient shimmer on CTA
- Add `.vault-choice-lift` for card hover lift effect

## Files Changed

| File | Change |
|------|--------|
| `src/components/vault-planner/VaultTradePlanner.tsx` | UI polish across all sub-components |
| `src/index.css` | Add CTA shine animation + card lift utility |

