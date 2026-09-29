import { describe, expect, it } from "vitest";
import { invoiceSubscriptionId, ownsMembershipEmail, stripeAccessStatus } from "../../supabase/functions/_shared/membershipValidation";

describe("membership recovery identity", () => {
  it("normalizes the verified account email", () => {
    expect(ownsMembershipEmail(" Trader@Example.com ", "trader@example.com")).toBe(true);
  });
  it.each(["another@example.com", "", null, undefined, 42])("rejects a different or invalid billing identity: %s", email => {
    expect(ownsMembershipEmail(email, "trader@example.com")).toBe(false);
  });
  it("requires a verified identity source", () => {
    expect(ownsMembershipEmail("trader@example.com", undefined)).toBe(false);
  });
});

describe("Stripe invoice subscription identity",()=>{
  it("supports legacy invoice events",()=>expect(invoiceSubscriptionId({subscription:"sub_old"})).toBe("sub_old"));
  it("supports Basil invoice parents",()=>expect(invoiceSubscriptionId({parent:{subscription_details:{subscription:"sub_new"}}})).toBe("sub_new"));
  it("supports expanded subscription objects",()=>expect(invoiceSubscriptionId({parent:{subscription_details:{subscription:{id:"sub_expanded"}}}})).toBe("sub_expanded"));
  it("does not treat a one-off invoice as a subscription",()=>expect(invoiceSubscriptionId({})).toBeNull());
});

describe("Stripe entitlement status mapping", () => {
  it.each(["active", "trialing", "past_due", "paused"])("preserves %s", status => {
    expect(stripeAccessStatus(status)).toBe(status);
  });
  it.each(["unpaid", "incomplete_expired", "canceled", "unknown", ""])("fails closed for %s", status => {
    expect(stripeAccessStatus(status)).toBe("canceled");
  });
  it("does not turn incomplete initial payment into renewal grace", () => {
    expect(stripeAccessStatus("incomplete")).toBe("paused");
  });
});
