import { afterEach, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useCommunityDraft } from "@/hooks/useCommunityDraft";
afterEach(() => { cleanup(); sessionStorage.clear(); });
it("restores a draft after navigation and clears it explicitly after success", () => {
  const first = renderHook(() => useCommunityDraft("member", "trade-floor"));
  act(() => first.result.current[1]("How would you read this chart?"));
  first.unmount();
  const second = renderHook(() => useCommunityDraft("member", "trade-floor"));
  expect(second.result.current[0]).toBe("How would you read this chart?");
  act(() => second.result.current[1](""));
  expect(sessionStorage.length).toBe(0);
});
it("isolates members and rooms", () => {
  const hook = renderHook(({user,room}) => useCommunityDraft(user,room), {initialProps:{user:"one",room:"trade-floor"}});
  act(() => hook.result.current[1]("private draft"));
  hook.rerender({user:"two",room:"trade-floor"});
  expect(hook.result.current[0]).toBe("");
  hook.rerender({user:"one",room:"wins-proof"});
  expect(hook.result.current[0]).toBe("");
  hook.rerender({user:"one",room:"trade-floor"});
  expect(hook.result.current[0]).toBe("private draft");
});
