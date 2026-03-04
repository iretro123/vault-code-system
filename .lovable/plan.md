

## Add Gold-to-Pink Gradient Sparkle to "Ask Coach" Dropdown Item

Reuse the same SVG gradient effect from the sidebar's Ask Coach button on the "Ask Coach" item in the HeroHeader dropdown.

### Changes to `src/components/academy/dashboard/HeroHeader.tsx`

- Add the hidden SVG `<defs>` block (with `linearGradient id="hero-coach-sparkle-grad"`) inside the `DropdownMenuContent`, using the same gold-to-pink stops (`#FDE68A → #FBBF24 → #F472B6`)
- In the `.map()` rendering, when `item.action === "coach"`, apply the gradient fill/stroke and glow filter to the Sparkles icon instead of the default `text-primary/70` class
- All other icons remain unchanged

**Result:** The "Ask Coach" dropdown item gets the same premium gold-to-pink sparkle effect as the sidebar button. One file edit.

