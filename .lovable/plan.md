

## Add Mobile-Only Back Arrow to Header

**File**: `src/components/layout/AcademyLayout.tsx`, lines 112-118

Add a back arrow (ChevronLeft or ArrowLeft) to the left of the "VaultAcademy" logo text, visible only on mobile (`md:hidden`). Tapping it navigates to `/hub`.

### Changes

1. Import `ArrowLeft` from lucide-react and `useNavigate` from react-router-dom
2. In the header's left section (line 112-118), add a mobile-only back button before the logo link:

```tsx
<div className="flex items-center gap-2">
  <button
    onClick={() => navigate("/hub")}
    className="md:hidden p-1.5 -ml-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
    aria-label="Back to Hub"
  >
    <ArrowLeft className="h-5 w-5" />
  </button>
  <Link to="/academy/home" ...>
    <span>Vault<span className="text-primary">Academy</span></span>
  </Link>
</div>
```

Single file, minimal change. Arrow hidden on desktop via `md:hidden`.

