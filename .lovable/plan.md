

## Plan: Animate Status Line Text on Appear

### Problem
The greeting ("Good morning, RZ") animates in with the parent card's `animate-fade-in`, but when the status line resolves from `null` (skeleton) → text, it just snaps in without any entrance animation.

### Fix: `src/components/academy/dashboard/HeroHeader.tsx`

Add `animate-fade-in` to the status line `<p>` tag so it fades in smoothly when it replaces the skeleton:

**Line 264** — change:
```tsx
<p className="text-sm text-muted-foreground/80 leading-relaxed max-w-lg">
```
to:
```tsx
<p className="text-sm text-muted-foreground/80 leading-relaxed max-w-lg animate-fade-in">
```

Single class addition, one line change.

### Files Modified
- `src/components/academy/dashboard/HeroHeader.tsx` — add `animate-fade-in` to status line paragraph

