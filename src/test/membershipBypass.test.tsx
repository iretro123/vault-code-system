import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  access: { hasAccess: false, loading: false, error: null as unknown, refetch: vi.fn() },
  invoke: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u", email: "a@b.com" }, profile: {}, userRole: null, loading: false, refetchProfile: vi.fn(), signOut: vi.fn() }) }));
vi.mock("@/hooks/useStudentAccess", () => ({ useStudentAccess: () => m.access }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/platform", () => ({ isNativeIOSApp: () => false, isNativeAndroidApp: () => false, isNativeCapacitorApp: () => false }));
vi.mock("@/components/academy/WebMembershipCheckout", () => ({ WebMembershipCheckout: () => <div data-testid="checkout" /> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: m.invoke }, auth: { getUser: vi.fn(), signOut: vi.fn() }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) } }));

import MembershipUpgrade from "@/pages/MembershipUpgrade";
const go = () => render(<MemoryRouter initialEntries={["/membership"]}><Routes>
  <Route path="/membership" element={<MembershipUpgrade />} />
  <Route path="/academy/home" element={<div data-testid="home" />} />
</Routes></MemoryRouter>);
afterEach(() => { cleanup(); m.access.hasAccess = false; m.access.error = null; });

describe("membership page never re-charges confirmed members", () => {
  it("server-confirmed paid member is routed to the academy, no checkout", () => {
    m.access.hasAccess = true;
    go();
    expect(screen.getByTestId("home")).toBeInTheDocument();
    expect(screen.queryByTestId("checkout")).toBeNull();
    expect(m.invoke).not.toHaveBeenCalled();
  });
  it("access check failure shows retry and no-repurchase copy, not checkout", () => {
    m.access.error = new Error("network");
    go();
    expect(screen.getByText(/don't need to purchase again/)).toBeInTheDocument();
    expect(screen.queryByTestId("checkout")).toBeNull();
  });
  it("unpaid web member sees the existing checkout only", () => {
    go();
    expect(screen.getByTestId("checkout")).toBeInTheDocument();
  });
});
