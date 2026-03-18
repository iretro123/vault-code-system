

## Fix: Luxury Agreement Modal with Visible Checkbox

### Problems Identified
1. The checkbox is invisible — it's rendered but the dark-on-dark styling makes it completely hidden
2. The modal footer area lacks visual separation between the legal checkbox text and the confirm button
3. Overall modal lacks the premium glassmorphism aesthetic used elsewhere in the app

### Changes (single file: `src/pages/Signup.tsx`)

**1. Fix the invisible checkbox**
- Make the checkbox larger (`h-5 w-5`) with a bright visible border (`border-white/40`)
- Add a glowing ring on checked state (`data-[state=checked]:shadow-[0_0_8px_rgba(59,130,246,0.4)]`)
- Ensure high contrast: unchecked = visible white/40 border, checked = primary blue fill

**2. Upgrade modal to luxury glass aesthetic**
- Modal container: add inner glow border (`border-white/[0.08]`), richer shadow with blue accent glow
- Header: add subtle gradient background, larger shield icon with glow ring
- Scroll area: add inner inset shadow for depth, slightly darker bg
- Footer: frosted glass bg (`bg-white/[0.03] backdrop-blur`), more breathing room
- "Accept & Continue" button: add shimmer/glow effect on enabled state

**3. Upgrade the launcher row on the signup form**
- Add subtle inner glow and richer border styling
- Bigger icon with soft glow background

**4. Separate checkbox from label more clearly**
- Add padding around the checkbox area
- Make checkbox label text slightly larger (`text-[11.5px]`)
- Add a subtle rounded container around the checkbox + label for visual grouping

