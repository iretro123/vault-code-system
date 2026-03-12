

# Remove PlaybookCard from Dashboard

Simple removal — delete the `PlaybookCard` import and its JSX usage from `AcademyHome.tsx`. The layout grid and all other cards remain untouched.

### Changes in `src/pages/academy/AcademyHome.tsx`
1. Remove the `PlaybookCard` import (line 11)
2. Remove `<PlaybookCard />` from the JSX (line 131)

No other files affected. The `PlaybookCard` component file itself stays in the codebase (accessible from other routes like `/academy/playbook`).

