

## Hide & Disable "Vault OS" (keep Trade OS untouched)

**Goal**: Remove all user-facing references to the "Vault OS" sidebar item and route, while leaving "Trade OS" (`/academy/trade`) completely untouched.

### Changes

**1. Remove "Vault OS" from sidebar navigation**
- File: `src/components/layout/AcademySidebar.tsx`
- Remove the nav entry `{ icon: LayoutGrid, label: "Vault OS", path: "/academy/vault-os", pageKey: "vault-os" }` from the `coreNav` array (line 54).
- Clean up the `LayoutGrid` import if no longer used.

**2. Remove or redirect the route**
- File: `src/App.tsx`
- Either remove the `<Route path="vault-os" element={<AcademyVaultOS />} />` line (line 115), or change it to redirect to `/academy/home` so any bookmarked URLs don't 404:
  ```tsx
  <Route path="vault-os" element={<Navigate to="/academy/home" replace />} />
  ```
- Remove the `AcademyVaultOS` import if the component is no longer routed.

**3. No other files affected**
- `MobileNav.tsx` — does not reference Vault OS, no change needed.
- `AcademyTrade.tsx` (Trade OS) — untouched.
- `FeatureFlagGate.tsx`, `VaultOSGate.tsx`, `Hub.tsx` — can remain as-is (dead code, harmless).

