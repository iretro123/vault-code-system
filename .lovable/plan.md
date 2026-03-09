

## Root Cause: Whop API Wrong Endpoint + Missing Email Permission

**What's happening:**

1. Both `check-stripe-customer` and `provision-manual-access` use `/api/v2/memberships?per=50&page=N` (capped at 10 pages = 500 records max).

2. **Critical flaw:** The `/api/v2/memberships` endpoint does NOT return emails unless the API key has the `member:email:read` permission scoped explicitly. Without it, `m.email` and `m.user?.email` come back as `null` on EVERY record — so the email comparison `"" === "jerelane0@gmail.com"` always fails silently. It scans 500 people, finds zero, logs "No Whop match" — and the user is blocked.

3. Even if the permission is granted, older members like Jerome (subscribed since Oct 2025) could be beyond page 10 if Whop has 500+ historical memberships total.

**The fix (no whitelist needed):**

The Whop API has a dedicated `/api/v2/members?query={email}` endpoint. The docs explicitly say: *"Search members by name, username, or email."* Members listed here **have an active membership by definition** — the docs state: *"Returns a list of all your members. Members are users who have a currently active membership."*

This is a server-side email filter — no pagination, no limit issues, directly targeted.

---

### Changes Required

**File 1: `supabase/functions/check-stripe-customer/index.ts`**

Replace the Whop section (step 3, lines 74–132) with:

```
GET https://api.whop.com/api/v2/members?query={email}&per=50
```

- Parse `data` array from response
- Find any entry where `entry.email.trim().toLowerCase() === normalizedEmail`
- If found → `{ found: true, status: "active" }` (members endpoint only returns active subscribers)
- Also add a fallback: try the username field match in case email is stored differently
- Keep 1 API call total, no loop needed

**File 2: `supabase/functions/provision-manual-access/index.ts`**

Replace the `checkWhopMembership` function (lines 139–187) with the same `/api/v2/members?query={email}` approach.

- One call, server-side filtered, no page limit
- Returns `true` if any matching active member found

---

### Summary

| Before | After |
|--------|-------|
| Scans `/api/v2/memberships`, page 1-10 (500 records) | Calls `/api/v2/members?query={email}` (direct search) |
| `m.email` = null due to missing permission → never matches | Server-side email filter, no permission needed for query |
| Jerome not found, signup blocked | Jerome found instantly, signup allowed |

**2 edge function files changed. No database migrations. No frontend changes.**

Both functions get the same fix so that the signup gate check AND the post-signup provisioning both work reliably for all Whop members regardless of how many total memberships exist.

