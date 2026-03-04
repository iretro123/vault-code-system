

## Replace "Mode" with Sidebar Trigger in Mobile Bottom Nav

**Problem:** The "Mode" button in the bottom-left of the mobile nav takes up space for a rarely-used action. The sidebar (with full navigation, search, coach, inbox, referrals) is currently inaccessible on mobile.

### Plan

**`src/components/layout/MobileNav.tsx`**
- Replace the "Mode" nav item (`LayoutGrid` icon, links to `/hub`) with a "Menu" button (`Menu` icon from lucide)
- Instead of navigating, this button calls `toggleSidebar()` from the Shadcn `useSidebar()` hook to open the sidebar as an overlay drawer
- Keep Dashboard and Settings as the other two bottom nav items

**`src/components/layout/AcademyLayout.tsx`**
- Remove the `hidden md:block` wrapper from `<AcademySidebar />` so it renders on all screen sizes
- The Shadcn Sidebar automatically uses offcanvas/overlay mode on mobile — no extra work needed

**Result on mobile:**
- Bottom nav: **Menu** | **Dashboard** | **Settings**
- Tapping Menu opens the full sidebar as a slide-in drawer (search, all nav links, coach, inbox, referrals, profile)
- Tapping outside or selecting a link closes it

