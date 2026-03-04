

## Collapsible Gameplan Card on Mobile

Make the Gameplan card collapse by default on mobile to reduce scroll fatigue, while staying expanded on desktop.

### Changes to `src/components/academy/dashboard/GameplanCard.tsx`

- Import `useIsMobile` from `@/hooks/use-mobile`
- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`
- Add state: `const [open, setOpen] = useState(!isMobile)` — collapsed by default on mobile, expanded on desktop
- Wrap the task groups + recently completed sections inside `CollapsibleContent`
- Keep the header + progress bar always visible (acts as the summary when collapsed)
- Add a chevron icon to the header that rotates based on open/closed state
- The entire header row becomes the `CollapsibleTrigger` on mobile
- On desktop, card stays fully expanded (no collapse behavior)

**Result:** Mobile users see "Your Gameplan — 33% complete" with a compact progress bar. One tap expands the full task list. Desktop is unchanged.

**Files:** 1 edit (`GameplanCard.tsx`)

