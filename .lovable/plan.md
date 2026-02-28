

## Add "Start Here" badge to Vault Playbook hero strip

### Change

**`src/pages/academy/AcademyLearn.tsx`** (lines 142-146) — Add a small "START HERE" pill badge next to the "Vault Playbook" title text. It will be an inline `<span>` styled as a compact rounded pill with a blue background and white text, sitting right after the title on the same line.

```text
Before:  Vault Playbook
After:   Vault Playbook  [START HERE]
```

The badge will use:
- `text-[10px] font-bold uppercase tracking-wide`
- `bg-primary/20 text-primary px-2 py-0.5 rounded-full`
- Placed inline next to the h3 title so it reads naturally

This keeps the serious, structured tone — no emojis, no hype — while clearly signaling this is the first thing to complete.

