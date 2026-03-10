

## Add iOS-Style Blue Indicator Stripe Below Community Tabs

Replace the current pill/rounded-full tab style with an iOS segmented-control look: flat tabs with a sliding blue underline indicator.

### Changes — `src/pages/academy/AcademyCommunity.tsx` (lines 61-86)

**Remove**: The rounded-full container with `bg-white/[0.04]` pill styling and per-tab `rounded-full` + border classes.

**Replace with**: A clean tab bar with:
- Flat container with a subtle bottom border (`border-b border-white/[0.06]`)
- Each tab button: no rounded-full, no background — just text with `pb-2` padding
- Active tab: `text-foreground` with a `relative` positioned blue underline (`after:` pseudo-element — 2px tall, `bg-primary`, rounded-full, animated width via `transition-all`)
- Inactive tab: `text-muted-foreground` with hover state
- The blue stripe uses a CSS `after:` pseudo-element: `after:absolute after:bottom-0 after:left-1/4 after:right-1/4 after:h-[2px] after:bg-primary after:rounded-full`

```tsx
<div className="shrink-0 px-4 pt-1">
  <div className="flex w-full items-center justify-center gap-1 border-b border-white/[0.06]">
    {TABS.map((tab) => (
      <button
        key={tab.key}
        onClick={() => handleTabChange(tab.key)}
        className={cn(
          "relative flex-1 md:flex-none px-4 md:px-6 pb-2.5 pt-1.5 text-[12px] font-semibold tracking-wide transition-colors duration-150",
          activeTab === tab.key
            ? "text-foreground after:absolute after:bottom-0 after:inset-x-3 after:h-[2px] after:rounded-full after:bg-primary after:shadow-[0_0_8px_rgba(59,130,246,0.5)]"
            : "text-muted-foreground hover:text-foreground/80"
        )}
      >
        {tab.label}
        {/* badge stays the same */}
      </button>
    ))}
  </div>
</div>
```

The `after:shadow-[0_0_8px_...]` adds a subtle blue glow beneath the stripe for the luxury/cinematic feel. One file, ~20 lines changed.

