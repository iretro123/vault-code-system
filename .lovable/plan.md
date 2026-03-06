

## Fix: First Name Not Appearing in Dashboard Greeting + Settings

### Root Cause

There's a **race condition** during signup between two `ensureProfile` calls:

1. **Auth listener** (`useAuth.tsx` line 81): `ensureProfile(userId, email)` — called with NO opts (no first name, no username, no phone). This fires immediately on `SIGNED_UP` event.
2. **Signup page** (`Signup.tsx` line 103): `ensureProfile(userId, email, { display_name, username, phone_number })` — called AFTER with the actual form data.

Since call #1 runs first and creates the profile with **defaults** (email prefix as display_name, random username), call #2 finds `existing` profile and **returns early without updating**. The user's actual first name, chosen username, and phone number are silently discarded.

**Result**: Dashboard greeting shows email prefix (e.g. "Good afternoon, john123") instead of "Good afternoon, John". Settings shows a random username instead of the one the user chose.

### Fix

**File: `src/lib/ensureProfile.ts`**

When `opts` are provided (display_name, username, phone_number) and a profile already exists, **update the profile** with those values instead of returning early. This way, whichever call runs second still applies the correct user-supplied data.

```typescript
// Current behavior (broken):
if (existing) return;  // ← discards form data

// New behavior:
if (existing) {
  // If caller provided explicit opts, patch them onto the existing profile
  if (opts?.display_name || opts?.username || opts?.phone_number) {
    const updates: Record<string, any> = {};
    if (opts.display_name) updates.display_name = opts.display_name;
    if (opts.username) updates.username = opts.username;
    if (opts.phone_number) updates.phone_number = opts.phone_number;
    await supabase.from("profiles").update(updates).eq("user_id", userId);
  }
  return;
}
```

This is a 1-file fix (~8 lines added). No other files need changes — the dashboard already reads `profile.display_name.split(" ")[0]` for the greeting, and settings already reads from the profile. Once the profile stores the correct data, everything downstream works.

### What This Fixes
- **Dashboard card**: "Good afternoon, **John**" (first name from signup form)
- **Settings page**: Shows correct display name, chosen username, and phone number
- **PlayerIdentity dropdown**: Shows correct name and @username

