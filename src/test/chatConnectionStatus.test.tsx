import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ChatConnectionStatus } from "@/components/academy/community/ChatConnectionStatus";
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
it("does not flash for a momentary reconnect", () => {
 vi.useFakeTimers();
 const view=render(<ChatConnectionStatus reconnecting/>);
 act(()=>vi.advanceTimersByTime(1000));
 view.rerender(<ChatConnectionStatus reconnecting={false}/>);
 act(()=>vi.advanceTimersByTime(4000));
 expect(screen.queryByRole("status")).toBeNull();
});
it("shows sustained failures and clears immediately on recovery", () => {
 vi.useFakeTimers();
 const view=render(<ChatConnectionStatus reconnecting/>);
 act(()=>vi.advanceTimersByTime(5000));
 expect(screen.getByRole("status")).toBeTruthy();
 view.rerender(<ChatConnectionStatus reconnecting={false}/>);
 expect(screen.queryByRole("status")).toBeNull();
});
it("starts a fresh grace period after returning from the background", () => {
 vi.useFakeTimers();
 const visibility=vi.spyOn(document,"visibilityState","get").mockReturnValue("visible");
 render(<ChatConnectionStatus reconnecting/>);
 act(()=>vi.advanceTimersByTime(5000));
 expect(screen.getByRole("status")).toBeTruthy();
 act(()=>{visibility.mockReturnValue("hidden");document.dispatchEvent(new Event("visibilitychange"));});
 act(()=>vi.advanceTimersByTime(30000));
 expect(screen.queryByRole("status")).toBeNull();
 act(()=>{visibility.mockReturnValue("visible");document.dispatchEvent(new Event("visibilitychange"));});
 act(()=>vi.advanceTimersByTime(4999));
 expect(screen.queryByRole("status")).toBeNull();
 act(()=>vi.advanceTimersByTime(1));
 expect(screen.getByRole("status")).toBeTruthy();
});
it("explains a genuine offline state without claiming to be connected", () => {
 vi.spyOn(navigator,"onLine","get").mockReturnValue(false);
 render(<ChatConnectionStatus reconnecting={false}/>);
 expect(screen.getByRole("status").textContent).toContain("You're offline");
});
