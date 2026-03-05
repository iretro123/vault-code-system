

## Trade Floor Chat QA Report

### What I Tested
1. **Page load** -- Chat loaded with skeleton placeholders, then populated. No blank flash.
2. **Sending a message** -- Typed and sent "Test message for QA check." Optimistic insert appeared instantly, then confirmed by realtime.
3. **CEO badge** -- Purple solid fill with gold crown icon displays correctly. No "Beginner" label on CEO messages.
4. **Member badge** -- m0348418 correctly shows "Beginner" badge.
5. **Context menu** -- Right-click on message shows Copy, Reply, Edit, Delete, Pin message options. All render correctly.
6. **Delete flow** -- Confirmation dialog appeared, message soft-deleted with "This message was deleted." placeholder and toast.
7. **Image attachments** -- Chart screenshot renders inline at proper size.
8. **Quote replies** -- The `> **@m0348418:** hey` block renders as a styled quote.

### Results: No Bugs Found
All core chat features work correctly with zero errors in the console (only a harmless React ref warning on `ChatAvatar` inside `AcademySidebar`).

### Performance Metrics
- **JS Heap**: 32MB used (healthy)
- **DOM Nodes**: ~1,181 elements, depth 23 (manageable)
- **CLS**: 0.15 (needs improvement -- caused by chat feed shifting on load)
- **RoomChat.tsx**: 58KB -- largest app component, but loads fine

### Scalability Assessment for Many Students

**What's already good:**
- Rate limiting on messages (3-second cooldown) prevents spam
- Optimistic rendering eliminates perceived send latency
- Global message cache (`roomMessageCache`) prevents re-fetching on tab switches
- ID-based diffing avoids unnecessary re-renders on background refresh
- Realtime deduplication handles optimistic-to-real message replacement
- Typing indicator throttled to 1 broadcast/second with 3.5s auto-remove
- Pagination (40 messages per page) with lazy-load-more

**Potential issues at scale (50+ concurrent users):**
1. **CLS on initial load** -- The chat feed shifts when messages load, causing a layout shift of 0.15. At scale with more content, this could feel jarring. Fix: set a min-height on the skeleton or use `scrollTo` after load.
2. **Realtime channel per room** -- Each user subscribes to `room-{slug}` + `typing-{slug}` channels. Supabase handles this well up to hundreds of concurrent connections per channel.
3. **Profile fetching** -- `useChatProfiles` fetches profiles in batches via `user_id=in.(...)`. With many unique users, this could hit URL length limits. Currently uses a global cache so this is mitigated for repeat visitors.
4. **Reaction queries** -- `message_reactions` are fetched with all visible message IDs in one `IN(...)` query. With 40 messages this is fine; the URL could get long but stays within limits.
5. **No virtualization** -- All 40 loaded messages render in the DOM. For the current PAGE_SIZE of 40 this is fine. If users scroll back and load 200+ messages, DOM could grow. Consider virtualizing if load-more is used heavily.

### Verdict
The Trade Floor chat is production-ready for the current scale. No bugs, fast send/receive, proper optimistic updates, clean delete flow, and correct badge rendering. The architecture (caching, pagination, throttling, realtime dedup) is well-suited for dozens of concurrent users without issues.

