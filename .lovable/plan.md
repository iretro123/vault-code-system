

## Backdrop Polish — Share Vault Referral Modal

### Approach
Override the overlay styling at the usage site (not the shared UI primitives) to add darker backdrop + blur + stronger modal shadow. This keeps all other dialogs/drawers untouched.

### Changes

#### 1. `src/components/academy/ReferralModal.tsx`

**Desktop Dialog (line 207-210):** Import `DialogOverlay` and render a custom overlay with darker opacity + backdrop blur before `DialogContent`. Add a stronger shadow/glow to the modal card.

```tsx
// Line 207-210 becomes:
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogPortal>
    <DialogOverlay className="bg-black/60 backdrop-blur-[12px] backdrop-saturate-[0.7]" />
    <DialogContent className="w-[600px] max-w-[92vw] max-h-[700px] p-0 bg-[hsl(220,18%,8%)] border border-white/[0.08] rounded-[22px] overflow-hidden [&>button:last-child]:hidden shadow-[0_8px_60px_-12px_rgba(59,130,246,0.18),0_0_0_1px_rgba(255,255,255,0.04)]">
      <ReferralBody onClose={() => onOpenChange(false)} />
    </DialogContent>
  </DialogPortal>
</Dialog>
```

But since `DialogContent` already renders its own portal+overlay internally, we need a different approach: pass custom overlay className through the `DialogContent` wrapper, or override via CSS.

**Simpler approach:** Add a custom overlay `className` prop pattern. Since `DialogContent` renders `DialogOverlay` internally, we'll override it with a CSS selector on the parent.

**Simplest safe approach:** Add an inline style/class override on `DialogContent` that targets the sibling overlay via CSS, OR wrap the dialog usage to customize the overlay.

**Actually the cleanest:** Just modify the `DialogContent` in `ReferralModal.tsx` to manually render `DialogPortal` + custom `DialogOverlay` + the content primitive directly, bypassing the shared `DialogContent` wrapper for this one modal.

Let me reconsider — the simplest and safest path:

### File: `src/components/academy/ReferralModal.tsx`

**Desktop (lines 206-211):** Replace `DialogContent` usage with manual portal+overlay+content to customize the overlay without touching shared components.

Add imports: `DialogPortal, DialogOverlay` from `@/components/ui/dialog` and `DialogPrimitive` from `@radix-ui/react-dialog`.

Actually even simpler — just use a CSS class on the `Dialog` root and target the overlay via CSS.

### Final approach (minimal, safe):

**File: `src/index.css`** — Add a scoped class for the referral modal backdrop:

```css
.referral-modal-backdrop [data-radix-dialog-overlay],
.referral-modal-backdrop [data-vaul-overlay] {
  background: rgba(0, 0, 0, 0.62) !important;
  backdrop-filter: blur(12px) saturate(0.7) !important;
  -webkit-backdrop-filter: blur(12px) saturate(0.7) !important;
}
```

**File: `src/components/academy/ReferralModal.tsx`:**

1. Wrap `<Dialog>` with a div `className="referral-modal-backdrop"` (desktop)
2. Wrap `<Drawer>` with a div `className="referral-modal-backdrop"` (mobile)  
3. Add stronger shadow to `DialogContent`: `shadow-[0_8px_60px_-12px_rgba(59,130,246,0.18),0_0_0_1px_rgba(255,255,255,0.04)]`
4. Add same shadow to `DrawerContent`

### Files
- `src/index.css` — add ~6 lines for `.referral-modal-backdrop` overlay override
- `src/components/academy/ReferralModal.tsx` — wrap Dialog/Drawer in backdrop div, add shadow class to modal cards

