

## Enable pinch-to-zoom on PDF content area only (mobile)

**Problem:** Currently on mobile, pinch-to-zoom affects the entire page (header, footer, and PDF). Users should only be able to zoom into the PDF page itself, while the header and footer stay fixed.

### Changes

**`src/components/playbook/PlaybookReader.tsx`** (lines 210-236, the PDF content area):

1. **Add `touch-manipulation` CSS** to the header (line 137) and footer (line 240) containers so they don't respond to pinch gestures — use `touch-action: manipulation` which disables double-tap zoom but still allows scroll.

2. **Set `touch-action: pinch-zoom` on the PDF scrollable area** (line 211) so only that zone responds to pinch-to-zoom gestures. On mobile, wrap the PDF `<div>` with `touch-action: pinch-zoom` to allow native two-finger zoom on just the rendered page.

3. **Add `overflow: auto` with `overscroll-behavior: contain`** on the PDF content div to isolate scroll/zoom within that region and prevent it from bubbling up to the parent.

Concrete diff on the PDF content area (line 211):
```tsx
// Before
<div className="overflow-auto h-full flex items-start justify-center bg-black/20 py-4">

// After
<div className="overflow-auto h-full flex items-start justify-center bg-black/20 py-4"
     style={isMobile ? { touchAction: "pinch-zoom", overscrollBehavior: "contain" } : undefined}>
```

And on the header (line 137) and footer (line 240), add `style={{ touchAction: "manipulation" }}` on mobile to prevent them from being part of the zoom gesture.

### Files modified
- `src/components/playbook/PlaybookReader.tsx` — add touch-action styles to isolate pinch-zoom to PDF area only

