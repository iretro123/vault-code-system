# Fix the online member profile overlay

## Scope
- Keep the existing profile card appearance and content unchanged.
- Replace the unpositioned inline card with a controlled, collision-aware overlay anchored to the selected online member.
- Add an always-visible, accessible close button and reliable dismissal by close button, Escape, outside click/tap, member switching, and route changes.
- Restore focus to the selected member trigger when dismissal happens without navigation.
- Constrain the card to the available viewport with internal scrolling and mobile safe-area spacing.

## Technical details
- Use the existing Radix popover primitive in `CommunitySpace` for anchoring, collision handling, outside interaction, Escape handling, and focus restoration.
- Keep the profile card mounted inside the overlay; add the close control to every card state, including loading and failure.
- Preserve inside interactions and the Message/settings navigation behavior.
- Add focused component tests for all dismissal paths, switching, route changes, and constrained positioning CSS.
- Validate with the focused tests, TypeScript check, production build, and desktop/mobile mock-profile screenshots if the local preview permits.

## Constraints
- No backend, member-data, messaging, billing, CRM, authentication, or publishing changes.
