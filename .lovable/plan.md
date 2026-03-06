

## Compact + Luxury Signup Redesign

Pure visual pass on `src/pages/Signup.tsx`. No logic changes.

### Compacting strategy (no scroll on 1080p)
- Reduce header: smaller icon (w-10 h-10), smaller title (text-xl), tighter margins (mb-6 instead of mb-10)
- Reduce spacing between fields: `space-y-3.5` instead of `space-y-5`
- Shrink inputs: `h-10` instead of `h-12`
- Remove helper text under Username and Phone (keeps the form tight)
- Labels: `text-xs` instead of `text-sm`, `mb-1` instead of `mb-1.5`
- Password row: side-by-side (2-col grid) like the name row
- Reduce bottom padding: `py-6` instead of `py-12`

### Luxury feel
- Subtle card container: `bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8` with soft shadow
- Inputs: slightly more refined border `border-white/[0.08]`, add `transition-colors` on focus
- Button: add subtle glow shadow on hover
- Header: add letter-spacing to "VAULT OS" (`tracking-[0.2em]`)
- "Already have an account?" inside the card at bottom
- Subtle divider line above button

### File: `src/pages/Signup.tsx`
- All changes are className/layout only
- Password + Confirm Password become a 2-col row
- No logic, validation, or data flow changes

