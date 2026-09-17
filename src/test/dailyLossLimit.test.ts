import { describe, expect, it } from "vitest";
import { dailyLossLimit } from "@/components/trade-os/DailyLossCalculator";
describe("simple daily loss limit", () => {
  it("calculates a daily percentage, not a per-trade allowance", () => {
    expect(dailyLossLimit("5000", "0.5")).toBe(25);
    expect(dailyLossLimit("10000", "1")).toBe(100);
    expect(dailyLossLimit("2000", "0.25")).toBe(5);
  });
  it("rounds down to cents and allows zero risk", () => {
    expect(dailyLossLimit("1234.56", "0.25")).toBe(3.08);
    expect(dailyLossLimit("5000", "0")).toBe(0);
  });
  it("rejects missing, negative, nonfinite and out-of-range inputs", () => {
    for (const [a,p] of [["","1"],["5000",""],["-10","1"],["0","1"],["Infinity","1"],["100","101"],["100","-1"],["100","NaN"]]) expect(dailyLossLimit(a,p)).toBeNull();
  });
});
