import {afterEach, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {CommunityGuide} from "@/components/academy/community/CommunityGuide";
afterEach(cleanup);
it("connects the learning guide to existing rooms and tools", () => {
  const switchTab = vi.fn();
  render(<MemoryRouter><CommunityGuide onSwitchTab={switchTab}/></MemoryRouter>);
  expect(screen.queryByRole("button", {name:"Economic calendar"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name:"Open Wins"}));
  expect(switchTab).toHaveBeenLastCalledWith("wins");
  expect(screen.getByRole("link", {name:"Set your daily risk limit"}).getAttribute("href")).toBe("/academy/trade");
  expect(screen.getByRole("link", {name:"Find your next class"}).getAttribute("href")).toBe("/academy/live");
});
