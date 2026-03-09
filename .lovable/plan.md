

## Fix: Remove Page Limits and Scan ALL Whop Members

### Root Cause Confirmed
The Whop `/api/v2/members?query={email}` endpoint's `query` parameter does NOT filter by email. Logs show it returns random members like `dlwaltonsr@gmail.com`, `j.comeaux2@yahoo.com` — not `jerelane0@gmail.com`. The current code only fetches 50 records with no pagination.

### Solution
Update both edge functions to paginate through **ALL** Whop members until every record is checked. No artificial page limits.

### Changes

**File 1: `supabase/functions/check-stripe-customer/index.ts`**

Replace the Whop check (lines 74–111) with:

```typescript
// --- 3. Fallback: Check Whop (paginate ALL members) ---
const whopKey = Deno.env.get("WHOP_API_KEY");
if (whopKey) {
  try {
    let page = 1;
    let found = false;
    let totalScanned = 0;
    
    while (true) {
      const whopUrl = `https://api.whop.com/api/v2/members?per=100&page=${page}`;
      const whopRes = await fetch(whopUrl, {
        headers: { Authorization: `Bearer ${whopKey}` },
      });
      
      if (!whopRes.ok) {
        console.error("[check-membership] Whop API error:", whopRes.status);
        break;
      }
      
      const whopData = await whopRes.json();
      const members = whopData.data ?? [];
      
      if (!Array.isArray(members) || members.length === 0) {
        console.log(`[check-membership] Whop scan complete. Total: ${totalScanned}, no match for: ${normalizedEmail}`);
        break;
      }
      
      totalScanned += members.length;
      
      for (const m of members) {
        const mEmail = (m.email ?? "").trim().toLowerCase();
        if (mEmail === normalizedEmail) {
          console.log(`[check-membership] Whop match found on page ${page}:`, normalizedEmail);
          return new Response(
            JSON.stringify({ found: true, status: "active" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      
      // Check if there's a next page
      if (!whopData.pagination?.next_page) {
        console.log(`[check-membership] Whop scan complete. Total: ${totalScanned}, no match for: ${normalizedEmail}`);
        break;
      }
      
      page++;
    }
  } catch (whopErr) {
    console.error("[check-membership] Whop fetch error:", whopErr);
  }
}
```

**File 2: `supabase/functions/provision-manual-access/index.ts`**

Replace `checkWhopMembership` function (lines 140–171) with same pagination logic — no page limit, scan until complete.

### Key Improvements
| Before | After |
|--------|-------|
| 50 members, 1 page | ALL members, unlimited pages |
| `?query=email` (doesn't work) | Full pagination scan |
| Jerome not found | Jerome found on correct page |

### Expected Result
After deployment, `jerelane0@gmail.com` will show **"Membership verified"** ✓ on signup page.

