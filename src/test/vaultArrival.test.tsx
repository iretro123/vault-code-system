import { act, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VaultArrival } from "@/components/onboarding/VaultArrival";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("dashboard arrival", () => {
  it.each([false, true])("automatically enters Home, reduced motion=%s", async reduced => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", () => ({matches: reduced}));
    const complete = vi.fn().mockResolvedValue(undefined);
    render(<VaultArrival name="Alex" avatarUrl={null} onComplete={complete}/>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(complete).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(reduced ? 150 : 2000); });
    expect(complete).toHaveBeenCalledOnce();
  });
  it("cleans up pending navigation on unmount", () => {
    vi.useFakeTimers(); vi.stubGlobal("matchMedia", () => ({matches:false}));
    const complete = vi.fn();
    const {unmount} = render(<VaultArrival name="Alex" avatarUrl={null} onComplete={complete}/>);
    unmount(); vi.advanceTimersByTime(3000);
    expect(complete).not.toHaveBeenCalled();
  });
});
