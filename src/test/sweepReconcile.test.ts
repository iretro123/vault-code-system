import { describe, it, expect } from "vitest";
import { complimentaryAllowlistEmails, sweepSubscriptionBound } from "../../supabase/functions/_shared/legacyReconcile";
import { stripeAccessStatus } from "../../supabase/functions/_shared/membershipValidation";

describe("sweep legacy reconciliation", () => {
  it("Stripe-linked allowlist rows are not protected from the sweep", () => {
    const set = complimentaryAllowlistEmails([
      { email: "Meghan@x.com", stripe_customer_id: "cus_1" },
      { email: " Comp@x.com ", stripe_customer_id: null },
    ]);
    expect(set.has("meghan@x.com")).toBe(false);
    expect(set.has("comp@x.com")).toBe(true);
  });
  it("legacy price sub bound to same customer+sub reconciles to past_due regardless of price", () => {
    const row = { stripe_subscription_id: "sub_1" };
    const sub = { id: "sub_1", customer: "cus_1", items: { data: [{ price: { id: "price_unknown" } }] } };
    expect(sweepSubscriptionBound(row, "cus_1", sub)).toBe(true);
    expect(stripeAccessStatus("past_due")).toBe("past_due");
  });
  it("rejects subscriptions owned by another customer or a different stored subscription", () => {
    expect(sweepSubscriptionBound({ stripe_subscription_id: "sub_1" }, "cus_1", { id: "sub_1", customer: "cus_2" })).toBe(false);
    expect(sweepSubscriptionBound({ stripe_subscription_id: "sub_1" }, "cus_1", { id: "sub_9", customer: { id: "cus_1" } })).toBe(false);
    expect(sweepSubscriptionBound({ stripe_subscription_id: null }, "cus_1", { id: "sub_9", customer: "cus_1" })).toBe(true);
  });
  it("unpaid/incomplete never become active", () => {
    expect(stripeAccessStatus("unpaid")).toBe("canceled");
    expect(stripeAccessStatus("incomplete")).toBe("paused");
  });
});
