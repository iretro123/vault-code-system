import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PulseLiquidityChart } from "@/components/academy/chat/PulseLiquidityChart";

afterEach(cleanup);
const props = { symbol: "SPY", timeframe: 5 as const, side: "supply" as const, headline: "Supply", capturedAt: 1790712001656, chartCapturedAt: 1790738877979, chartUrl: "https://example.com/base.png" };
const pair = { url: "https://example.com/liquidity.png", capturedAt: props.chartCapturedAt - 17000, baseCapturedAt: props.chartCapturedAt };
describe("optional liquidity chart", () => {
  it("starts off, switches real images and opens the selected original", () => {
    render(<PulseLiquidityChart {...props} liquidityChart={pair}/>);
    expect(screen.getByRole("switch", {name:"Show liquidity"})).toHaveAttribute("aria-checked","false");
    expect(screen.getByAltText(/^Original TradingView/)).toHaveAttribute("src",props.chartUrl);
    fireEvent.click(screen.getByRole("switch"));
    const img = screen.getByAltText(/^Original TradingView/);
    expect(img).toHaveAttribute("src",pair.url);
    expect(screen.getByText("How to read the lines")).toBeInTheDocument();
    fireEvent.load(img);
    fireEvent.click(screen.getByRole("button",{name:/Expand original/}));
    expect(screen.getByAltText(/^Full unmodified screenshot/)).toHaveAttribute("src",pair.url);
  });
  it("never attaches old liquidity to a new capture or timeframe", () => {
    const view=render(<PulseLiquidityChart {...props} liquidityChart={pair}/>);
    fireEvent.click(screen.getByRole("switch"));
    view.rerender(<PulseLiquidityChart {...props} chartCapturedAt={props.chartCapturedAt+1} liquidityChart={pair}/>);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.getByAltText(/^Original TradingView/)).toHaveAttribute("src",props.chartUrl);
    view.rerender(<PulseLiquidityChart {...props} timeframe={15} liquidityChart={pair}/>);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked","false");
  });
  it("does not offer unavailable or unpaired images", () => {
    const view=render(<PulseLiquidityChart {...props}/>);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    view.rerender(<PulseLiquidityChart {...props} liquidityChart={{...pair,capturedAt:props.chartCapturedAt+91000}}/>);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});
