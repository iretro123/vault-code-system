import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ChatConnectionStatus } from "@/components/academy/community/ChatConnectionStatus";
afterEach(() => { cleanup(); vi.useRealTimers(); });
it("does not flash for a momentary reconnect", () => {
 vi.useFakeTimers();
 const view=render(<ChatConnectionStatus reconnecting/>);
 act(()=>vi.advanceTimersByTime(1000));
 view.rerender(<ChatConnectionStatus reconnecting={false}/>);
 act(()=>vi.advanceTimersByTime(4000));
 expect(screen.queryByRole("status")).toBeNull();
});
it("keeps the warning stable until recovery persists", () => {
 vi.useFakeTimers();
 const view=render(<ChatConnectionStatus reconnecting/>);
 act(()=>vi.advanceTimersByTime(1500));
 expect(screen.getByRole("status")).toBeTruthy();
 view.rerender(<ChatConnectionStatus reconnecting={false}/>);
 act(()=>vi.advanceTimersByTime(1000));
 view.rerender(<ChatConnectionStatus reconnecting/>);
 expect(screen.getByRole("status")).toBeTruthy();
 view.rerender(<ChatConnectionStatus reconnecting={false}/>);
 act(()=>vi.advanceTimersByTime(3000));
 expect(screen.queryByRole("status")).toBeNull();
});
