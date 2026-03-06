

## Remove header elements from Trade Floor

**File:** `src/components/academy/community/TradeFloorHero.tsx`

Remove lines 13-45 (the header bar containing "VAULT Community", "Guidelines" button, and "12 Active" chip). Keep the hot tickers row and the outer container. Remove unused imports (`Users`, `BookOpen`, `useState`) and the `guidelinesOpen` state + `GuidelinesModal`.

The component will only render the hot tickers strip when tickers exist, and nothing when there are none.

