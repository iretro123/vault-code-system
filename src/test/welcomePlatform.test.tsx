import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Welcome from "@/pages/Welcome";
const platform = vi.hoisted(() => ({ value: "web" }));
vi.mock("@/lib/platform", () => ({ isNativeIOSApp: () => platform.value === "ios", isNativeAndroidApp: () => platform.value === "android" }));
afterEach(cleanup);
describe("welcome membership entry", () => {
  for (const [device, label] of [["ios", "Restore Apple Purchase"], ["android", "Restore Google Play Purchase"], ["web", "Manage membership"]]) {
    it(`uses the correct store on ${device}`, () => {
      platform.value = device;
      render(<MemoryRouter><Welcome /></MemoryRouter>);
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", "/membership");
      if (device !== "ios") expect(screen.queryByRole("link", { name: "Restore Apple Purchase" })).toBeNull();
    });
  }
  it("separates welcome from plan selection and preserves signup destinations", () => {
    render(<MemoryRouter><Welcome /></MemoryRouter>);
    expect(screen.queryByRole("link", {name:/Get full access/})).not.toBeInTheDocument();
    expect(screen.getByRole("link", {name:/Log in.*Already have a Vault account/})).toHaveAttribute("href", "/auth");
    fireEvent.click(screen.getByRole("button", {name:/Create account.*Your first time here/}));
    expect(screen.getByRole("heading", {name:"Choose your access."})).toHaveFocus();
    expect(screen.getByRole("link", {name:/Join free/})).toHaveAttribute("href", "/create-account");
    expect(screen.getByRole("link", {name:/Get full access/})).toHaveAttribute("href", "/create-account/full");
    expect(screen.getAllByRole("link", {name:"Log in"})[0]).toHaveAttribute("href", "/auth");
    fireEvent.click(screen.getByRole("button", {name:"Back to welcome"}));
    expect(screen.getByRole("button", {name:/Create account/})).toBeInTheDocument();
  });
  it("shows exactly two main welcome actions", () => {
    render(<MemoryRouter><Welcome /></MemoryRouter>);
    const main = document.querySelectorAll(".vault-entry-intro .vault-entry-button");
    expect(main.length).toBe(2);
    expect(screen.queryByText(/Already paid through Stripe/)).toBeNull();
  });
  it("supports directly opening and refreshing the access step", () => {
    render(<MemoryRouter initialEntries={["/welcome?step=access"]}><Welcome /></MemoryRouter>);
    expect(screen.getByRole("heading", {name:"Choose your access."})).toBeInTheDocument();
  });
});
