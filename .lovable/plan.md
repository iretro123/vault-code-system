

## Luxury "This Week" Session Cards on the Live Page

### Problem
The "This Week" session cards in the right sidebar are plain `live-glass-card` containers — nearly invisible against the dark background. They blend in and don't communicate "upcoming events you should attend." They need to pop with a premium e-learning feel.

### Design Direction
Transform the "This Week" section into a standout, luxury card group with a violet/purple gradient treatment — giving it an e-learning "scheduled events" energy that draws the eye without being garish.

**Visual treatment:**
- Wrap the entire "This Week" block in a single card container with a subtle purple-to-indigo radial gradient background and a violet border glow
- Each session row inside gets a frosted inner card with a left accent bar (violet) and slightly brighter text
- The "THIS WEEK" label gets a small calendar icon and a purple tint
- Add a subtle shimmer/glow on the top edge of the wrapper card (matching the vault-luxury-card shimmer pattern but in purple)

### Changes

**File: `src/pages/academy/AcademyLive.tsx`** — Right sidebar "This Week" section (lines 546-557)

Replace the plain `div` + `live-glass-card` items with a premium wrapper card:

```tsx
<div className="rounded-2xl p-[1px] overflow-hidden"
  style={{
    background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.12), rgba(139,92,246,0.08))",
  }}>
  <div className="rounded-2xl p-5 relative overflow-hidden"
    style={{
      background: "linear-gradient(160deg, rgba(139,92,246,0.08) 0%, rgba(15,15,30,0.95) 50%, rgba(99,102,241,0.04) 100%)",
    }}>
    {/* Top shimmer line */}
    <div className="absolute top-0 left-4 right-4 h-[1px]"
      style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)" }} />
    
    <div className="flex items-center gap-2 mb-4">
      <CalendarDays className="h-3.5 w-3.5 text-violet-400/70" />
      <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-300/60">This Week</p>
    </div>
    
    <div className="space-y-2">
      {weekList.map((s) => (
        <div key={s.id} className="rounded-xl px-4 py-3 border border-violet-500/10 hover:border-violet-500/20 transition-colors"
          style={{ background: "rgba(139,92,246,0.04)" }}>
          {/* session content with boosted text opacity */}
        </div>
      ))}
    </div>
  </div>
</div>
```

**Also update the main-content "This Week" section** (lines 577-594) — the full-width schedule list below the hero — with the same purple accent treatment on the wrapper card so both areas match.

### What this achieves
- The "This Week" block immediately draws the eye with a soft violet glow
- Each session card has enough contrast to read comfortably
- The purple palette signals "scheduled learning events" — distinct from the blue primary action color
- Matches the vault-luxury-card shimmer language but in a unique purple tone
- No layout changes — same content, same structure, just elevated visuals

### Files changed
| File | Change |
|------|--------|
| `src/pages/academy/AcademyLive.tsx` | Restyle both "This Week" sections with purple luxury card treatment |

