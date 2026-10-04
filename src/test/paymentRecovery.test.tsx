import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaymentRecoveryScreen } from "@/components/academy/PaymentRecoveryScreen";
import { shouldShowPaymentLock } from "@/hooks/usePaymentLock";
import { deliverRecoveryJob, recoveryReady, recoveryWorkflowPublished, shouldEnqueueClear, shouldEnqueueRecovery, RECOVERY_TAG, RECOVERY_URL, type RecoveryStore } from "../../supabase/functions/_shared/paymentRecovery";
import { unknownPriceReconcileTarget } from "../../supabase/functions/_shared/legacyReconcile";

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
  const env = { enabled: true, ghlKey: "k", locationId: "loc", workflowId: "wf1" };
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

  const crm = (tagStatus = 200) => vi.fn(async (_u: string, init?: RequestInit) =>
    String(_u).endsWith("/tags") ? new Response("{}", { status: tagStatus }) : new Response(JSON.stringify({ contact: { id: "c1" } }), { status: 200 }));
  it("notify only ADDS the tag (idempotent); never deletes first", async () => {
    const f = crm();
    await deliverRecoveryJob(store(true), job, env, f as unknown as typeof fetch);
    const methods = f.mock.calls.map(([, i]) => (i as RequestInit).method);
    expect(methods).toEqual(["POST", "POST"]);
  });
  it("CRM success + DB ack failure is NOT rescheduled (no resend loop)", async () => {
    const s = store(true); s.markSent = async () => { throw new Error("db down"); };
    expect(await deliverRecoveryJob(s, job, env, crm() as unknown as typeof fetch)).toBe("unacknowledged");
    expect(s.calls).toEqual([]);
  });
  it("clear job removes the tag only after payment is restored; removal errors retry", async () => {
    const clear = { ...job, stripe_invoice_id: "clear:in_2", kind: "clear" as const };
    const s1 = store(true);
    expect(await deliverRecoveryJob(s1, clear, env, crm() as unknown as typeof fetch)).toBe("withheld");
    const f = crm(500); const s2 = store(false);
    expect(await deliverRecoveryJob(s2, clear, env, f as unknown as typeof fetch)).toBe("retry");
    expect((f.mock.calls[1][1] as RequestInit).method).toBe("DELETE");
    expect(s2.calls).toEqual(["retry"]);
    expect(await deliverRecoveryJob(store(false), clear, env, crm() as unknown as typeof fetch)).toBe("sent");
  });
  it("clear is enqueued only for paid invoices with an active re-read subscription", () => {
    expect(shouldEnqueueClear("invoice.paid", "active")).toBe(true);
    expect(shouldEnqueueClear("invoice.paid", "past_due")).toBe(false);
    expect(shouldEnqueueClear("invoice.payment_failed", "active")).toBe(false);
  });
  it("requires a configured, existing, published workflow before enabling", async () => {
    expect(recoveryReady({ ...env, workflowId: "" })).toBe(false);
    const list = (wf: unknown[]) => vi.fn(async () => new Response(JSON.stringify({ workflows: wf }), { status: 200 })) as unknown as typeof fetch;
    expect(await recoveryWorkflowPublished(env, list([{ id: "wf1", status: "published" }]))).toBe(true);
    expect(await recoveryWorkflowPublished(env, list([{ id: "wf1", status: "draft" }]))).toBe(false);
    expect(await recoveryWorkflowPublished(env, list([{ id: "other", status: "published" }]))).toBe(false);
    expect(await recoveryWorkflowPublished(env, vi.fn(async () => new Response("", { status: 401 })) as unknown as typeof fetch)).toBe(false);
  });
});

describe("unknown legacy price reconciliation", () => {
  const row = { user_id: "st1", product_key: "vault_academy", tier: "elite_v1", status: "active", stripe_subscription_id: "sub_1", stripe_customer_id: "cus_1" };
  it("reconciles only an existing row bound to the same subscription, customer and Vault product", () => {
    expect(unknownPriceReconcileTarget([row], { id: "sub_1", customer: "cus_1" })).toEqual(row);
    expect(unknownPriceReconcileTarget([row], { id: "sub_1", customer: "cus_other" })).toBeNull();
    expect(unknownPriceReconcileTarget([row], { id: "sub_2", customer: "cus_1" })).toBeNull();
    expect(unknownPriceReconcileTarget([{ ...row, product_key: "other" }], { id: "sub_1", customer: "cus_1" })).toBeNull();
  });
  it("never maps an unknown price for a new/unbound user and fails closed on ambiguity", () => {
    expect(unknownPriceReconcileTarget([], { id: "sub_1", customer: "cus_1" })).toBeNull();
    expect(unknownPriceReconcileTarget([row, { ...row, user_id: "st2" }], { id: "sub_1", customer: "cus_1" })).toBeNull();
  });
});

import { recoveryWorkflowStatus } from "../../supabase/functions/_shared/paymentRecovery";
describe("recovery workflow status reasons", () => {
  const env = { enabled: true, ghlKey: "k", locationId: "loc", workflowId: "wf1" };
  const list = (w: unknown[]) => (async () => new Response(JSON.stringify({ workflows: w }), { status: 200 })) as unknown as typeof fetch;
  it("reports actionable, secret-free reasons", async () => {
    expect((await recoveryWorkflowStatus(env, list([{ id: "wf1", status: "published" }]))).ok).toBe(true);
    expect((await recoveryWorkflowStatus(env, list([{ id: "wf1", status: "draft" }]))).reason).toContain("draft");
    expect((await recoveryWorkflowStatus(env, list([]))).reason).toContain("not found");
    const r = await recoveryWorkflowStatus(env, (async () => new Response("", { status: 403 })) as unknown as typeof fetch);
    expect(r.reason).toContain("403");
    expect(r.reason).not.toContain("k ");
  });
});
