

## Fix Mobile White Screen Crashes

Based on the console logs and code review, there are multiple issues causing white screen crashes on mobile:

### Root Causes Found

1. **ParticleCanvas performance killer** — `HeroHeader` runs a continuous `requestAnimationFrame` loop with canvas drawing on every frame. On mobile devices (especially older iOS), this causes memory pressure and jank that leads to browser tab crashes when combined with other heavy operations.

2. **ClaimRoleModal ref crash** — Console shows: *"Function components cannot be given refs. Check the render method of ClaimRoleModal."* This warning can escalate to a crash on strict mobile browsers when the Dialog tries to pass a ref to a function component that doesn't accept it.

3. **Network failure cascade** — When `create-checkout` or `get_my_access_state` RPC fails on mobile (`TypeError: Load failed`), the status resolves to `"none"`, which triggers the `AccessBlockModal` to appear as a non-dismissible overlay. Clicking sidebar items while this modal is rendering causes a layout conflict and crash.

4. **GameplanCard ref warning** — Same ref issue as ClaimRoleModal, another potential crash source.

### Fixes

**File: `src/components/academy/dashboard/HeroHeader.tsx`**
- Disable ParticleCanvas on mobile devices entirely (check `window.innerWidth < 768` or use `useIsMobile`). Mobile Safari is especially fragile with continuous canvas animation + DOM interactions.

**File: `src/components/academy/ClaimRoleModal.tsx`**
- Wrap the inner component with `React.forwardRef` so the Dialog ref passes cleanly. This eliminates the crash-causing warning.

**File: `src/components/academy/dashboard/GameplanCard.tsx`**
- Same `forwardRef` fix for `TaskGroupSection` component.

**File: `src/hooks/useStudentAccess.ts`**
- On RPC error, preserve the cached state instead of leaving status as stale. This prevents the AccessBlockModal from appearing incorrectly when the network temporarily fails on mobile.

### Summary
- Kill canvas animation on mobile (biggest crash source)
- Fix 2 ref forwarding issues (ClaimRoleModal, GameplanCard)
- Make access hook resilient to network failures so the block modal doesn't flash incorrectly

