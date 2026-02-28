

## Blue Glow Border on Hover — Share Vault Card

### Approach
Add a CSS-only hover glow effect to the Share Vault card button in the sidebar. On hover, the border transitions from the current subtle `rgba(255,255,255,0.04)` to a soft blue glow using `box-shadow` and border-color change. Pure CSS, no JS animation, no layout shift, no impact on other sidebar elements.

### File: `src/components/layout/AcademySidebar.tsx` (lines 240-246)

Update the Share Vault `<button>` to use a CSS class for the glow effect instead of inline border style, and add `transition` for smooth animation.

**Changes:**
- Remove inline `border` from `style` prop
- Add a new class `share-vault-glow` to the button
- Keep existing `background`, `rounded-2xl`, `active:scale` behavior intact

### File: `src/index.css`

Add a small utility class in `@layer utilities`:

```css
.share-vault-glow {
  border: 1px solid rgba(255,255,255,0.04);
  transition: border-color 300ms ease, box-shadow 300ms ease;
}
.share-vault-glow:hover {
  border-color: rgba(59,130,246,0.4);
  box-shadow: 0 0 12px 2px rgba(59,130,246,0.15), 0 0 4px 1px rgba(59,130,246,0.1) inset;
}
```

This gives a subtle blue glow on hover — premium, calm, not flashy. Matches the Vault blue accent `#3B82F6`. Only affects the Share Vault card.

### Files to modify
- `src/components/layout/AcademySidebar.tsx` (1 line change)
- `src/index.css` (add ~8 lines)

