

## Remove duplicate "Start" feel from Playbook strip

The "Start Here" badge + "Start" button on the same row is redundant. 

### Change

**`src/pages/academy/AcademyLearn.tsx`** — Change the button text from "Start" to "Open" (when not started) so it doesn't echo the badge. "Continue" stays as-is when already in progress.

```
Before:  [START HERE] Vault Playbook ............ [Start →]
After:   [START HERE] Vault Playbook ............ [Open →]
```

Single line change at ~line 155.

