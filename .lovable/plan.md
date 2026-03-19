

## Fix: Image Lightbox Blocked by Sidebar

**Problem**: The `ImageLightbox` component renders inside the main content area, which has `z-[1]` stacking context (`AcademyLayout.tsx` line 125). The sidebar sits at `z-10` in a sibling stacking context, so it renders on top of the lightbox despite the lightbox having `z-[9999]`.

**Fix**: Use a React portal in `ImageLightbox` to render directly into `document.body`, escaping the stacking context entirely.

### Changes

**File: `src/components/academy/community/ImageLightbox.tsx`**
- Import `createPortal` from `react-dom`
- Wrap the entire lightbox `<div>` in `createPortal(..., document.body)`
- No other files need changes — all consumers (`RoomChat`, `DmAttachmentRenderer`, `CoachDrawer`) will automatically benefit

