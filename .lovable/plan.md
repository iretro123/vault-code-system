

## Unlock Vault OS for Admin/CEO Users

### Changes

**1. Update `VaultOSGate.tsx`**
- Import `useAcademyPermissions` hook
- Check if user is CEO or operator — if so, render `children` (bypass the gate)
- Non-admin users still see the "Coming Soon" block screen

**2. Update Hub page (`Hub.tsx`)**
- For CEO/operator users, make the Vault OS card clickable (navigates to `/cockpit`) instead of disabled
- Change badge from "Coming Soon" to "Admin Preview" for those users

### Files
- **Edit** `src/components/VaultOSGate.tsx`
- **Edit** `src/pages/Hub.tsx`

