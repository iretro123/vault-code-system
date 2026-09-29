import { describe, expect, it } from "vitest";
import { isChatPush } from "../../supabase/functions/_shared/chatPushPolicy";

describe("chat-only push policy", () => {
  it("allows saved main-room chat notifications", () => {
    expect(isChatPush("chat_message", "/academy/room/trade-floor")).toBe(true);
  });
  it.each(["live_now", "announcement", "mention", "rz_message", "new_module", "motivation"])("keeps %s out of device alerts", (type) => {
    expect(isChatPush(type, "/academy/room/trade-floor")).toBe(false);
  });
  it.each([undefined, "/academy/room/signals", "/academy/room/trade-floor-private", "https://example.com", "//example.com"])("rejects non-main-room path %s", (path) => {
    expect(isChatPush("chat_message", path)).toBe(false);
  });
});

it.each(['wins-proof','questions','off-topic','daily-setups'])('allows notification routing for %s after server eligibility checks',room=>{
 expect(isChatPush('chat_message',`/academy/room/${room}`)).toBe(true);
});
