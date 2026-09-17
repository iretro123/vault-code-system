# Community readability audit — local only

## Judgment and changes

The existing 16px chat body is a good baseline. Kept the app font, normal weight,
and approximately 1.55 line height instead of enlarging the entire interface.
Names remain 15px; tabs now use 15px with 44px minimum touch height.
Signal notes and trade-card values now match the 16px body. Trade labels,
edited markers, attachment captions and role badges no longer depend on 10px
text. Supporting metadata is 12px, quoted previews 13px.
Reply bodies/composers have explicit 16px rules; reply count contrast increased.
Long names/values wrap. Trade-card image and fields stack on mobile rather than
competing for width. No data, publishing or messaging changes.

## Verification

- Inspected actual local Chat, Signals, Wins and reply panel in the in-app browser;
  screenshots and computed styles reviewed. No messages sent.
- Repeatable fixture-based suite: `scripts/qa-community-type.cjs`.
- 42 cases: Chat, Signals, Wins × Chromium and WebKit × 320×568, 375×667,
  393×852, 412×915, 768×1024, 1440×900 and 852×393.
- Checked populated messages, long author name/link, signal card, formatted trade
  post, horizontal bounds, page errors and scroll endpoints. All passed.
- Reviewed mobile WebKit and desktop Chromium screenshots. Output:
  `/tmp/vault-community-type/results.json` and sibling screenshots.
- 10 targeted tests passed: drafts, thread failures/reopening, realtime handling,
  and Community navigation. TypeScript passed before final presentational tweaks.
- Selected solid-surface contrast calculations: body 12.68:1, metadata 7.82:1,
  signal body 10.36:1. These are not an exhaustive accessibility certification.

## Limits

These are browser-engine/viewport tests, not physical iPhones/Android devices.
Native keyboard occlusion, OS text scaling, screen readers, low-end-device GPU
performance and every member-uploaded image need separate device validation.
Fixture network requests are intercepted, so this does not certify production
delivery latency or live backend correctness. Nothing deployed.
