import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
      if (device !== "ios") expect(screen.queryByRole("button", { name: "Restore Apple Purchase" })).toBeNull();
    });
  }
});
