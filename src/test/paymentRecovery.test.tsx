import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaymentRecoveryScreen } from "@/components/academy/PaymentRecoveryScreen";
import { shouldShowPaymentLock } from "@/hooks/usePaymentLock";
import { deliverRecoveryJob, shouldEnqueueRecovery, RECOVERY_TAG, RECOVERY_URL, type RecoveryStore } from "../../supabase/functions/_shared/paymentRecovery";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), error: vi.fn(), ios: false, android: false }));
vi.mock("@/lib/platform", () => ({ isNativeIOSApp: () => mocks.ios, isNativeAndroidApp: () => mocks.android }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke }, auth: { signOut: vi.fn() } } }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, info: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.ios = false; mocks.android = false; });

describe("payment recovery screen", () => {
  it("shows the required copy and opens only the caller's billing portal", async () => {
    mocks.invoke.mockResolvedValueOnce({ data: { url: "https://billing.example/x" }, error: null });
    const open = vi.spyOn(window, "open").mockReturnValue({} as Window);
    render(<PaymentRecoveryScreen onCheckStatus={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Check your payment details" })).toBeInTheDocument();
    expect(screen.getByText(/Your membership payment is past due\. Update your payment details and complete the outstanding payment to restore access\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Update payment details" }));
    await waitFor(() => expect(open).toHaveBeenCalled());
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenCalledWith("create-billing-portal");
  });
  it("never falls back to checkout when the portal fails", async () => {
    mocks.invoke.mockResolvedValueOnce({ data: { error: "no_stripe_customer" }, error: new Error("404") });
    render(<PaymentRecoveryScreen onCheckStatus={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Update payment details" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.invoke).not.toHaveBeenCalledWith("create-checkout");
    expect(screen.getByRole("button", { name: "Update payment details" })).toBeEnabled();
  });
  it("check payment status refetches", async () => {
    const check = vi.fn().mockResolvedValue(undefined);
    render(<PaymentRecoveryScreen onCheckStatus={check} />);
    fireEvent.click(screen.getByRole("button", { name: "Check payment status" }));
    await waitFor(() => expect(check).toHaveBeenCalledOnce());
  });
  it.each(["ios", "android"] as const)("%s shows web/email directions without a billing button", (p) => {
    mocks[p] = true;
    render(<PaymentRecoveryScreen onCheckStatus={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Update payment details" })).not.toBeInTheDocument();
    expect(screen.getByText(/on the web/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign out/ })).toBeInTheDocument();
  });
  it("lock decision: staff bypass and loading never lock", () => {
    expect(shouldShowPaymentLock({ locked: true, loading: false, isAdminBypass: false })).toBe(true);
    expect(shouldShowPaymentLock({ locked: true, loading: false, isAdminBypass: true })).toBe(false);
    expect(shouldShowPaymentLock({ locked: true, loading: true, isAdminBypass: false })).toBe(false);
    expect(shouldShowPaymentLock({ locked: false, loading: false, isAdminBypass: false })).toBe(false);
  });
});

describe("payment recovery notice", () => {
  const job = { stripe_invoice_id: "in_1", stripe_subscription_id: "sub_1", auth_user_id: "u1", email: "m@example.com", attempts: 1 };
  const env = { enabled: true, ghlKey: "k", locationId: "loc" };
  const store = (locked: boolean): RecoveryStore & { calls: string[] } => {
    const calls: string[] = [];
    return { calls, isStillLocked: async () => locked, markSent: async () => { calls.push("sent"); }, markRetry: async () => { calls.push("retry"); }, markWithheld: async () => { calls.push("withheld"); } };
  };
  it("enqueues only when the re-read subscription is still past_due (replay/out-of-order safe)", () => {
    expect(shouldEnqueueRecovery("invoice.payment_failed", "past_due")).toBe(true);
    expect(shouldEnqueueRecovery("invoice.payment_failed", "active")).toBe(false);
    expect(shouldEnqueueRecovery("invoice.payment_failed", "canceled")).toBe(false);
    expect(shouldEnqueueRecovery("invoice.paid", "past_due")).toBe(false);
  });
  it("withholds without contacting CRM once payment is resolved", async () => {
    const s = store(false); const f = vi.fn();
    expect(await deliverRecoveryJob(s, job, env, f)).toBe("withheld");
    expect(f).not.toHaveBeenCalled();
  });
  it("tags the account email when still locked; CRM failure retries", async () => {
    const ok = vi.fn(async () => new Response(JSON.stringify({ contact: { id: "c1" } }), { status: 200 }));
    const s = store(true);
    expect(await deliverRecoveryJob(s, job, env, ok as unknown as typeof fetch)).toBe("sent");
    expect(JSON.stringify(ok.mock.calls)).toContain(RECOVERY_TAG);
    const bad = vi.fn(async () => new Response("{}", { status: 500 }));
    const s2 = store(true);
    expect(await deliverRecoveryJob(s2, job, env, bad as unknown as typeof fetch)).toBe("retry");
    expect(s2.calls).toEqual(["retry"]);
  });
  it("uses a stable member URL, not a portal session URL", () => {
    expect(RECOVERY_URL).toMatch(/^https:\/\/member\.vaulttradingacademy\.com\//);
    expect(RECOVERY_URL).not.toMatch(/billing\.stripe/);
  });
});
