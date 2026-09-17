# Community: local audit and improvement pass

## Market-watch and navigation pass

- Added a blue 3px underline on the active Chat, Signals, Wins or Calendar button. Existing `aria-current` is the single source of selection; automated navigation coverage checks all four.
- Added an on-demand Market watch dialog, available without leaving a room or clearing a draft. Uses the documented TradingView stock screener embed, with attribution, an explicit delayed-data label, and an always-visible external fallback. Only mounts the third-party script while open. The default is large U.S. companies; members can use the provider toolbar. It is NOT a custom momentum, breakout or real-time pre-market scanner.
- Separate source links open TradingView pre-market gainers and Finviz Elite. The latter is labeled paid; Vault has not purchased or bundled an Elite membership. No quotes are scraped or copied into our own database.
- Tests cover mount-on-open, unmount-on-close, script-error fallback, data disclosure and source destinations. Provider rendering, exchange timestamps and mobile iframe behavior still require browser/device validation; automated DOM tests cannot validate third-party quote delivery.

### Recommended next live-data product

Build one compact morning shortlist, not another busy terminal. Each row should show ticker/company, pre-market change, pre-market volume, a timestamped news catalyst, and distance to the pre-market high. Let members open a chart and discuss the ticker without automatically posting. Rank by transparent criteria; label proximity to a level rather than predicting a breakout. Show session (including holidays), source, quote timestamp, delay, and stale/error state. Never use a green “live” badge simply because a refresh timer is running.

True custom real-time display needs a provider agreement covering redistribution to paying Vault members and relevant exchange entitlements. Personal TradingView subscriptions do not upgrade embedded quotes. Confirm coverage, cost, extended hours, refresh cadence, licensing, and news rights before buying or implementing a backend. Use server-held credentials, shared caching and rate limits rather than one upstream feed per member. Keep provider payloads out of chat/profile data and gate paid access server-side.

### Highest-priority community gaps rechecked

1. Structured signal drafts still clear after an awaited callback without an explicit success contract. Fix/test against a separate test backend before release.
2. Message caches remain room-keyed rather than account-keyed; test sign-out and role transitions.
3. Unread state uses a singleton owner; test multiple room mounts and multi-device reading.
4. Pagination anchoring and reconnect delivery need multi-user/offline QA.
5. RoomChat remains a large bundle. Lazy-load optional tools before adding a permanent market stream.

Product additions should follow reliability: saved useful replies, coach-reviewed answers, and ticker-linked discussions. Avoid adding profit leaderboards, automatic buy calls, or unverified “stocks about to break out.” This is a targeted source/UI review, not a full security or production load audit.

Sources checked September 14, 2026:
- https://www.tradingview.com/widget-docs/widgets/screeners/screener/demos/stock/
- https://www.tradingview.com/widget-docs/faq/data/
- https://www.tradingview.com/markets/stocks-usa/market-movers-pre-market-gainers/
- https://finviz.com/elite

## Follow-up: identity and brighter design

- Confirmed the latest checked-in `get_community_profiles` definition is a SQL STABLE SELECT. The preview now permits only GET to this exact RPC; POST, other RPCs, and profile/message writes remain blocked. Chat and public-profile lookups use GET. This restores existing member photos, icon avatars and profile metadata without copying or modifying accounts.
- SignalCard now receives the author's avatar instead of always rendering its default. Automated tests cover both signal variants and the read-only allowlist.
- Brightened the chat, composer and sidebar to slate surfaces. Sky, mint and rose accents distinguish watchlists/calls/puts; readable labels and larger tickers replace tiny metadata. Signal authors and timestamps remain visible.
- Quick watchlist entry is an optional disclosure, reducing the admin footer's crowding. The full editor remains available. Browser tested opening and closing the editor, without posting.
- Remaining logic issue found: structured SignalPostForm clears after an awaited callback that does not propagate success/failure. Unlike the text composer, it still needs a typed submit-result contract and failure tests before release. No production posting was used to test this.

### Additional retention ideas, not implemented

- Let members follow a chart discussion rather than receive every chat notification.
- Add a coach-reviewed label only when a coach explicitly reviews a post.
- Offer one weekly community chart challenge with a later explanation, including failed setups.
- Give members a saved collection of useful answers, not a leaderboard based on profit.
- Show the original post date prominently when old watchlists are revisited; never present archived calls as currently actionable.

These extend learning and belonging without making the interface busier or implying guaranteed performance.

## Scope and confidence

Inspected the Community route, trade-floor composition, RoomChat send/composer/scroll logic, message-fetch/realtime hook, unread hook, ticker aggregation, calendar uploads, and the old coaching sidebar. Tested local browser navigation and responsive layout; automated tests cover draft persistence, member/room isolation, navigation, gated-room unread handling, and guide destinations. This is not a completed production security, load, or multi-device delivery audit. No member messages, notifications, uploads, purchases, deployments, or database mutations were performed as tests.

## What is already useful

- Existing optimistic messages, realtime subscriptions, reconnect backoff, catch-up polling, threads, replies, mentions, moderation, reactions and attachment support are worth preserving.
- Four rooms are easier to understand than a large Discord-style channel tree.
- Classes, risk planning and course materials already exist; Community should connect these, not duplicate them.

## Fixed in this local pass

1. Drafts were cleared before send success despite the hook claiming they were retained. The composer now clears only after success, retaining the reply context on failure.
2. Room drafts now persist in session storage, separated by member and room. They remain browser-local and are not cloud-synced. Clearing the composer removes its stored draft.
3. Calendar fell back to `trade-floor` as the active room. It now passes no active room; gated/loading Signals likewise does not clear unread messages. Removed duplicate mark-read calls from page handlers.
4. Hidden rooms could auto-scroll; the new-message effect is now active-room-only. Removed `scrollIntoView` that could move ancestor scrolling surfaces. Chat scrolling now informs the existing unread-at-bottom state.
5. Message load errors now have a visible retry action; reconnecting has a status message. Inactive rooms skip the periodic catch-up poll, while realtime subscription behavior is preserved.
6. IME composition no longer sends a message on Enter while a user is composing a character.
7. Calendar posting could show success after failures and clear content. Errors now stop the sequence and retain unsent content; confirmed successful files are removed from the retry queue.
8. Removed the disabled placeholder admin toolbar (actual moderation controls remain in chat). Increased room-tab readability, added focus styles and blue unread badges, simplified mobile framing, and added a Classroom shortcut.
9. Replaced the active desktop sidebar's trade-count goals and generic coach nudges with a compact learning guide. Daily risk links to the existing calculator, not a nonexistent log workflow.
10. Mobile thread drawer fills the available chat width instead of hard-coding 320px.
11. Ticker chips say “Mentioned in chat”; the query explicitly uses the latest 200 messages from the past 24 hours and counts each ticker once per message. This is discussion activity, not verified stock performance or a recommendation.
12. Calendar includes the official TradingView economic-calendar link and separates external current events from team-uploaded posts. It is NOT an embedded real-time feed. Source: https://www.tradingview.com/economic-calendar/

## Remaining release gates, in priority order

- **Delivery QA in a separate test backend:** duplicate sends under rapid taps, offline timeouts and retries, simultaneous users, missed updates after reconnect, and multi-device read state. Current optimistic IDs provide a foundation but do not establish end-to-end delivery guarantees.
- **Read-state architecture:** the shared unread hook has singleton subscription ownership and marks entry as read. Test unmount order, hidden browser tabs, stale counts on account changes and reading old history. A production read cursor should advance only through messages actually seen.
- **Account-isolated message caches:** `roomMessageCache` is keyed by room, not member. Audit logout/account-switch clearing and entitlement changes before release. Do not rely on a client gate for server authorization.
- **Pagination stability:** older-message loading lacks an in-flight lock and explicit viewport anchoring. Re-entering a room refetches its latest page, which can discard loaded history. Fix/test before calling this Discord-equivalent.
- **Performance:** production output reports RoomChat at roughly 1.67 MB uncompressed / 231 KB gzip. Lazy-load optional emoji/GIF/moderation panels, then measure on a midrange phone; do not claim a speed multiplier without measurements.
- **Authorization and abuse:** audit database RLS, storage permissions, mention fan-out, moderator-only actions, attachment validation and rate limits on a non-production backend. Client content filtering is not a security boundary.
- **Calendar uploads:** still need orphan-file cleanup when storage succeeds but saving the row fails, resource cleanup on unmount, and server-enforced file caps. Posting is not an atomic batch.
- **Preview constraints:** read-only localhost intentionally blocks some RPCs; profile/avatar enrichment and write actions cannot be fully validated there. Blank enrichment in this preview is not proof the production feature is broken.
- **Responsive QA limitations:** local browser viewport overrides produced composited screenshots; DOM geometry confirmed no horizontal document overflow at the tested desktop size. Natural mobile screenshots were readable. Real iOS keyboard, safe-area and Android tests remain necessary.

## Best next product bets (proposals, not implemented)

1. **Chart review queue:** attach a chart, ticker and timeframe, then one question. A mentor can mark “answered”; members find unanswered questions without scrolling the entire feed.
2. **Before/after chart lessons:** one annotated community chart after class, with the initial thesis and what actually happened. Include failed setups, not just winners.
3. **Catch up since your visit:** a small list of mentor answers, class changes and pinned learning posts, linking to originals. If AI-generated, label it and cite messages.
4. **Learning wins:** celebrate waiting, following a rule and spotting a setup—not a leaderboard that rewards taking more trades.
5. **Verified market context:** a compact calendar widget or licensed market-data service with timestamps, timezone, delay and attribution. Separate “members discussing” from prices or movers. No auto-generated buy/sell claims.
6. **Predictable human feedback:** publish who is available for chart review and when. Retention comes from getting a useful answer and learning with people, not extra navigation or badges.

These are hypotheses to validate with member feedback and voluntary participation; none guarantees retention or trading profitability.
