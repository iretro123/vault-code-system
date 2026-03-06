

## Add Mobile Back Arrow in Community Header

### Problem
On mobile, when viewing `/academy/community`, the bottom `MobileNav` is hidden and there's no way to navigate back. A back arrow used to exist next to the logo in the top header bar.

### Change — 1 file

**`src/components/layout/AcademyLayout.tsx`**

Add a back arrow button in the header, visible only on mobile when on the community page. It will appear to the left of the "VaultAcademy" logo and navigate back to `/academy/home`.

- Import `useIsMobile` hook
- Add an `ArrowLeft` button (already imported) before the logo link, conditionally rendered when `isMobile && isCommunity`
- Styled as a subtle ghost button matching the header aesthetic

