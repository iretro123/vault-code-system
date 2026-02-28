

## Phase 3 Tweaks — Activity Logging Correctness

### Findings

1. **AcademyHome.tsx line 33**: Currently logs `"login"` on mount — this fires on every navigation to home, not just login. Needs to be `"academy_home_view"`.
2. **AcademyLayout.tsx lines 28-35**: Already has `lastPageRef` dedupe that prevents duplicate `page_view` logs on re-renders. Only fires when `location.pathname` actually changes. No fix needed.

### Changes

#### File: `src/pages/academy/AcademyHome.tsx`

**Line 31-34** — Change event name from `"login"` to `"academy_home_view"`:

```typescript
// Before:
// Log login on mount
useEffect(() => {
  logActivity("login", "dashboard");
}, []);

// After:
// Log dashboard view on mount
useEffect(() => {
  logActivity("academy_home_view", "dashboard");
}, []);
```

#### No other files need changes

- `AcademyLayout.tsx` page_view dedupe is already correct via `lastPageRef`
- `SettingsBilling.tsx` billing events are correct
- `AcademyHome.tsx` checkout return events (`checkout_return_success`, `checkout_return_canceled`) are correct
- Admin components (timeline, health, QA) are already complete

