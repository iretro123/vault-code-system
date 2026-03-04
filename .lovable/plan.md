

## Feature Flags: Hide Pages Under Development

### Approach
Create a `feature_flags` database table that stores page visibility toggles. Add a new "Feature Flags" tab to the Admin Panel where you can toggle pages on/off. The sidebar and routing will check these flags and hide disabled pages from members (admins always see everything).

### Database
- New `feature_flags` table: `id`, `page_key` (unique, e.g. `"live"`, `"trade"`, `"community"`), `label`, `enabled` (boolean, default true), `updated_at`
- Seed rows for each toggleable page: Dashboard, Learn, Trade, Community, Live, Trading Toolkit
- RLS: anyone authenticated can SELECT; only CEO/operator can UPDATE

### New Admin Tab
- Add "Feature Flags" tab to `AdminPanel.tsx` (icon: `ToggleLeft`)
- Create `AdminFeatureFlagsTab.tsx`: a simple list of pages with toggle switches
- Each toggle calls `supabase.from("feature_flags").update({ enabled }).eq("page_key", key)`
- Disabled pages show a muted label + "Under Development" badge

### Sidebar + Routing Gating
- Create a `useFeatureFlags()` hook that fetches all flags once and caches them
- In `AcademySidebar.tsx`: filter `coreNav` items — hide disabled pages for non-admin users (admins see them with a subtle "hidden" indicator)
- In each gated page component (or a wrapper): if the flag is disabled and user is not admin, redirect to `/academy/home` with a toast "This page is under development"

### Files
- **Migration**: Create `feature_flags` table + seed data + RLS policies
- **Create** `src/hooks/useFeatureFlags.ts` — fetch + cache flags
- **Create** `src/components/admin/AdminFeatureFlagsTab.tsx` — toggle UI
- **Edit** `src/pages/academy/AdminPanel.tsx` — add the new tab
- **Edit** `src/components/layout/AcademySidebar.tsx` — filter nav items by flags
- **Create** `src/components/FeatureFlagGate.tsx` — wrapper component for page-level gating

