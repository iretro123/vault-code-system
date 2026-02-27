

## Stability Audit — Prevent Future Hook Bugs + Fix Remaining Warning

The React error #310 is now fixed. The app is running. There's one remaining console warning about `ExperienceBadge` not supporting `forwardRef`, which comes from it being used inside a Radix `ContextMenuTrigger` that tries to pass a ref to it.

### What went wrong and how to prevent it

**Root cause recap:** A `useMemo` was placed inline in JSX (only reached when `loading === false`), so during loading renders React saw fewer hooks — violating Rules of Hooks.

### Plan

**1. Fix the `forwardRef` console warning (single file change)**

In `src/components/academy/RoomChat.tsx`, convert `ExperienceBadge` from a plain function component to use `React.forwardRef` so Radix's `ContextMenuTrigger` can attach its ref without warning. This is a ~5 line change at lines 66-74.

**2. Audit: Confirm no other hooks below early returns**

I've verified the file — the `filteredMessages` useMemo is now correctly placed at line 546, above the `if (loading)` early return at line 555. All other hooks (`useState`, `useRef`, `useEffect`, `useCallback`, `useMemo`) are declared at the top of the component before any conditional returns. No further hook ordering issues exist.

### Prevention rules going forward

These are patterns to follow in this codebase (no code changes needed — just awareness):

- **Never place hooks inside JSX or after early returns** — all `useState`, `useMemo`, `useCallback`, `useEffect` must be at the top of the component body
- **Never conditionally call hooks** — no hooks inside `if` blocks
- **Early returns must come after all hook declarations**

This is a minimal 1-file fix (forwardRef on ExperienceBadge) plus confirmation that the codebase is clean.

