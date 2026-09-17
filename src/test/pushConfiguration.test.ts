import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ platform: "android", check: vi.fn(), permissions: vi.fn(), register: vi.fn(), request: vi.fn() }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => mocks.platform, isNativePlatform: () => true }, registerPlugin: () => ({ check: mocks.check }) }));
vi.mock("@capacitor/device", () => ({ Device: {} }));
vi.mock("@capacitor/push-notifications", () => ({ PushNotifications: { checkPermissions: mocks.permissions, register: mocks.register, requestPermissions: mocks.request } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { getPushPermissionState, requestPushPermission } from "@/lib/pushPermission";
beforeEach(() => { vi.clearAllMocks(); mocks.platform = "android"; mocks.permissions.mockResolvedValue({ receive: "granted" }); mocks.register.mockResolvedValue(undefined); });
describe("native push configuration", () => {
  it("does not call the crash-prone registration when Firebase is missing", async () => {
    mocks.check.mockResolvedValue({ configured: false });
    expect(await getPushPermissionState()).toBe("unsupported");
    expect(await requestPushPermission()).toBe("unsupported");
    expect(mocks.permissions).not.toHaveBeenCalled();
    expect(mocks.register).not.toHaveBeenCalled();
  });
  it("fails closed on an older native bundle without the availability plugin", async () => {
    mocks.check.mockRejectedValue(Error("not implemented"));
    expect(await requestPushPermission()).toBe("unsupported");
    expect(mocks.register).not.toHaveBeenCalled();
  });
  it("preserves registration when Android Firebase is initialized", async () => {
    mocks.check.mockResolvedValue({ configured: true });
    expect(await requestPushPermission()).toBe("granted");
    expect(mocks.register).toHaveBeenCalledTimes(1);
  });
  it("does not require Android configuration on iOS", async () => {
    mocks.platform = "ios";
    expect(await requestPushPermission()).toBe("granted");
    expect(mocks.check).not.toHaveBeenCalled();
    expect(mocks.register).toHaveBeenCalledTimes(1);
  });
});
