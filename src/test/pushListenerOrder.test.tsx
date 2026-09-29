import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ listeners: vi.fn(), register: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "member" } }) }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "ios" } }));
vi.mock("@capacitor/push-notifications", () => ({ PushNotifications: { addListener: m.listeners, register: m.register } }));
vi.mock("@/lib/nativeFeedback", () => ({ hapticStrong: vi.fn() }));
vi.mock("@/lib/pushPermission", () => ({
  isNativePushPlatform: () => true,
  getPushPermissionState: async () => "granted",
  getPlatformKey: async () => "ios",
  registerTokenForCurrentUser: vi.fn(),
}));
import { usePushNotifications } from "@/hooks/usePushNotifications";
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("waits for every listener before native token registration", async () => {
  let ready!: (listener: { remove: () => Promise<void> }) => void;
  m.listeners.mockImplementation(() => new Promise(resolve => { ready = resolve; }));
  // Keep one listener pending, with the other three already installed.
  m.listeners.mockResolvedValueOnce({ remove: vi.fn() }).mockResolvedValueOnce({ remove: vi.fn() }).mockResolvedValueOnce({ remove: vi.fn() });
  renderHook(usePushNotifications);
  expect(m.register).not.toHaveBeenCalled();
  await act(async () => { ready({ remove: async () => {} }); });
  await waitFor(() => expect(m.register).toHaveBeenCalledOnce());
});

it("does not register after unmount during listener setup", async () => {
  const resolvers: Array<(listener: { remove: () => Promise<void> }) => void> = [];
  m.listeners.mockImplementation(() => new Promise(resolve => { resolvers.push(resolve); }));
  const { unmount } = renderHook(usePushNotifications);
  unmount();
  const remove = vi.fn().mockResolvedValue(undefined);
  await act(async () => { resolvers.forEach(resolve => resolve({ remove })); });
  expect(remove).toHaveBeenCalledTimes(4);
  expect(m.register).not.toHaveBeenCalled();
});

it('releases successful listeners if another listener fails',async()=>{
 const remove=vi.fn().mockResolvedValue(undefined);
 m.listeners.mockResolvedValue({remove}).mockRejectedValueOnce(new Error('plugin unavailable'));
 renderHook(usePushNotifications);
 await waitFor(()=>expect(remove).toHaveBeenCalledTimes(3));
 expect(m.register).not.toHaveBeenCalled();
});
