

## Change Reset All Button to Blue Style

**Current**: The "Reset All" button uses a ghost/outlined style with red-tinted hover (`hover:text-destructive`).

**Change**: Switch to a blue-tinted style matching the primary accent color, keeping the same layout and icon.

### File: `src/components/vault-planner/VaultTradePlanner.tsx`

Update the Reset All button classes:
- Border: `border-primary/30` 
- Text: `text-primary`
- Hover: `hover:bg-primary/10 hover:border-primary/50`
- Remove the red destructive hover color

One line change in the button's className.

