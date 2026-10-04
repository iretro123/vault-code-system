// @vitest-environment node
// SQL tests for the staged past-due payment lock against the applied access functions.
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import * as h from "./helpers/returnClaimDb";

const root = path.resolve(__dirname, "../..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
const BASE = [
  "supabase/migrations/20261002000100_vault_return_onboarding.sql",
  "supabase/migrations/20261002000200_vault_return_onboarding_execute_grants.sql",
  "drizzle/migrations/0002_vault_return_claim_inbox_proof.sql",
  "drizzle/migrations/0003_vault_return_claim_session_strict.sql",
].map(read);
const PREP = `ALTER TABLE public.student_access ADD COLUMN IF NOT EXISTS is_lifetime boolean DEFAULT false;
ALTER TABLE public.allowed_signups ADD COLUMN IF NOT EXISTS stripe_customer_id text;
CREATE TABLE public.free_room(id int, room text);
INSERT INTO public.free_room VALUES (1,'trade-floor');
GRANT SELECT ON public.free_room TO authenticated;
ALTER TABLE public.free_room ENABLE ROW LEVEL SECURITY;
CREATE POLICY f ON public.free_room FOR SELECT TO authenticated USING (true);`;
const POLICY = `CREATE FUNCTION public.has_current_full_access() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT public.vault_access_for_user(auth.uid()) $$;
GRANT EXECUTE ON FUNCTION public.has_current_full_access() TO authenticated;
CREATE POLICY boundary ON public.free_room AS RESTRICTIVE FOR SELECT TO authenticated USING (public.has_current_full_access() OR public.can_use_free_community());`;
const LOCK = read("scripts/release/payment-past-due-lock.sql");

let db: Awaited<ReturnType<typeof h.makeDb>>;
const as = <T,>(u: string, s: string, sql: string) => h.asUser<T>(db, u, "m@example.com", s, sql);
const locked = (u: string, s: string) => as<boolean>(u, s, "SELECT public.get_my_payment_lock() AS v");
const freeRows = (u: string, s: string) => as<number>(u, s, "SELECT count(*)::int AS v FROM public.free_room");
async function stripeMember(status: string, product = "vault_os") {
  const u = await h.addUser(db, "m@example.com");
  const s = await h.addSession(db, u, "password");
  const sid = h.uid();
  await db.query("INSERT INTO public.students VALUES ($1,$2)", [sid, u]);
  await db.query("INSERT INTO public.student_access(user_id,status,product_key,stripe_subscription_id,stripe_customer_id) VALUES ($1,$2,$3,'sub_1','cus_1')", [sid, status, product]);
  return { u, s, sid };
}
const setStatus = (sid: string, st: string, sub = "sub_1") => db.query("UPDATE public.student_access SET status=$2 WHERE user_id=$1 AND stripe_subscription_id=$3", [sid, st, sub]);

describe("past-due payment lock", () => {
  beforeEach(async () => { db = await h.makeDb([...BASE, PREP, LOCK, POLICY]); });

  it("active -> past_due locks everything (including free rooms) -> active restores", async () => {
    const { u, s, sid } = await stripeMember("active");
    expect(await locked(u, s)).toBe(false);
    expect(await freeRows(u, s)).toBe(1);
    await setStatus(sid, "past_due");
    expect(await locked(u, s)).toBe(true);
    expect(await freeRows(u, s)).toBe(0);
    expect(await h.hasAccess(db, u, "m@example.com", s)).toBe(false);
    await setStatus(sid, "active");
    expect(await locked(u, s)).toBe(false);
    expect(await freeRows(u, s)).toBe(1);
  });

  it("legacy vault_academy past_due also locks", async () => {
    const { u, s } = await stripeMember("past_due", "vault_academy");
    expect(await locked(u, s)).toBe(true);
  });

  it("free/basic account without a past-due membership keeps free areas", async () => {
    const u = await h.addUser(db, "free@example.com");
    const s = await h.addSession(db, u, "password");
    expect(await locked(u, s)).toBe(false);
    expect(await freeRows(u, s)).toBe(1);
  });

  it("canceled (not past_due) falls back to Free Basic, not the lock", async () => {
    const { u, s } = await stripeMember("canceled");
    expect(await locked(u, s)).toBe(false);
    expect(await freeRows(u, s)).toBe(1);
  });

  it("a second valid subscription preserves access", async () => {
    const { u, s, sid } = await stripeMember("past_due");
    await db.query("INSERT INTO public.student_access(user_id,status,product_key,stripe_subscription_id,stripe_customer_id) VALUES ($1,'active','vault_os','sub_2','cus_1')", [sid]);
    expect(await locked(u, s)).toBe(false);
    expect(await h.hasAccess(db, u, "m@example.com", s)).toBe(true);
  });

  it("staff and whitelist access are preserved", async () => {
    const a = await stripeMember("past_due");
    await db.query("INSERT INTO public.user_roles VALUES ($1,'operator')", [a.u]);
    expect(await locked(a.u, a.s)).toBe(false);
    await db.query("DELETE FROM public.user_roles");
    await db.query("INSERT INTO public.allowed_signups VALUES ('m@example.com')");
    expect(await locked(a.u, a.s)).toBe(false);
  });

  it("lifetime rows never lock", async () => {
    const { u, s, sid } = await stripeMember("past_due");
    await db.query("UPDATE public.student_access SET is_lifetime=true WHERE user_id=$1", [sid]);
    expect(await locked(u, s)).toBe(false);
  });

  it("claimed return membership past_due locks", async () => {
    const u = await h.addUser(db, "r@example.com");
    const s = await h.addSession(db, u, "otp");
    await db.query("INSERT INTO public.vault_return_memberships(stripe_subscription_id,checkout_session_id,stripe_customer_id,email,auth_user_id,status,paid_at,access_until,claimed_at,claim_session_id) VALUES ('sub_r','cs_r','cus_r','r@example.com',$1,'past_due',now(),now()+interval '10 days',now(),$2)", [u, s]);
    expect(await locked(u, s)).toBe(true);
  });

  it("lock helper and recovery queue are not callable by members", async () => {
    const { u, s } = await stripeMember("past_due");
    await expect(as(u, s, `SELECT public.vault_payment_locked('${u}') AS v`)).rejects.toThrow();
    await expect(as(u, s, "SELECT count(*) AS v FROM public.vault_payment_recovery_outbox")).rejects.toThrow();
    await expect(as(u, s, "SELECT count(*) AS v FROM public.claim_vault_payment_recovery_jobs()")).rejects.toThrow();
  });

  it("recovery queue dedupes per invoice and claims once", async () => {
    await db.query("INSERT INTO public.vault_payment_recovery_outbox(stripe_invoice_id,stripe_subscription_id,email) VALUES ('in_1','sub_1','m@example.com') ON CONFLICT DO NOTHING");
    await db.query("INSERT INTO public.vault_payment_recovery_outbox(stripe_invoice_id,stripe_subscription_id,email) VALUES ('in_1','sub_1','m@example.com') ON CONFLICT DO NOTHING");
    expect((await db.query("SELECT * FROM public.claim_vault_payment_recovery_jobs()")).rows.length).toBe(1);
    expect((await db.query("SELECT * FROM public.claim_vault_payment_recovery_jobs()")).rows.length).toBe(0);
  });

  it("Stripe-linked allowlist is admission only: past-due member is locked (Meghan case)", async () => {
    const { u, s, sid } = await stripeMember("active", "vault_academy");
    await db.query("INSERT INTO public.allowed_signups(email,stripe_customer_id) VALUES ('m@example.com','cus_1')");
    expect(await h.hasAccess(db, u, "m@example.com", s)).toBe(true); // via the Stripe row
    await setStatus(sid, "past_due");
    expect(await h.hasAccess(db, u, "m@example.com", s)).toBe(false);
    expect(await locked(u, s)).toBe(true);
    expect(await freeRows(u, s)).toBe(0);
  });

  it("explicit non-Stripe complimentary allowlist keeps access even with a past-due row", async () => {
    const { u, s } = await stripeMember("past_due");
    await db.query("INSERT INTO public.allowed_signups(email,stripe_customer_id) VALUES ('m@example.com',null)");
    expect(await h.hasAccess(db, u, "m@example.com", s)).toBe(true);
    expect(await locked(u, s)).toBe(false);
  });

  it("Stripe-linked allowlist without any paid row grants no paid access", async () => {
    const u = await h.addUser(db, "m@example.com");
    const s = await h.addSession(db, u, "password");
    await db.query("INSERT INTO public.allowed_signups(email,stripe_customer_id) VALUES ('m@example.com','cus_1')");
    expect(await h.hasAccess(db, u, "m@example.com", s)).toBe(false);
    expect(await locked(u, s)).toBe(false);
    expect(await freeRows(u, s)).toBe(1);
  });
});
