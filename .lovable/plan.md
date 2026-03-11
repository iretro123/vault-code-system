

# Mobile UI Fix — All Devices (Not Just iPhone 11)

The issues you experienced affect **all mobile devices**, not just iPhone 11. The root causes are universal mobile browser behaviors:

1. **`h-screen` = `100vh`** — On every mobile browser (Safari, Chrome, Samsung Internet), `100vh` includes the browser toolbar area, pushing content below the visible viewport. This is why you had to scroll up and down. Affects all iPhones, all Android phones.

2. **No `overscroll-behavior`** — iOS Safari and many Android browsers rubber-band the entire page when you scroll past edges. Not device-specific.

3. **Sidebar not closing on tap** — The coach button uses `toggleSidebar()` instead of `setOpenMobile(false)`, and the profile/settings buttons in the sidebar footer don't close the sidebar at all on mobile. This is the "sidebar stays open after tapping a tab" bug. Affects every mobile user.

## Changes

### 1. Fix viewport height — all mobile browsers
**File: `src/components/layout/AcademyLayout.tsx`**
- Line 109: Change `h-screen` → `h-[100dvh]` (dynamic viewport height, supported by all modern mobile browsers)

### 2. Lock body scrolling & prevent rubber-banding
**File: `src/index.css`**
- Add to `html, body, #root`: `overflow: hidden; overscroll-behavior: none; height: 100dvh;`

### 3. Fix sidebar not closing on mobile tap
**File: `src/components/layout/AcademySidebar.tsx`**
- Coach button (line 180-183): Replace `toggleSidebar()` with `setOpenMobile(false)` for immediate close
- Profile button (line 284): Add `if (isMobile) setOpenMobile(false)` before navigating
- Referral button (line 262): Add `if (isMobile) setOpenMobile(false)`

### 4. Fix MobileNav menu button
**File: `src/components/layout/MobileNav.tsx`**
- Change `toggleSidebar()` to explicit `setOpenMobile(true)` so it always opens (never accidentally closes)

### 5. Clean up dead CSS
**File: `src/App.css`**
- Remove the Vite boilerplate (`#root { max-width: 1280px; padding: 2rem; }`) — this could interfere if ever imported

### Files Changed
- `src/components/layout/AcademyLayout.tsx`
- `src/index.css`
- `src/components/layout/AcademySidebar.tsx`
- `src/components/layout/MobileNav.tsx`
- `src/App.css`

