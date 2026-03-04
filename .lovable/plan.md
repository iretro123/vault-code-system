

## Add Vault OS as Sidebar Nav Item + Feature Flag

### Changes

**1. Add "Vault OS" to sidebar nav (`AcademySidebar.tsx`)**
- Add a new entry to `coreNav` array: `{ icon: LayoutGrid, label: "Vault OS", path: "/academy/vault-os", pageKey: "vault-os" }`
- Place it after Trading Toolkit, before Settings
- The existing `isPageEnabled` + `isAdmin` filtering already handles visibility

**2. Create an Academy-wrapped Vault OS page (`src/pages/academy/AcademyVaultOS.tsx`)**
- Wraps existing `TraderCockpit` inside `AcademyLayout` + `FeatureFlagGate pageKey="vault-os"`
- This replaces the need to navigate to `/cockpit` separately

**3. Add route in `App.tsx`**
- Add `/academy/vault-os` route pointing to the new `AcademyVaultOS` page

**4. Add "vault-os" feature flag to database**
- Insert a new row: `page_key: "vault-os"`, `label: "Vault OS"`, `enabled: false` (off by default)

### Files
- **Edit** `src/components/layout/AcademySidebar.tsx` — add nav item
- **Create** `src/pages/academy/AcademyVaultOS.tsx` — wrapped page
- **Edit** `src/App.tsx` — add route
- **Migration** — insert `vault-os` feature flag row

