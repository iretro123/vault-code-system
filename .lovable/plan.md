

## Signup Agreement Section

### What We're Building
A legally-styled agreement section with scrollable text, a required checkbox, and database persistence of acceptance — placed directly above the Create Account button on the signup page.

### Database Migration
Create an `agreement_acceptances` table:
- `id` (uuid, PK)
- `user_id` (uuid, not null)
- `accepted_at` (timestamptz, default now())
- `agreement_version` (text, not null) — e.g. `"1.0"`
- `ip_address` (text, nullable)

RLS: Users can insert their own records and read their own records. No update/delete.

### Frontend Changes (src/pages/Signup.tsx)

1. Add `agreementChecked` state (boolean, default false)
2. Add the agreement section between the password fields and the submit button divider:
   - A bordered container with subtle muted background and soft shadow
   - "Important Agreement" title in small bold text
   - ScrollArea (~160px desktop, ~140px mobile) containing the full legal text
   - Checkbox below the scroll area with the required label text, where "Terms of Service" and "Privacy Policy" are `<a>` links
3. Add `agreementChecked` to the `fieldsValid` condition
4. After successful signup (when `newUserId` is available), insert into `agreement_acceptances` with:
   - user_id
   - agreement_version: `"1.0"`
   - IP address fetched from a free API (`https://api.ipify.org?format=json`) — best-effort, nullable

### Style Approach
- Container: `rounded-xl border border-white/[0.08] bg-muted/30 p-4 shadow-sm`
- ScrollArea with slightly darker background for the legal text block
- Text in `text-[11px]` muted foreground for compact professional feel
- Checkbox uses existing Checkbox component with inline link styling

