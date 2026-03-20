

## Shrink Pass v2 — Tighter Desktop at `md:` and `lg:`

From the screenshot, the hero risk card with `$18,332` balance and the 2×2 metric grid still dominates the viewport. The stage headline takes up significant vertical space. Everything needs another notch tighter.

---

### Changes — `AcademyTrade.tsx`

**1. Stage Headline (line 95)**
- `py-6` → `md:py-3`
- Title: `text-2xl` → `md:text-xl`
- Divider: `mt-4` → `md:mt-2`

**2. Hero Risk Card (line 856)**
- Outer: `md:py-4 md:px-4` → `md:py-3 md:px-3`
- `md:space-y-3` → `md:space-y-2`
- Balance: `md:text-3xl` → `md:text-2xl`
- "Account Balance" label: stays `text-[9px]`
- Metric values: `md:text-lg` → `md:text-base`
- Risk buttons: `md:h-6 md:w-10` → `md:h-5 md:w-9`
- Direction buttons: `md:h-7 md:px-3` → `md:h-6 md:px-2.5`
- Ticker input: `h-8` → `md:h-6`
- Grid gap: `gap-2` → `md:gap-1.5`

**3. Lock In CTA (line 994–996)**
- `md:h-11` → `md:h-10`
- `md:mt-4` stays

**4. Go Live Hero Zone (line 1019)**
- `md:py-5` → `md:py-4`
- Shield container: `md:w-10 md:h-10` → `md:w-8 md:h-8`
- Shield icon: `md:h-5 md:w-5` → `md:h-4 md:w-4`
- Status label: `md:text-2xl` → `md:text-xl`
- `space-y-3` → `md:space-y-2`
- Hero border-radius inline style: `16px` → add md override

**5. Three Major Cards (line 1061)**
- `md:p-3` → `md:p-2.5`
- `gap-2.5` → `md:gap-2`

**6. Review Stage (line 1189)**
- `md:py-4 md:px-4` → `md:py-3 md:px-3`
- Question text: `md:text-lg` → `md:text-base`
- Choice buttons: `md:p-4` → `md:p-3`
- Icons: `md:h-6 md:w-6` → `md:h-5 md:w-5`

**7. Insights Stage (line 1258)**
- Unlock card: `md:py-5 md:px-4` → `md:py-4 md:px-3`
- AI grid cards: `md:p-3` → `md:p-2.5`

**8. End Session button (line 1163)**
- Keep `md:h-10 md:px-8` (already tight)

---

### Changes — `index.css`

**9. vault-metric-cell** — tighten further at md:
- `padding: 0.375rem 0.5rem` → `padding: 0.25rem 0.375rem`
- Add `border-radius: 8px` at md (was 12px)

**10. vault-obsidian-surface** — tighten at md:
- Already `border-radius: 12px` → change to `10px`

**11. vault-luxury-card** — tighten at md:
- Already `border-radius: 12px` → change to `10px`

---

### Changes — `NYSESessionBar.tsx`

**12.** Already has `md:p-3` — no further change needed.

---

### Summary

Another round of `md:` responsive tightening. Balance goes from 3xl→2xl, metrics from lg→base, card padding from p-3→p-2.5, hero shield from w-10→w-8. Same luxury depth, just 15-20% tighter on desktop. No logic changes. Mobile untouched.

| File | Scope |
|------|-------|
| `AcademyTrade.tsx` | Tighter md: overrides on all 4 stages + headline |
| `index.css` | Smaller metric-cell padding + tighter border-radius |

