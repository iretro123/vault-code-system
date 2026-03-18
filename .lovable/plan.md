
Goal: Upgrade signup legal consent into a premium popup card (luxury modal), with a scrollable agreement and required acceptance flow before account creation.

Implementation plan

1) Replace inline agreement block with a premium “launcher” row on signup
- File: `src/pages/Signup.tsx`
- Remove the current in-form agreement scroll block + checkbox.
- Add a compact premium section right above “Create Account”:
  - Title: “Important Agreement”
  - Status chip: “Not accepted” / “Accepted”
  - CTA button: “Review Agreement” (or “View Again” once accepted)

2) Add luxury popup agreement card (modal) flow
- Use existing dialog primitives (`Dialog`, `DialogContent`) to open a centered popup card over signup.
- Modal design:
  - Premium dark glass background, subtle border glow, soft layered shadow
  - Rounded corners, tight typography, high-contrast title/subtext
  - Scrollable legal body (`ScrollArea`) with `h-[140px]` mobile and `md:h-[160px]` desktop
- Keep exact legal text and exact checkbox sentence with clickable Terms/Privacy links.

3) Make acceptance action return user to signup card
- Add local modal state:
  - `agreementModalOpen`
  - `agreementDraftChecked` (inside modal)
  - existing `agreementChecked` as final accepted state for signup.
- Flow:
  - User opens modal, reads, checks agreement.
  - On check/confirm action, set `agreementChecked = true`, close modal immediately, return focus to signup form.
- Add subtle success feedback in form (check icon + “Agreement accepted”).

4) Enforce functional requirement before Create Account
- Keep `Create Account` disabled until `agreementChecked` is true (already present; retain).
- Add a submit-time guard in `handleSubmit`:
  - If not accepted (edge case/manual trigger), prevent submit and open modal.
  - Show concise destructive toast: “Please review and accept the agreement.”

5) Keep backend acceptance logging as-is, with small hardening
- Reuse current acceptance write to `agreement_acceptances` after account creation.
- Keep fields: user ID, agreement version, IP (best-effort), timestamp via DB default.
- Add defensive check before insert to ensure it only runs when `agreementChecked` is true.

Technical details (implementation-specific)
- Main file changes: `src/pages/Signup.tsx` only.
- Reuse existing UI components already in project:
  - `Dialog` from `src/components/ui/dialog.tsx`
  - `ScrollArea` and `Checkbox`
  - Existing fintech palette/classes (`vault-glass-card` style language).
- No new database migration needed for this request (table/persistence already in place).
- Mobile behavior:
  - Modal width constrained (`max-w-[92vw]`)
  - Max height (`max-h-[85vh]`) with internal scroll area
  - Touch-friendly buttons and checkbox spacing.

Acceptance criteria
- User cannot create account unless agreement is accepted.
- Agreement is reviewed in a premium popup card, not embedded inline.
- Checking acceptance returns user to signup form and preserves accepted state.
- Terms/Privacy links open correctly.
- Acceptance still saves to backend with user ID, version, timestamp, and IP if available.
