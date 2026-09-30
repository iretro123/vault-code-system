import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SpxPulseRoom } from "@/components/academy/community/SpxPulseRoom";
import type { PulseFeed, PulsePost } from "@/lib/spxPulse";

const state = vi.hoisted(() => ({ feed: {} as PulseFeed, connected: true }));
vi.mock("@/hooks/usePulseFeed", () => ({ usePulseFeed: () => ({ ...state, error: null }) }));
vi.mock("@/hooks/usePulseReactions", () => ({ usePulseReactions: () => ({ forPost: () => [], pending: false, react: vi.fn() }) }));
const at = Date.parse("2026-09-25T17:35:00Z");
const original: PulsePost = { id: "original", zoneId: "zone", symbol: "AMEX:SPY", timeframe: 5, side: "demand", kind: "observed", source: "indicator", at: at - 300000, lower: 770.83, upper: 771.3, price: 771, confirmed: false, chartUrl: "https://example.com/original.png", captureStatus: "unavailable" };
const broken: PulsePost = { ...original, id: "broken", kind: "broken", at, price: 770.6, confirmed: true, chartUrl: undefined };
const fifteen: PulsePost = { ...original, id: "fifteen", zoneId: "zone15", timeframe: 15, lower: 767.7, upper: 769.78, at: at - 600000 };
function setup() {
  vi.useFakeTimers(); vi.setSystemTime(at + 1000);
  Element.prototype.scrollTo = vi.fn();
  state.connected = true;
  state.feed = { symbol: "AMEX:SPY", posts: [fifteen, original, broken], receivedAt: at, indicatorAt: { 5: at, 15: at }, sessionOpen: true, captureConnected: false, quotes: { 5: { at, price: 770.6, zones: [] }, 15: { at, price: 770.6, zones: [{ side: "demand", lower: 767.7, upper: 769.78 }] } } };
  return render(<SpxPulseRoom/>);
}
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe("Live Pulse channel", () => {
  it("keeps the last real zone visible when no zone is active", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Latest zone · No longer active" })).toBeInTheDocument();
    expect(screen.queryByText("5m demand broke. Closed below 770.83.")).toBeInTheDocument();
    expect(screen.getByText("Chart capture offline")).toBeInTheDocument();
    expect(screen.getByText("Earlier view · same zone")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Earlier updates (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "View chart" }));
    expect(screen.getByAltText(/^Full unmodified screenshot/)).toHaveAttribute("src", original.chartUrl);
  });
  it("switches timeframe, displays its original chart, and opens the same live interval", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "15 min" }));
    expect(screen.getByText("15m demand on watch.")).toBeInTheDocument();
    expect(screen.queryByText("5m demand broke. Closed below 770.83.")).not.toBeInTheDocument();
    expect(screen.getByAltText(/^Original TradingView SPY 15-minute/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open SPY on TradingView" })).toHaveAttribute("href", "https://www.tradingview.com/chart/?symbol=AMEX%3ASPY&interval=15");
  });
  it("links an empty timeframe to a fresh zone and hides the hint when stale", () => {
    setup();
    expect(screen.getByRole("button", { name: "Check 15 min" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check 15 min" }));
    expect(screen.getByRole("button", { name: "15 min" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "5 min" }));
    act(() => vi.advanceTimersByTime(91000));
    expect(screen.queryByRole("button", { name: "Check 15 min" })).not.toBeInTheDocument();
  });
  it("receives new posts and later images without a reload", () => {
    const view = setup();
    const next: PulsePost = { ...original, id: "new", at: at + 500, lower: 771, upper: 772, price: 771.2, chartUrl: undefined };
    state.feed = { ...state.feed, quotes: { ...state.feed.quotes, 5: { at: at + 500, price: 771.2, zones: [{ side: "demand", lower: 771, upper: 772 }] } }, posts: [...state.feed.posts, next] };
    view.rerender(<SpxPulseRoom/>);
    expect(screen.getByText("In 5m demand.")).toBeInTheDocument();
    state.feed = { ...state.feed, posts: [...state.feed.posts.slice(0, -1), { ...next, chartUrl: "https://example.com/new.png", capturedAt: at + 900 }] };
    view.rerender(<SpxPulseRoom/>);
    expect(screen.getByAltText(/^Original TradingView/)).toHaveAttribute("src", "https://example.com/new.png");
  });
  it("keeps the last snapshot chart while fresh data is pending, then yields to fresh data", () => {
    const view = setup();
    state.feed.quotes![5] = { ...state.feed.quotes![5]!, chartUrl: "https://example.com/snapshot.png", chartCapturedAt: at };
    act(() => vi.advanceTimersByTime(91000));
    view.rerender(<SpxPulseRoom/>);
    expect(screen.getByAltText(/^Original TradingView SPY 5-minute/)).toHaveAttribute("src", "https://example.com/snapshot.png");
    expect(screen.getByText(/Waiting for fresh 5m data/)).toBeInTheDocument();
    state.feed.quotes![5] = { ...state.feed.quotes![5]!, at: Date.now() };
    view.rerender(<SpxPulseRoom/>);
    expect(screen.getByText("Latest zone · No longer active")).toBeInTheDocument();
    expect(screen.getByAltText(/^Original TradingView SPY 5-minute/)).toHaveAttribute("src", original.chartUrl);
  });
  it("removes the live label when the heartbeat becomes stale", () => {
    setup();
    act(() => vi.advanceTimersByTime(91000));
    expect(screen.queryByText("Live updates")).not.toBeInTheDocument();
    expect(screen.queryByText("Latest zone · No longer active")).not.toBeInTheDocument();
    expect(screen.getByText(/Waiting for fresh 5m data/)).toBeInTheDocument();
  });
  it("explains the closed market without claiming a live capture outage", () => {
    setup();
    act(() => { vi.setSystemTime(new Date("2026-09-26T01:00:00Z")); vi.advanceTimersByTime(1000); });
    expect(screen.getByText("Market closed")).toBeInTheDocument();
    expect(screen.queryByText("Live zone alerts resume during the next trading session.")).not.toBeInTheDocument();
    expect(screen.queryByText(/Chart capture offline/)).not.toBeInTheDocument();
    expect(screen.queryByText("Live updates")).not.toBeInTheDocument();
  });

  it("shows the dated last snapshot after close instead of an obsolete broken-zone card", () => {
    setup();
    act(() => { vi.setSystemTime(new Date("2026-09-26T01:00:00Z")); vi.advanceTimersByTime(1000); });
    expect(screen.getByText("No active 5-minute zone at this update.")).toBeInTheDocument();
    expect(screen.getByText(/Zones · Sep 25, 1:35 PM ET/)).toBeInTheDocument();
    expect(screen.queryByText("5m demand broke. Closed below 770.83.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "15 min" }));
    expect(screen.getByText("$767.70 – $769.78")).toBeInTheDocument();
    expect(screen.queryByText("No active 5-minute zone at this update.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Earlier updates (1)" }));
    expect(screen.getByAltText(/^Original TradingView SPY 15-minute/)).toBeInTheDocument();
  });
  it("shows the matching closing chart inline and opens the original image", () => {
    const view = setup();
    state.feed.quotes![5] = { ...state.feed.quotes![5]!, chartUrl: "https://example.com/closing-5.png", chartCapturedAt: at + 3600000 };
    act(() => { vi.setSystemTime(new Date("2026-09-26T01:00:00Z")); vi.advanceTimersByTime(1000); });
    view.rerender(<SpxPulseRoom/>);
    expect(screen.getByAltText(/^Original TradingView SPY 5-minute/)).toHaveAttribute("src", "https://example.com/closing-5.png");
    expect(screen.getByText(/Captured after the session/)).toBeInTheDocument();
    fireEvent.load(screen.getByAltText(/^Original TradingView SPY 5-minute/));
    fireEvent.click(screen.getByRole("button", { name: "Expand original SPY 5-minute screenshot" }));
    expect(screen.getByAltText(/^Full unmodified screenshot/)).toHaveAttribute("src", "https://example.com/closing-5.png");
  });

});
