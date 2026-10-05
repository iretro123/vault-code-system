import { describe, expect, it, vi } from "vitest";
const p = vi.hoisted(() => ({ native: false }));
vi.mock("@/lib/platform", () => ({ isNativeCapacitorApp: () => p.native }));
import { authEmailRedirect } from "@/lib/authRedirect";
describe("auth email redirect", () => {
  it("keeps the browser's own origin on web", () => {
    p.native = false;
    expect(authEmailRedirect("/reset-password")).toBe(`${window.location.origin}/reset-password`);
  });
  it("uses the canonical member site in native apps", () => {
    p.native = true;
    expect(authEmailRedirect("/reset-password")).toBe("https://member.vaulttradingacademy.com/reset-password");
    expect(authEmailRedirect("academy")).toBe("https://member.vaulttradingacademy.com/academy");
  });
});
