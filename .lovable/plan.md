

# Hide "Vault OS" from All Users (Including Admins/Coaches)

## Change

**`src/components/layout/AcademySidebar.tsx` (line 172)**

Currently, disabled pages are only hidden from non-admin users, while admins see them with a "hidden" indicator. For the `vault-os` page specifically, we'll hide it from everyone regardless of role.

Change the filter logic from:
```ts
if (pageKey && !isPageEnabled(pageKey) && !isAdmin) return null;
```
to:
```ts
if (pageKey && !isPageEnabled(pageKey) && (!isAdmin || pageKey === "vault-os")) return null;
```

This keeps the existing behavior for all other feature-flagged pages (admins still see them with the "hidden" badge) but makes Vault OS fully invisible to everyone when disabled.

**Single line change, no other files affected.**

