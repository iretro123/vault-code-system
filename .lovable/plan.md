It should be simple. The current issue is that `basic_tier` was added today as a new role, then layered into multiple existing guards at once. Right now the Academy parent route, the Academy layout guard, loading/hydration gates, and full Academy data provider can all run before the final Learn route settles, so the screen can bounce or go blank.

Plan:

1. Make `/academy/learn` the only allowed Academy route for `basic_tier`
   - Update `BasicTierRedirect` in `src/App.tsx` to check the current pathname.
   - If the user is `basic_tier` and already on `/academy/learn` or `/academy/learn/:moduleSlug`, render normally.
   - If the user is `basic_tier` anywhere else, redirect once to `/academy/learn`.
   - While auth is still loading, do not redirect.

2. Stop the parent `/academy` route from fighting the child Learn route
   - Change the `/academy` index redirect so `basic_tier` users land on `learn`, not `home`.
   - Keep full members going to the normal Academy dashboard.

3. Keep the app review account visually Learn-only
   - Sidebar: only show Learn.
   - Mobile nav: only show Learn.
   - Hide search, inbox, share/referral, Ask Coach, profile/settings shortcuts, Dashboard, Trade OS, Community, Live, Schedule, and Vault OS links for `basic_tier`.

4. Make the loading state stable
   - For `basic_tier`, avoid blocking the Learn page behind full Academy hydration/onboarding/referral/inbox loading.
   - Let the Learn page render once auth/profile/role are known instead of waiting on unrelated Academy data.

5. Verify directly
   - Confirm in the database that `appreview+1778972025@vault.dev` has exactly the `basic_tier` role.
   - Open `/academy/learn` and take a screenshot showing Learn renders.
   - Open `/academy/home`, `/academy/community`, `/academy/trade`, `/cockpit`, and `/settings`; confirm they redirect back to `/academy/learn` without flicker or blank screen.

Technical details:

```text
basic_tier route behavior:

/academy/learn              -> allowed
/academy/learn/:moduleSlug  -> allowed
/academy/*                  -> /academy/learn
/cockpit, /log, /reports... -> /academy/learn

No full Academy shell redirects should fire while already on /academy/learn.
```