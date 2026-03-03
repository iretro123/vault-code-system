

## Add Whop as an Alternative Membership Source

### What Changes

**1. Store the Whop API key as a secret**
Save `apik_KB6IibUvC0w5o_C15681_hLmG00EdcE-GAtKj24BhlMe0bFtxmoId2x0UcSb6vzY` as `WHOP_API_KEY` secret so edge functions can use it.

**2. Update `check-stripe-customer` edge function → `check-membership`**
Rename conceptually (or keep the same function) to check both Stripe AND Whop:
- First check Stripe (existing logic)
- If not found in Stripe, check Whop via `GET https://api.whop.com/api/v2/memberships?email={email}` with `Authorization: Bearer {WHOP_API_KEY}`
- Return `{ found: true, source: "stripe" | "whop" }` or `{ found: false }`

**3. Update `AccessBlockModal` to handle Whop users**
The reactivation button for Whop users should link to your Whop product page (or show a "Contact support" message), since they don't have a Stripe billing portal.

**4. Update `useStudentAccess` / webhook flow consideration**
For V1, Whop integration is signup-gating only (verifying the email exists in Whop before allowing registration). Full access lifecycle management (canceled, past_due) from Whop would require a Whop webhook — that can be a follow-up.

### Technical Details

**Edge function update (`check-stripe-customer/index.ts`):**
```
POST { email }
→ Check Stripe customers.list (existing)
→ If not found, check Whop: GET https://api.whop.com/api/v2/memberships?email={email}
   Headers: Authorization: Bearer $WHOP_API_KEY
→ Return { found: true/false, source: "stripe"|"whop"|null }
```

**Auth.tsx:** No changes needed — it already uses `data.found` boolean to gate signup.

**Files to edit:**
- `supabase/functions/check-stripe-customer/index.ts` — add Whop fallback
- Add `WHOP_API_KEY` secret

### Listing Users
After implementation, I'll query Stripe for 10 active and 10 canceled users using the Stripe tools.

