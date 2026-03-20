

## Shrink Cards for Desktop/Laptop — Premium Retina Polish

The cards, hero sections, and metrics are sized generously for mobile but feel oversized on larger screens. This pass tightens spacing and font sizes at `md:` breakpoints while keeping the luxury retina feel.

---

### Changes — All in `AcademyTrade.tsx`

**1. Hero Risk Card (Plan Stage, ~line 855)**
- Outer padding: `py-6 px-5` → `md:py-4 md:px-4` (keep mobile sizes)
- Balance font: `text-4xl` → `md:text-3xl`
- Metric values (`text-xl`): → `md:text-lg`
- Metric cell labels stay at `text-[8px]` (already small)
- `space-y-5` → `md:space-y-3`
- Risk % buttons: `h-7 w-12` → `md:h-6 md:w-10 md:text-[10px]`
- Direction buttons: `h-8 px-4` → `md:h-7 md:px-3`

**2. Go Live Hero Zone (~line 1018)**
- Outer padding: `py-8` → `md:py-5`
- Shield icon container: `w-14 h-14` → `md:w-10 md:h-10` with `md:rounded-xl`
- Shield icon: `h-7 w-7` → `md:h-5 md:w-5`
- Status label: `text-3xl` → `md:text-2xl`
- Subtitle: keep `text-sm`

**3. Three Major Cards Grid (~line 1061)**
- Card padding: `p-4` → `md:p-3`
- Grid gap: `gap-3` → `gap-2.5`

**4. Review Stage (~line 1189)**
- Question card: `py-6 px-5` → `md:py-4 md:px-4`
- Question text: `text-xl` → `md:text-lg`
- Choice buttons: `p-6` → `md:p-4`
- Icons: `h-8 w-8` → `md:h-6 md:w-6`

**5. Insights Stage (~line 1258)**
- Unlock card: `py-8 px-5` → `md:py-5 md:px-4`
- AI grid: `gap-3` → `gap-2.5`, card padding `p-3.5` → `md:p-3`

**6. Lock In CTA (~line 994)**
- Button height: `h-14` → `md:h-11`
- `mt-6` → `md:mt-4`

**7. End Session button (~line 1163)**
- Height: `h-12 px-10` → `md:h-10 md:px-8`

---

### Changes — `index.css`

**8. vault-metric-cell** (line 748)
- Add `@media (min-width: 768px)` override: `padding: 0.375rem 0.5rem` (was 0.625rem)

**9. vault-obsidian-surface** (line 715)
- Add media query: `border-radius: 12px` at md (was 16px — tighter on desktop)

**10. vault-luxury-card** (line 293)
- Add media query: `border-radius: 12px` at md (was 16px)

---

### Changes — `NYSESessionBar.tsx`

**11.** Outer container padding: add `md:p-3` (was p-4 fixed). Bar track height stays h-7 (it's a signature element).

---

### Summary

All changes are responsive overrides at `md:` breakpoint. Mobile stays untouched. Desktop gets tighter padding, smaller fonts, smaller icons — same luxury depth and glow. No logic changes.

| File | Scope |
|------|-------|
| `AcademyTrade.tsx` | Responsive class tweaks across all 4 stages |
| `index.css` | Tighter metric-cell + card radius at md |
| `NYSESessionBar.tsx` | Tighter container padding at md |

