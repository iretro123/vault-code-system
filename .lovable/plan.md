## Plan

Fix the `basic_tier` experience so this review account cannot see the full Academy sidebar, tabs, or other screens.

### What I’ll change

1. **Stop sending basic users to `/basic`**
   - Update the role redirect so `basic_tier` users land on `/academy/learn`, not the separate `/basic` page.
   - Keep `/basic` available only if still needed, but it will no longer be the primary destination for this account.

2. **Hide all non-Learn navigation for `basic_tier`**
   - Update the Academy sidebar/mobile nav logic so basic users only see Learn-related navigation.
   - Remove Dashboard, Trade, Community, Live, Settings, admin links, Coach access, and other tabs from the visible UI for this role.

3. **Hard-block direct URLs**
   - Add a route guard around Academy child routes so if a `basic_tier` user manually visits `/academy/home`, `/academy/community`, `/academy/trade`, `/academy/live`, `/academy/settings`, admin pages, etc., they are immediately redirected back to `/academy/learn`.
   - Allow only:
     - `/academy/learn`
     - `/academy/learn/:moduleSlug`

4. **Prevent Academy layout from flashing restricted areas**
   - Ensure the layout waits until auth/role is known before rendering navigation.
   - This should remove the visible flash/glitch where all screens/tabs appear before the redirect.

### Files to inspect/edit in build mode

- `src/App.tsx`
- `src/components/layout/AcademyLayout.tsx`
- `src/components/layout/AcademySidebar.tsx`
- `src/components/layout/MobileNav.tsx`
- Any shared nav config used by sidebar/mobile navigation

### Expected result

When signing in as `appreview+1778972025@vault.dev`, the browser and app should show only the Learn experience. No full Academy tabs, no Trade/Community/Live/Dashboard/Settings access, and direct restricted URLs should bounce back to `/academy/learn`.