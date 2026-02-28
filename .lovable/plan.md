

## Micro-copy + Modal Sizing Polish — Share Vault Referral Modal

### File: `src/components/academy/ReferralModal.tsx`

**Copy changes (text only, no structural changes):**

| Location | Current | New |
|---|---|---|
| Line 131 (headline) | "Invite traders. Grow the community." | "Build the room." |
| Line 134 (subtitle) | "Share Vault OS with other traders. Referral tracking is live — rewards coming soon." | "Share Vault OS with traders you trust. Referral tracking is live — rewards are coming soon." |
| Line 156 (stats) | `{referralStats.total_signed_up} invited · {referralStats.total_paid} upgraded` | `{referralStats.total_signed_up} invited · {referralStats.total_paid} joined` |
| Line 158 (muted note) | "Rewards and credits expand in a future update." | "Founder rewards and credits unlock in a future update." |
| Line 182 (footer link) | "View Terms" | "Referral details" |

**Add helper text** below the copy-link row (after line 174): muted line "Share this link with friends. We track signups automatically."

**Sizing changes (container only):**

| Location | Current | New |
|---|---|---|
| Line 206 (desktop DialogContent) | `w-[680px] max-w-[92vw]` | `w-[600px] max-w-[92vw] max-h-[700px]` |
| Line 197 (mobile DrawerContent) | no width/height constraints | add `max-h-[90vh]` |
| Line 108 (ReferralBody wrapper) | `overflow-hidden` | `overflow-hidden max-h-[inherit]` with scrollable body section via `overflow-y-auto` on the content div (line 123) |

### Summary
- 5 text string replacements
- 1 new helper text line
- Desktop modal narrowed from 680px → 600px, max-height 700px
- Mobile max-height 90vh
- Body content scrolls if it exceeds height
- No layout, logic, or backend changes

