

## Fix: Signal/Watchlist Form Losing Data + Make Posting Easier

### Problem 1: Form resets when switching tabs or navigating away
The `SignalPostForm` stores all field values in local `useState`. While the community sub-tabs use CSS `hidden/block` (keeping components mounted), if you navigate away from the Community page entirely (e.g. click Dashboard, then come back), the whole component tree unmounts and all form state is lost. The user has to retype everything.

### Problem 2: Posting a watchlist has too much friction
You have to click "Post Signal" to expand the form, then fill in fields. For daily watchlist posts that happen every morning, this should be faster.

### Fix

**File: `src/components/academy/chat/SignalPostForm.tsx`**

1. **Persist draft to sessionStorage** — Save all form field values (ticker, bias, levels, notes, tvLink, mode, direction, strike, exp, fill, open state) to `sessionStorage` on every change. Restore on mount. Clear on successful submit. This means switching tabs, navigating away, or even refreshing won't lose your draft.

2. **Auto-expand when draft exists** — If there's a saved draft with data, automatically open the form instead of showing the collapsed "Post Signal" button.

3. **Streamline watchlist mode** — Add a "Quick Watchlist" shortcut: a single row with ticker input + bias toggle + post button for rapid watchlist entries. The full expanded form is still available for adding levels, notes, charts, etc. This lets you fire off a watchlist item in seconds.

4. **Visual "unsaved draft" indicator** — Show a small dot on the collapsed "Post Signal" button when a draft exists, so you know there's unfinished work.

### Technical Detail

```ts
const DRAFT_KEY = `vault_signal_draft_${roomSlug}`;

// Save draft on every field change
useEffect(() => {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
    open, mode, ticker, bias, levels, notes, tvLink,
    direction, strike, exp, fill,
  }));
}, [open, mode, ticker, bias, levels, notes, tvLink, direction, strike, exp, fill]);

// Restore on mount
const [ticker, setTicker] = useState(() => {
  const saved = sessionStorage.getItem(DRAFT_KEY);
  return saved ? JSON.parse(saved).ticker || "" : "";
});
```

### Changes

| File | Change |
|------|--------|
| `src/components/academy/chat/SignalPostForm.tsx` | Add sessionStorage draft persistence, auto-expand on draft, quick watchlist mode, draft indicator |

