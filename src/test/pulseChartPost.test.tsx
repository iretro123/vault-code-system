import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PulseChartPost, type PulseChartPostProps } from "@/components/academy/chat/PulseChartPost";
import { ZonePulseCard } from "@/components/academy/chat/ZonePulseCard";
import type { PulsePost } from "@/lib/spxPulse";

afterEach(() => { cleanup(); vi.useRealTimers(); });
const capture = "https://example.com/spy-pulse-5m.png";
const props: PulseChartPostProps = {
  symbol: "SPY", timeframe: 5, side: "demand", headline: "New 5m demand.",
  capturedAt: Date.parse("2026-09-24T16:41:25Z"), chartUrl: capture,
  lower: 766.40, upper: 767.24,
  entryMarkup: { sourceUrl: capture, width: 910, height: 630, path: "M555 147 L594 229 L714 156", point: { x: 714, y: 156 } },
};
function loadImage(width = 910, height = 630) {
  const image = screen.getByAltText(/^Original TradingView/);
  Object.defineProperties(image, { naturalWidth: { configurable: true, value: width }, naturalHeight: { configurable: true, value: height } });
  fireEvent.load(image);
  return image;
}

describe("Pulse screenshot integrity", () => {
  it("labels a manually refreshed chart as a later view without changing the zone event time", () => {
    const post: PulsePost = { id: "refresh", zoneId: "zone", symbol: "AMEX:SPY", timeframe: 5, side: "demand", kind: "observed", source: "indicator", at: props.capturedAt, lower: 766.4, upper: 767.24, price: 768, confirmed: false, chartUrl: capture, capturedAt: props.capturedAt + 3600000, captureContext: "refresh" };
    render(<ZonePulseCard post={post}/>);
    loadImage();
    expect(screen.getByText("Sep 24 · 12:41 PM ET")).toBeInTheDocument();
    expect(screen.getByText(/Chart refreshed · Sep 24, 1:41:25 PM ET/)).toBeInTheDocument();
    expect(screen.getByText("Later view of this zone")).toBeInTheDocument();
    expect(screen.queryByText(/New 5m/)).not.toBeInTheDocument();
  });
  it("keeps the event timestamp distinct from a later screenshot capture", () => {
    render(<PulseChartPost {...props} chartCapturedAt={props.capturedAt + 60000}/>);
    loadImage();
    expect(screen.getByText("Sep 24 · 12:41 PM ET")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expand original SPY 5-minute screenshot" }));
    expect(screen.getByText("Captured Sep 24, 12:42:25 PM ET.")).toBeInTheDocument();
  });
  it("does not present old zone levels or entry examples when no zone is active", () => {
    render(<PulseChartPost {...props} side="neutral" headline="No active 5m zone."/>);
    loadImage();
    expect(screen.getByText("No active 5m zone.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Zone from/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "See entry example" })).not.toBeInTheDocument();
    expect(screen.queryByText("demand")).not.toBeInTheDocument();
  });
  it("shows the original first and never replaces it when toggling an example", () => {
    render(<PulseChartPost {...props}/>);
    const image = loadImage();
    expect(screen.queryByRole("img", { name: /Hypothetical/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "See entry example" }));
    expect(screen.getByRole("img", { name: /Hypothetical/ })).toBeInTheDocument();
    expect(screen.getByText("Entry example")).toBeInTheDocument();
    expect(image).toHaveAttribute("src", capture);
    fireEvent.click(screen.getByRole("button", { name: "Hide example" }));
    expect(screen.queryByRole("img", { name: /Hypothetical/ })).not.toBeInTheDocument();
    expect(image).toHaveAttribute("src", capture);
  });
  it("never reuses markup on a different capture or different image dimensions", () => {
    const view = render(<PulseChartPost {...props}/>);
    loadImage(1920, 1080);
    expect(screen.queryByRole("button", { name: "See entry example" })).not.toBeInTheDocument();
    loadImage();
    fireEvent.click(screen.getByRole("button", { name: "See entry example" }));
    view.rerender(<PulseChartPost {...props} chartUrl="https://example.com/newer.png"/>);
    loadImage();
    expect(screen.queryByRole("img", { name: /Hypothetical/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "See entry example" })).not.toBeInTheDocument();
  });
  it("offers retry on an image failure and restores the same source", () => {
    render(<PulseChartPost {...props}/>);
    fireEvent.error(screen.getByAltText(/^Original TradingView/));
    expect(screen.getByText("Chart loading… retrying automatically.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "See entry example" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(loadImage()).toHaveAttribute("src", capture);
  });
  it("automatically recovers a temporarily unavailable image, with bounded retries", () => {
    vi.useFakeTimers();
    render(<PulseChartPost {...props}/>);
    for (const delay of [2000, 5000, 10000, 20000, 30000]) {
      fireEvent.error(screen.getByAltText(/^Original TradingView/));
      act(() => vi.advanceTimersByTime(delay));
      expect(screen.getByAltText(/^Original TradingView/)).toHaveAttribute("src", capture);
    }
    fireEvent.error(screen.getByAltText(/^Original TradingView/));
    act(() => vi.advanceTimersByTime(60000));
    expect(screen.getByText("Chart couldn’t load.")).toBeInTheDocument();
    expect(screen.queryByAltText(/^Original TradingView/)).not.toBeInTheDocument();
  });
  it("opens the unmarked source and keeps it intact at actual size", () => {
    render(<PulseChartPost {...props}/>);
    loadImage();
    fireEvent.click(screen.getByRole("button", { name: "See entry example" }));
    fireEvent.click(screen.getByRole("button", { name: "Expand original SPY 5-minute screenshot" }));
    const image = screen.getByAltText(/^Full unmodified screenshot/);
    expect(image).toHaveAttribute("src", capture);
    fireEvent.click(screen.getByRole("button", { name: "Actual size" }));
    expect(image.parentElement).toHaveClass("pcp-actual");
    expect(image).toHaveAttribute("src", capture);
    expect(screen.getByRole("dialog").querySelector(".pcp-entry-markup")).toBeNull();
  });
  it("waits for a screenshot even when the feed includes candle data", () => {
    const post: PulsePost = {
      id: "test", zoneId: "zone", symbol: "CAPITALCOM:SPX500", timeframe: 5,
      side: "demand", kind: "entered", source: "indicator", at: props.capturedAt,
      lower: 7660, upper: 7670, price: 7665, confirmed: false,
      bars: [{ t: props.capturedAt, o: 7664, h: 7669, l: 7662, c: 7665 }],
    };
    const { container } = render(<ZonePulseCard post={post}/>);
    expect(screen.getByText("Original chart unavailable for this update.")).toBeInTheDocument();
    expect(container.querySelector(".pulse-data-chart")).toBeNull();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("$SPX500")).toBeInTheDocument();
  });
});
