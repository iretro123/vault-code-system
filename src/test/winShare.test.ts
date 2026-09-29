import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));
import { canShareWin, cardTradeDetails, shareCaption, shareWinFile, winHighlights } from "@/lib/winShare";
afterEach(() => vi.unstubAllGlobals());
describe("win sharing", () => {
  it("only enables cards for the author's saved Wins posts", () => {
    const post = { id: "saved-win", user_id: "member" };
    expect(canShareWin("wins-proof", post, "member")).toBe(true);
    expect(canShareWin("trade-floor", post, "member")).toBe(false);
    expect(canShareWin("daily-setups", post, "member")).toBe(false);
    expect(canShareWin("wins-proof", post, "other")).toBe(false);
    expect(canShareWin("wins-proof", post)).toBe(false);
    expect(canShareWin("wins-proof", { ...post, is_deleted: true }, "member")).toBe(false);
    expect(canShareWin("wins-proof", { ...post, id: "optimistic-pending" }, "member")).toBe(false);
  });
  it("normalizes the two fields without changing the sign of a return", () => {
    expect(cardTradeDetails("spy", "15%")).toEqual({ ticker: "SPY", result: "+15%", error: "" });
    expect(cardTradeDetails("$QQQ", "-2.5").result).toBe("-2.5%");
    expect(cardTradeDetails("SPY", "0").result).toBe("0%");
    expect(cardTradeDetails("", "").error).toBe("");
    expect(cardTradeDetails("SPY", "$500").error).not.toBe("");
    expect(cardTradeDetails("", "15").error).not.toBe("");
    expect(cardTradeDetails("SPY", "").error).not.toBe("");
  });
  it.each([
    ["Ticker: SPY\nReturn: +15%", { ticker: "SPY", result: "+15%" }],
    ["Symbol: QQQ\nTrade return: -2.5%", { ticker: "QQQ", result: "-2.5%" }],
    ["Ticker: SPY\nReturn: 0%", { ticker: "SPY", result: "0%" }],
    ["Just made 15% on SPY!", { ticker: "", result: "" }],
    ["", { ticker: "", result: "" }],
    ["Balance: $15,000\nBuying power: 80%", { ticker: "", result: "" }],
    ["Return: +15% or +20%", { ticker: "", result: "" }],
  ])("handles post %j without guessing a result", (body, expected) => {
    expect(winHighlights(body)).toEqual(expected);
  });
  it("uses only explicitly labelled results, never inventing or extracting balances", () => {
    expect(winHighlights("**Ticker:** SPY\n**Return:** +15%\nAccount: 99999")).toEqual({ ticker: "SPY", result: "+15%" });
    expect(winHighlights("I want 15% someday. Account: 99999")).toEqual({ ticker: "", result: "" });
    expect(winHighlights("Ticker: private@email.com\nReturn: $500 account balance")).toEqual({ ticker: "", result: "" });
  });
  it("cleans formatting without inventing performance", () => {
    expect(shareCaption("**Lesson:** Waited. <@private-user>" )).toBe("Lesson: Waited. [member]");
    expect(shareCaption("a".repeat(300))).toHaveLength(220);
  });
  it("shares the actual PNG when file sharing is supported", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { canShare: () => true, share });
    const file = new File(["png"], "vault.png", { type: "image/png" });
    expect(await shareWinFile(file)).toBe("shared");
    expect(share).toHaveBeenCalledWith({ files: [file], title: "My progress in Vault OS" });
  });
  it("does not download or claim success when the user cancels", async () => {
    vi.stubGlobal("navigator", { canShare: () => true, share: vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError")) });
    expect(await shareWinFile(new File([], "card.png"))).toBe("cancelled");
  });
  it("surfaces real sharing errors instead of silently downloading", async () => {
    vi.stubGlobal("navigator", { canShare: () => true, share: vi.fn().mockRejectedValue(new Error("Unavailable")) });
    await expect(shareWinFile(new File([], "card.png"))).rejects.toThrow("Unavailable");
  });
});
