

## Update Whop Checkout URL

### Change
Update the checkout redirect URL in the referral system from the old plan to the new one.

### File: `src/pages/ReferralRedirect.tsx`

**Line 5** — Change:
```typescript
const WHOP_CHECKOUT = "https://whop.com/checkout/plan_2rZoF4rd1mLMc";
```
To:
```typescript
const WHOP_CHECKOUT = "https://whop.com/checkout/plan_C385Mm2Dtaquc";
```

### What stays the same
- Unique referral links (`/ref/:userId`) — unchanged
- `captureReferral()` tracking — unchanged  
- LocalStorage persistence — unchanged
- Database click logging — unchanged
- Attribution flow — unchanged

One line change. Referral tracking remains fully intact.

