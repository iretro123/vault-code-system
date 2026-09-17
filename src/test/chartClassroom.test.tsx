import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ChartClassroom, { teachingCandles, structureSwing } from "@/components/academy/ChartClassroom";

describe("interactive chart classroom", () => {
  it("uses valid illustrative OHLC candles", () => {
    expect(teachingCandles).toHaveLength(48);
    teachingCandles.forEach(c => {
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open,c.close));
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open,c.close));
    });
  });
  it("shows a close above structure and a bullish response inside demand", () => {
    expect(structureSwing.high).toBe(teachingCandles[structureSwing.highIndex].high);
    expect(structureSwing.low).toBe(teachingCandles[structureSwing.lowIndex].low);
    expect(teachingCandles.slice(structureSwing.highIndex+1, structureSwing.breakIndex).every(c=>c.close<=structureSwing.high)).toBe(true);
    expect(teachingCandles[structureSwing.breakIndex].close).toBeGreaterThan(structureSwing.high);
    expect(teachingCandles[20].close).toBeGreaterThan(teachingCandles[12].high);
    const bearish=teachingCandles[33], bullish=teachingCandles[34];
    expect(bearish.close).toBeLessThan(bearish.open);
    expect(bullish.open).toBeLessThanOrEqual(bearish.close);
    expect(bullish.close).toBeGreaterThan(bearish.open);
    expect(bullish.open).toBeGreaterThanOrEqual(106.3);
    expect(bullish.close).toBeLessThanOrEqual(108.2);
  });
  it("opens confirmation, switches topics and returns to the full chart", () => {
    render(<ChartClassroom/>);
    fireEvent.click(screen.getByRole("button",{name:"03 Confirmation"}));
    const dialog=screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading",{name:"Confirmation"})).toBeInTheDocument();
    expect(dialog.querySelectorAll(".classroom-region")).toHaveLength(3);
    expect(dialog.querySelectorAll("[data-candle]")).toHaveLength(6);
    expect(dialog.querySelector('[data-candle="33"]')).not.toBeNull();
    expect(dialog.querySelector('[data-candle="34"]')).not.toBeNull();
    fireEvent.click(within(dialog).getByRole("button",{name:"Full chart"}));
    expect(within(dialog).getByRole("button",{name:"Zoom into candles"})).toBeInTheDocument();
    expect(dialog.querySelectorAll("[data-candle]")).toHaveLength(48);
    fireEvent.click(within(dialog).getByRole("button",{name:"2. Demand"}));
    expect(within(dialog).getByRole("heading",{name:"Demand zone"})).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button",{name:"Close"}));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
