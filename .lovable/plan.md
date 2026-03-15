

# Fix: Center 88% Text Inside Compliance Ring

**Problem:** The `absolute` overlay on line 649 has `inset-0` (fills entire parent) but also `w-12 h-12` which fights it — the div ends up 48x48 pinned to top-left of the parent, not centered over the SVG. The parent includes the "This week" label below, so `inset-0` doesn't match the SVG dimensions anyway.

**Fix in `src/pages/academy/AcademyTrade.tsx`:**

Wrap just the SVG + overlay text in their own `relative` container, and let the "This week" label sit outside it.

```
<div className="flex flex-col items-center shrink-0">
  <div className="relative w-12 h-12">
    <svg ...>...</svg>
    <div className="absolute inset-0 flex items-center justify-center">
      <span ...>{weeklyComplianceRate}%</span>
    </div>
  </div>
  <span className="text-[8px] ...">This week</span>
</div>
```

The key: `relative` + explicit `w-12 h-12` on the wrapper that contains ONLY the SVG and the text overlay. `inset-0` then perfectly fills that 48x48 box, centering the text. One structural tweak, guaranteed center.

