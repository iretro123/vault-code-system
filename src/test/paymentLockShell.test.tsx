import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  auth: { user: { id: "u1", email: "m@example.com" } as unknown, profile: { profile_completed: true, onboarding_completed: true } as unknown, loading: false, signOut: vi.fn(), refetchProfile: vi.fn() },
  basic: { isBasicTier: false, loading: false },
  access: { status: "active", loading: false, refetch: vi.fn(), isAdminBypass: false, hasAccess: true },
  lock: { state: "unlocked", locked: false, unverified: false, loading: false, refetch: vi.fn() },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => m.auth }));
vi.mock("@/hooks/useIsBasicTier", () => ({ useIsBasicTier: () => m.basic }));
vi.mock("@/hooks/useStudentAccess", () => ({ useStudentAccess: () => m.access }));
vi.mock("@/hooks/usePaymentLock", async (orig) => ({ ...(await orig<object>()), usePaymentLock: () => m.lock }));
vi.mock("@/hooks/useSmartNotifications", () => ({ useSmartNotifications: () => undefined }));
vi.mock("@/hooks/useActivityLog", () => ({ useActivityLog: () => ({ logActivity: vi.fn() }) }));
vi.mock("@/hooks/useOnlineStatus", () => ({ useOnlineStatus: () => true }));
vi.mock("@/hooks/usePresenceHeartbeat", () => ({ usePresenceHeartbeat: () => undefined }));
vi.mock("@/hooks/useSmartRefresh", () => ({ useSmartRefresh: () => undefined }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/components/layout/PlayerIdentity", () => ({ PlayerIdentity: () => <div data-testid="identity" /> }));
vi.mock("@/components/layout/AcademySidebar", () => ({ AcademySidebar: () => <div data-testid="sidebar" /> }));
vi.mock("@/components/layout/MobileNav", () => ({ MobileNav: () => <div data-testid="mobile-nav" /> }));
vi.mock("@/components/academy/CoachDrawer", () => ({ CoachDrawer: () => <div data-testid="coach" /> }));
vi.mock("@/components/academy/NotificationsPanel", () => ({ NotificationsPanel: () => <div data-testid="notif" /> }));
vi.mock("@/components/academy/ReferralModal", () => ({ ReferralModal: () => <div data-testid="referral" /> }));
vi.mock("@/components/academy/NotificationOptInBanner", () => ({ NotificationOptInBanner: () => <div data-testid="optin" /> }));
vi.mock("@/components/academy/PastDueBanner", () => ({ PastDueBanner: () => <div data-testid="pastdue-banner" /> }));
vi.mock("@/components/academy/AccessBlockModal", () => ({ AccessBlockModal: () => <div data-testid="block-modal" /> }));
vi.mock("@/components/onboarding/AppOnboarding", () => ({ AppOnboarding: () => <div data-testid="onboarding" /> }));
vi.mock("@/components/AppLoading", () => ({ AppLoading: () => <div data-testid="loading" /> }));
vi.mock("@/lib/platform", () => ({ isNativeIOSApp: () => false, isNativeAndroidApp: () => false }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() }, auth: { signOut: vi.fn() } } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), info: vi.fn() } }));

import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { BasicTierGate } from "@/components/BasicTierGate";

const shell = (path = "/academy/home") => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/academy" element={<AcademyLayout />}>
        <Route path="home" element={<div data-testid="outlet" />} />
        <Route path="community" element={<div data-testid="outlet" />} />
      </Route>
      <Route path="/basic" element={<BasicTierGate><div data-testid="basic-content" /></BasicTierGate>} />
      <Route path="/welcome" element={<div data-testid="welcome" />} />
    </Routes>
  </MemoryRouter>,
);
const reset = () => {
  m.auth.profile = { profile_completed: true, onboarding_completed: true };
  Object.assign(m.basic, { isBasicTier: false, loading: false });
  Object.assign(m.access, { status: "active", loading: false, isAdminBypass: false });
  Object.assign(m.lock, { state: "unlocked", locked: false, unverified: false, loading: false });
};
const lockOn = () => Object.assign(m.lock, { state: "locked", locked: true });
beforeEach(reset);
afterEach(cleanup);

describe("full shell payment gating", () => {
  it("unlocked paid member sees the shell and page", () => {
    shell();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });
  it("locked member sees only recovery: no sidebar, page, onboarding or banner", () => {
    lockOn();
    m.auth.profile = { profile_completed: false, onboarding_completed: false };
    shell();
    expect(screen.getByRole("heading", { name: "Check your payment details" })).toBeInTheDocument();
    for (const id of ["sidebar", "outlet", "onboarding", "pastdue-banner", "mobile-nav"]) expect(screen.queryByTestId(id)).not.toBeInTheDocument();
  });
  it("locked basic-tier member does not get the free community shell", () => {
    lockOn(); m.basic.isBasicTier = true;
    shell("/academy/community");
    expect(screen.getByRole("heading", { name: "Check your payment details" })).toBeInTheDocument();
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
  });
  it("unlocked basic-tier member still gets free community", () => {
    m.basic.isBasicTier = true;
    shell("/academy/community");
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });
  it("staff bypass keeps the shell", () => {
    lockOn(); m.access.isAdminBypass = true;
    shell();
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });
  it("waits for access and lock decisions before rendering any branch", () => {
    m.access.loading = true;
    shell();
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
    cleanup(); reset(); m.lock.loading = true; m.basic.isBasicTier = true;
    shell("/academy/community");
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
  });
  it("unverified lock (no verified answer yet) shows retry, never content", () => {
    Object.assign(m.lock, { state: "unverified", unverified: true });
    shell();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
  });
  it("basic route gate: locked shows recovery, unverified shows retry, unlocked basic shows content", () => {
    m.basic.isBasicTier = true; lockOn();
    shell("/basic");
    expect(screen.getByRole("heading", { name: "Check your payment details" })).toBeInTheDocument();
    expect(screen.queryByTestId("basic-content")).not.toBeInTheDocument();
    cleanup(); reset(); m.basic.isBasicTier = true; Object.assign(m.lock, { state: "unverified", unverified: true });
    shell("/basic");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    cleanup(); reset(); m.basic.isBasicTier = true;
    shell("/basic");
    expect(screen.getByTestId("basic-content")).toBeInTheDocument();
  });
});
