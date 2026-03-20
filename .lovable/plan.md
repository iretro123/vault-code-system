

## VAULT OS — "Steve Jobs Keynote" Presentation Pass

### Philosophy
One hero idea per screen. One main action. Maximum whitespace. Every element earns its place.

---

### 1. StageHeadline Redesign

**File: `AcademyTrade.tsx` (lines 87–96)**

Current: small `text-lg` title with tiny subtitle crammed together.

New: cinematic headline component with generous spacing.
- Title: `text-2xl font-bold tracking-tight` with subtle text-shadow
- Subtitle: `text-sm text-foreground/50` with `mt-1`
- Container: `py-6 text-center` — centered, not left-aligned
- Add a thin luminous divider line below: `h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent`
- Each stage gets an emotional subtitle:
  - Plan: "You know exactly what today looks like."
  - Live: "You're locked in."
  - Review: "Tell the truth."
  - Insights: "Your OS is learning you."

### 2. Start Your Day — Iconic Simplification

**File: `AcademyTrade.tsx` (plan stage, lines ~848–997)**

Strip to 3 elements with dramatic whitespace:

**A. Hero Risk Card** — keep but refine:
- Add `py-6 px-5` padding (more breathing room)
- Balance: bump to `text-4xl` (was 3xl)
- Remove tier summary line at bottom (noise)
- Add subtle status ring around the card based on risk level: emerald border glow for 1%, amber for 2%, rose for 3%
- Direction + ticker row: add `mt-4` gap before it

**B. Collapsibles** — keep Session & Targets and Contract Framework as-is (already collapsed)

**C. Lock In CTA** — elevate dramatically:
- Add `mt-6` space above it
- Make it `h-14` (was h-12)
- Add a subtle top-line shimmer: thin gradient line above the button
- After locking, show a brief "armed" confirmation state: the button transforms into a green "Rules Locked ✓" pill for 300ms before advancing

### 3. Go Live — Cinematic Session Room

**File: `AcademyTrade.tsx` (live stage, lines ~1002–1153)**

Restructure for dramatic simplicity:

**A. Hero Zone** — make it the entire emotional center:
- Remove the inline DisciplineMetricsStrip pills from the hero (too dense)
- Vault Status icon: bump to `w-14 h-14` with `rounded-2xl`
- Status label: `text-3xl font-black` (was text-xl)
- Subtitle: `text-sm text-foreground/50 mt-2`
- Add generous `py-8` padding
- The entire hero should feel like one iconic object, not a card with stuff in it

**B. NYSE Session Bar** — add `mt-4 mb-4` for isolation. Already redesigned — keep as-is.

**C. Three Cards Grid** — add `mt-2` spacing, keep `gap-3` (was gap-2)
- Remove the "Your Limits" label from inside the card (it's already obvious from context)
- Remove the "Your Session" label — instead lead with the timer
- Remove the "Your Focus" label — lead with the first bullet
- Each card gets `p-4` (was p-3.5) for more breathing room

**D. Actions** — add `mt-6` above Quick Log Trade, `mt-3` between buttons
- End Session button: add `mt-4` isolation

**E. Move DisciplineMetricsStrip** to a collapsible "Session Stats" row below the 3 cards (not in hero). Compact pill format, collapsed by default.

### 4. Review — More Emotional Weight

**File: `AcademyTrade.tsx` (review stage, lines ~1157–1234)**

- Center the question card: add `py-6` inside it
- Question text: `text-xl font-bold` (was text-base)
- "Be honest — this is how you grow." → `text-sm text-foreground/40 mt-2`
- Two choice buttons: increase padding to `p-6`, icons to `h-8 w-8`
- More whitespace between elements

### 5. Insights — Cleaner Grid

**File: `AcademyTrade.tsx` (insights stage, lines ~1238–1316)**

- Unlock card: center it vertically with more padding, make it feel like a milestone
- AI Grid (Grade/Leak/Edge/Next): increase `gap-2` to `gap-3`, add `p-3.5` inside each card

### 6. CSS — Premium Motion & Branding

**File: `src/index.css`**

Add:
- `.vault-armed-flash`: brief green flash keyframe (0.3s) for the "rules locked" confirmation
- `.vault-divider-glow`: `h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent` as a reusable class
- Increase `.vault-stage-enter` from 0.4s to 0.5s and add a slight scale: `from { scale(0.98) }` for more cinematic feel

### 7. NYSESessionBar — Minor Polish

**File: `NYSESessionBar.tsx`**

- Add `my-1` margin for vertical isolation
- Current design is already good — no major changes needed

---

### Files Summary

| File | Change |
|------|--------|
| `AcademyTrade.tsx` | Spacing, hierarchy, hero sizing, remove noise, armed state |
| `index.css` | Armed flash, divider glow, stage enter polish |
| `NYSESessionBar.tsx` | Minor margin tweak |

### What Does NOT Change
- Core logic, hooks, DB
- 4-stage architecture
- Component files (VaultStatusBadge, LiveSessionMetrics, FocusReminderCards, etc.)
- Review/Insights core logic
- Mobile patterns

