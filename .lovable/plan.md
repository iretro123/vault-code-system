

# Move Control Rail to Left + Premium Readability Upgrade

## What changes

**Current state:** The `OSControlRail` (workflow guide) sits on the right side of the Hero OS Card, hidden on mobile, with low-contrast grey text (`text-muted-foreground/30`, `/40`, `/50`) that's unreadable.

**New state:** Move it to a **dedicated left column** outside the Hero card, always visible on desktop. Upgrade all text to high-contrast, premium typography. No more grey-on-dark invisible text.

## Layout change

```text
BEFORE:
┌──────────────────────────────────────────┐
│ Hero OS Card                             │
│ ┌─────────────────────┬─────────────────┐│
│ │ Main content (3fr)  │ Rail (0.7fr)    ││
│ └─────────────────────┴─────────────────┘│
└──────────────────────────────────────────┘

AFTER:
┌──────────┬───────────────────────────────┐
│ Left     │ Hero OS Card                  │
│ Guide    │ (full width, no right rail)   │
│ Rail     │                               │
│ (sticky) │                               │
└──────────┴───────────────────────────────┘
```

## File: `src/pages/academy/AcademyTrade.tsx`

1. **Add left column wrapper** around the entire OS layout content area (line ~571). Desktop: `flex gap-4` with left rail `w-[220px] shrink-0` and main content `flex-1`. Mobile: rail hidden, main full width.
2. **Move `<OSControlRail>` from inside the Hero card** (lines 1182-1200) to the new left column, outside the card. Make it `sticky top-20`.
3. **Remove the right rail div** entirely from inside the Hero card's flex layout. The main content zone becomes full width (`flex-1` with no split).

## File: `src/components/trade-os/OSControlRail.tsx`

Full readability and premium upgrade:

1. **Kill all grey/invisible text.** Replace every instance of:
   - `text-muted-foreground/30` → `text-foreground/60`
   - `text-muted-foreground/40` → `text-foreground/60`
   - `text-muted-foreground/50` → `text-foreground/70`
   - `text-primary/70` → `text-primary`
   - `text-foreground/70` → `text-foreground/80`
   - `text-emerald-400/60` → `text-emerald-400`

2. **Upgrade section label** from `/40` to `/60` opacity, slightly larger text (`text-[10px]`).

3. **Upgrade active stage hero card:**
   - Stronger background: `bg-white/[0.06]` (was `0.04`)
   - Description text: `text-foreground/90` (was `/70`)
   - Hint text: `text-foreground/50` (was `text-muted-foreground/50`)
   - Stage number labels (1 of 4, 2 of 4 etc.) for newbie orientation

4. **Upgrade inactive stage rows:**
   - Label text: `text-foreground/70` for upcoming, `text-emerald-400` for completed
   - Description: `text-foreground/50` (was `/30`)
   - Chevron: `text-foreground/30` → `text-foreground/40`, hover `/60`
   - Add step numbers (1, 2, 3, 4) so newbies understand the order

5. **Vault status text:** `text-foreground/60` (was `/50`)

6. **Active plan summary:** Direction/contracts text `text-foreground/60` (was `/50`), price text same upgrade.

7. **Block reason:** `text-amber-400` full opacity (was `/70`).

8. **Add a "How This Works" intro line** at the top of the rail for first-time users: "Follow these 4 steps each trading day." — clean, one line, `text-foreground/60`.

## Files touched

| File | Change |
|------|--------|
| `src/pages/academy/AcademyTrade.tsx` | Move rail to left column, remove right rail from hero card |
| `src/components/trade-os/OSControlRail.tsx` | Premium readability upgrade, step numbers, intro line |

