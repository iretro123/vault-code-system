

## Plan: Remove Hand+Gift Image from Referral Modal Banner

### Change: `src/components/academy/ReferralModal.tsx`

In the `HeroBanner` component, remove the hand+gift illustration `<div>` and its `<img>` tag (the block referencing `handGiftImg`, lines ~37-44). Also remove the `handGiftImg` import at the top. The gradient background and Vault "V" watermark stay.

### Files
- `src/components/academy/ReferralModal.tsx` — remove hand-gift image element and its import

