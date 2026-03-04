

## Add Next Step Strip to GameplanCard

**Scope:** Insert a single highlighted row between the header and progress bar showing the highest-priority incomplete task with a "Complete" button. No redesign.

### File: `src/components/academy/dashboard/GameplanCard.tsx`

**1. Derive next step from existing `groups` state**

Add a `useMemo` that iterates through all groups in priority order (Foundation → This Week → Consistency) and returns the first task where `done === false`. If all done, returns `null`.

**2. Insert Next Step strip (between header and progress bar, ~line 170)**

```tsx
{nextTask ? (
  <div className="flex items-center gap-3 rounded-xl px-4 py-3"
    style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
    <span className="text-[10px] uppercase tracking-widest font-semibold text-blue-400/70">Next Step</span>
    <span className="flex-1 text-sm font-medium text-foreground/90 truncate">{nextTask.title}</span>
    <button onClick={() => handleToggle(nextTask.id)}
      className="text-xs font-semibold text-blue-400 hover:text-blue-300 shrink-0">
      Complete
    </button>
  </div>
) : (
  <div className="flex items-center gap-2 rounded-xl px-4 py-3"
    style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.1)" }}>
    <Check className="h-4 w-4 text-emerald-400" />
    <span className="text-sm font-medium text-emerald-400/90">You're on track</span>
  </div>
)}
```

Uses existing dark premium style with a subtle blue tint for the active state, emerald for all-done. No new components or imports needed (just reuses `Check` icon already imported).

**3. No other changes**

Same card shell, sections, toggle logic, progress bar, recently completed, mobile expand. The strip simply reads from existing `groups` state.

