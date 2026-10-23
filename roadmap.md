# Mobile density and readability

## Live Stripe access restoration

- [x] Verify Meghan Germino's live Stripe trial and restored access on the published Learn screen
- [x] Restore canonical trial eligibility live without falsifying Stripe status; confirm payment lock is off
- [x] Verify active/trial rules, 27 regression assertions, and live scheduled sync/sweep runs
- [ ] Verify/repair 22 older active records outside the canonical Stripe branch — missing valid subscription/customer/product evidence; no blanket access grant

- [x] Audit Home, Learn, curriculum/player, Live, Community/DM, Settings, Support/Coach
- [x] Apply focused mobile-only spacing, typography, wrapping, and touch-target fixes
  - [x] Reduce measured Home feature/welcome/setup heights at 320px and 375px
  - [x] Bring Live join action into the first 667px viewport where content permits
- [x] Add regression checks for mobile density, 200% text, keyboard, and bottom navigation
- [x] Verify automated tests and preview compilation; platform commit pending turn completion

# Online member profile dismissal

- [x] Anchor the selected member profile in a collision-aware overlay
- [x] Add accessible close controls to loaded, loading, and error states
- [x] Verify Close, Escape, outside press, member switching, route changes, focus return, and viewport bounds
- [x] Run focused tests, preview compilation, and desktop/mobile visual checks without publishing

# Stripe purchase disclosures and GHL readiness

- [ ] Correct current-payment statements in Privacy and Terms; inspect Billing without changing behavior
- [ ] Audit both native GHL offers and run focused fulfillment regression tests
- [ ] Check sanitized deployed-function and retry/outbox evidence without dispatching jobs
- [ ] Report actual alert services, deployment limitations, revision IDs, and remaining blockers
