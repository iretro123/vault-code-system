# $49 Private Mentoring — operations

Status: built and deployed, **off** (`VAULT_MENTORING_ENABLED` unset). No live links, emails or charges.

## Capacity is enforced BEFORE the charge (GHL inventory)
Checking Calendly after payment cannot stop an oversell. The sellable limit is GHL product inventory:
- Turn on inventory tracking for catalog product `6ac9a7c915dafb910f718050` / price `6ac9a7c915dafb910f718058` and set the quantity by hand to the number of sessions you can actually deliver (2 per week, 120 min + buffers).
- Each purchase consumes one unit (the hold). A unit is released only by staff, by hand, after a refund or a coach cancellation with no replacement session.
- There is **no automatic replenishment**. Nothing in this backend writes GHL inventory. Re-stock manually each week.
- The backend capacity guard is a second line: it holds the booking email when deliverable sessions (non-overlapping 120 min + 2×`SESSION_BUFFER_MINUTES`, including booked sessions, next 14 days) do not exceed paid-but-unbooked purchases. There is no artificial weekly cap; owner removed the Calendly 2/week limit and GHL inventory tracking.
- `SESSION_BUFFER_MINUTES` (30) in `supabase/functions/_shared/mentoringDelivery.ts` must match the Calendly event settings; Calendly's API does not expose them.

## Delivery semantics
- `dispatched` = GHL contact fields set (`GHL_MENTORING_LINK_FIELD_ID` = single-use link, `GHL_MENTORING_ID_FIELD_ID` = entitlement id) and tag `vault-mentoring-paid` removed then re-added. It is not proof the email arrived.
- The GHL workflow must: trigger on tag added, **allow re-entry**, and use the entitlement-id field in the email so each purchase is distinct.
- Residual race: a refund landing in the milliseconds between the final re-check and the tag is flagged for staff review ("dispatched but entitlement changed").

## Policy
Member cancellation nonrefundable; one member reschedule ≥24h before start; coach cancellation → reschedule or refund (staff); inability to deliver → refund (staff). Membership refunds never affect mentoring. Meeting location is Zoom; "Tampa, Florida" is postal branding only.
