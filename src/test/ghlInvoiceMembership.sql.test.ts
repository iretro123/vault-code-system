// @vitest-environment node
// Real-Postgres checks of the GHL invoice membership RPC on top of the existing return schema.
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import * as h from "./helpers/returnClaimDb";

const root = path.resolve(__dirname, "../..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
const MIGRATIONS = [
  "supabase/migrations/20261002000100_vault_return_onboarding.sql",
  "supabase/migrations/20261002000200_vault_return_onboarding_execute_grants.sql",
  "supabase/migrations/20261002000300_vault_return_claim_inbox_proof.sql",
  "supabase/migrations/20261002000400_vault_return_claim_session_strict.sql",
  "drizzle/migrations/0008_vault_ghl_invoice_membership.sql",
  "drizzle/migrations/0009_vault_ghl_invoice_proof_hardening.sql",
].map(read);
const rec = (db: any, sub: string, inv: string, pi: string, status = "trialing", email = "Buyer@Example.com", cus = "cus_1") =>
  db.query("SELECT public.record_vault_ghl_invoice_payment($1,$2,$3,$6,$4,$5,now()+interval '30 days','price_x','loc','ord') AS r", [sub, inv, pi, email, status, cus]);

let db: Awaited<ReturnType<typeof h.makeDb>>;
describe("GHL invoice membership RPC", () => {
  beforeEach(async () => { db = await h.makeDb(MIGRATIONS); });

  it("records membership + one welcome outbox row with truthful proof and no checkout id", async () => {
    expect((await rec(db, "sub_1", "in_1", "pi_1")).rows[0].r).toBe(true);
    const m = (await db.query<any>("SELECT * FROM public.vault_return_memberships")).rows[0];
    expect(m).toMatchObject({ source: "ghl_native_invoice", checkout_session_id: null, stripe_invoice_id: "in_1", stripe_payment_intent_id: "pi_1", email: "buyer@example.com", intro_amount_cents: 199 });
    expect((await db.query("SELECT * FROM public.vault_onboarding_outbox")).rows).toHaveLength(1);
  });

  it("replay and concurrent deliveries create exactly one membership and one welcome", async () => {
    const results = await Promise.all([rec(db, "sub_1", "in_1", "pi_1"), rec(db, "sub_1", "in_1", "pi_1")]);
    expect(results.map(r => r.rows[0].r).sort()).toEqual([false, true]);
    expect((await db.query("SELECT 1 FROM public.vault_return_memberships")).rows).toHaveLength(1);
    expect((await db.query("SELECT 1 FROM public.vault_onboarding_outbox")).rows).toHaveLength(1);
  });

  it("replay never resurrects a canceled membership", async () => {
    await rec(db, "sub_1", "in_1", "pi_1");
    await db.query("UPDATE public.vault_return_memberships SET status='canceled'");
    await rec(db, "sub_1", "in_1", "pi_1", "trialing");
    expect((await db.query<any>("SELECT status FROM public.vault_return_memberships")).rows[0].status).toBe("canceled");
  });

  it("an invoice or PaymentIntent cannot be reused for another subscription", async () => {
    await rec(db, "sub_1", "in_1", "pi_1");
    await expect(rec(db, "sub_2", "in_1", "pi_2")).rejects.toThrow();
    await expect(rec(db, "sub_3", "in_3", "pi_1")).rejects.toThrow();
  });

  it.each([
    ["different invoice", ["sub_1", "in_9", "pi_1"]],
    ["different PaymentIntent", ["sub_1", "in_1", "pi_9"]],
    ["different customer", ["sub_1", "in_1", "pi_1", "trialing", "Buyer@Example.com", "cus_9"]],
    ["different email", ["sub_1", "in_1", "pi_1", "trialing", "other@example.com"]],
  ])("same subscription with %s proof errors and leaves one consistent outbox row", async (_n, args: any) => {
    await rec(db, "sub_1", "in_1", "pi_1");
    await expect((rec as any)(db, ...args)).rejects.toThrow(/conflicts/);
    expect((await db.query<any>("SELECT email FROM public.vault_onboarding_outbox")).rows).toEqual([{ email: "buyer@example.com" }]);
  });

  it("same subscription already owned by the payment-link path cannot be overwritten", async () => {
    const sub = await h.addPaid(db, "buyer@example.com");
    await expect(rec(db, sub, "in_1", "pi_1")).rejects.toThrow(/conflicts/);
  });

  it("CHECK rejects a GHL row with NULL intro amount", async () => {
    await expect(db.query("INSERT INTO public.vault_return_memberships(stripe_subscription_id,stripe_customer_id,email,status,access_until,source,stripe_invoice_id,stripe_payment_intent_id,stripe_price_id,ghl_location_id,intro_amount_cents) VALUES('s','c','e','trialing',now()+interval '1 day','ghl_native_invoice','i','p','pr','l',NULL)")).rejects.toThrow();
  });

  it("refuses non-usable status or missing proof", async () => {
    await expect(rec(db, "sub_1", "in_1", "pi_1", "past_due")).rejects.toThrow();
    await expect(rec(db, "sub_1", "", "pi_1")).rejects.toThrow();
    expect((await db.query("SELECT 1 FROM public.vault_return_memberships")).rows).toHaveLength(0);
  });

  it("legacy payment-link path still works and must keep its checkout id", async () => {
    const sub = await h.addPaid(db, "old@example.com");
    expect((await db.query<any>("SELECT source, checkout_session_id FROM public.vault_return_memberships WHERE stripe_subscription_id=$1", [sub])).rows[0]).toMatchObject({ source: "stripe_payment_link", checkout_session_id: "cs_" + sub });
    await expect(db.query("INSERT INTO public.vault_return_memberships(stripe_subscription_id,stripe_customer_id,email,status,access_until) VALUES('s9','c','e','active',now()+interval '1 day')")).rejects.toThrow();
  });

  it("only service_role may execute the RPC", async () => {
    const r = (await db.query<any>("SELECT has_function_privilege('authenticated', 'public.record_vault_ghl_invoice_payment(text,text,text,text,text,text,timestamptz,text,text,text)', 'EXECUTE') a, has_function_privilege('anon', 'public.record_vault_ghl_invoice_payment(text,text,text,text,text,text,timestamptz,text,text,text)', 'EXECUTE') b, has_function_privilege('service_role', 'public.record_vault_ghl_invoice_payment(text,text,text,text,text,text,timestamptz,text,text,text)', 'EXECUTE') c")).rows[0];
    expect(r).toEqual({ a: false, b: false, c: true });
  });
});
