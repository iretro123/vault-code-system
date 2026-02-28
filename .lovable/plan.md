

## Fix Inbox Card Overflow — Cards Must Fit Inside Panel

### Problem
The notification cards' text content overflows past the panel's right border. The flex layout chain isn't constraining width properly — `min-w-0` needs to be on every flex child in the chain, and `overflow-hidden` must be on the card container itself.

### Changes — `src/components/academy/InboxDrawer.tsx`

1. **Card container**: Add `overflow-hidden` to each item row div so content cannot bleed past the rounded border.

2. **Inner button**: Add `overflow-hidden` to the clickable button area alongside `min-w-0`.

3. **Text container div**: Add `overflow-hidden` to the text wrapper div so `truncate` and `line-clamp` actually work.

4. **Body text**: Change from `line-clamp-2` to `line-clamp-1` to keep cards compact like the Lovable reference.

5. **Dismiss X button**: Keep it exactly as-is — always visible, inline, iOS circular style. No changes needed there.

All changes are in one file, ~5 lines modified. No new dependencies.

