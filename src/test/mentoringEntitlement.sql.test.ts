// @vitest-environment node
// Real-Postgres checks of the $49 mentoring entitlement schema and RPCs.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import * as h from "./helpers/returnClaimDb";

const root = path.resolve(__dirname, "../..");
const files = readdirSync(path.join(root, "drizzle/migrations")).filter(f => /vault_mentoring_(entitlements|dispatch_hardening)/.test(f)).sort();
const SQL = files.map(f => readFileSync(path.join(root, "drizzle/migrations", f), "utf8")).join("\n");
const P = ["pi_1", "ch_1", "cus_1", "ord_1", "tx_1", "ct_1", "loc", "prod", "price", "Buyer@Example.com", 4900, "usd", true, "et_uri"];
const rec = (db: any, over: Record<number, unknown> = {}) => {
  const a = P.map((v, i) => (i in over ? over[i] : v));
  return db.query("SELECT public.record_vault_mentoring_payment($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) AS r", a);
};
const as = async (db: any, claims: object, sql: string) => {
  await db.exec(`SET request.jwt.claims = '${JSON.stringify(claims)}'; SET ROLE authenticated;`);
  try { return await db.query(sql); } finally { await db.exec("RESET ROLE; RESET request.jwt.claims;"); }
};

let db: Awaited<ReturnType<typeof h.makeDb>>;
describe("mentoring entitlement RPCs", () => {
  beforeEach(async () => { db = await h.makeDb([SQL]); });

  it("records one entitlement + one outbox row; exact and concurrent replays are no-ops", async () => {
    const r = await Promise.all([rec(db), rec(db), rec(db)]);
    expect(r.map(x => x.rows[0].r).sort()).toEqual([false, false, true]);
    const m = (await db.query<any>("SELECT * FROM public.vault_mentoring_entitlements")).rows;
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ email: "buyer@example.com", status: "paid", amount_cents: 4900 });
    expect((await db.query("SELECT 1 FROM public.vault_mentoring_outbox")).rows).toHaveLength(1);
  });

  it.each([[1, "ch_9"], [2, "cus_9"], [4, "tx_9"], [9, "other@x.com"], [3, "ord_9"]])
  ("replay with different proof (arg %i) errors and creates nothing", async (i, v) => {
    await rec(db);
    await expect(rec(db, { [i]: v })).rejects.toThrow(/conflicts/);
    expect((await db.query("SELECT 1 FROM public.vault_mentoring_outbox")).rows).toHaveLength(1);
  });

  it("one order or charge can never back two entitlements", async () => {
    await rec(db);
    await expect(rec(db, { 0: "pi_2", 1: "ch_2", 4: "tx_2" })).rejects.toThrow(/conflicts/);
    await expect(rec(db, { 0: "pi_2", 3: "ord_2", 4: "tx_2" })).rejects.toThrow(/conflicts/);
  });

  it("rejects wrong amount, currency or missing proof", async () => {
    await expect(rec(db, { 10: 4800 })).rejects.toThrow(/incomplete/);
    await expect(rec(db, { 11: "eur" })).rejects.toThrow(/incomplete/);
    await expect(rec(db, { 1: "" })).rejects.toThrow(/incomplete/);
  });

  it("link creation is granted exactly once, even concurrently", async () => {
    await rec(db);
    const id = (await db.query<any>("SELECT id FROM public.vault_mentoring_entitlements")).rows[0].id;
    const r = await Promise.all([1, 2, 3].map(() => db.query<any>("SELECT public.begin_vault_mentoring_link($1) AS ok", [id])));
    expect(r.map(x => x.rows[0].ok).filter(Boolean)).toHaveLength(1);
  });

  it("capacity counts outstanding entitlements only", async () => {
    await rec(db);
    await rec(db, { 0: "pi_2", 1: "ch_2", 3: "ord_2", 4: "tx_2" });
    await db.query("UPDATE public.vault_mentoring_entitlements SET status='booked' WHERE stripe_payment_intent_id='pi_2'");
    expect((await db.query<any>("SELECT public.vault_mentoring_outstanding_count(NULL) AS n")).rows[0].n).toBe(1);
  });

  it("refund withholds the unsent email; replay is a no-op", async () => {
    await rec(db);
    expect((await db.query<any>("SELECT public.mark_vault_mentoring_refunded('pi_1','refund') AS r")).rows[0].r).toBe(true);
    expect((await db.query<any>("SELECT public.mark_vault_mentoring_refunded('pi_1','refund') AS r")).rows[0].r).toBe(false);
    expect((await db.query<any>("SELECT state FROM public.vault_mentoring_outbox")).rows[0].state).toBe("withheld");
  });

  it("members get no table access; booking access binds only with a fresh email-link session", async () => {
    await rec(db);
    await db.query("UPDATE public.vault_mentoring_entitlements SET status='dispatched', calendly_link_url='https://calendly.com/d/x'");
    const uid = await h.addUser(db, "buyer@example.com");
    const pw = await h.addSession(db, uid, "password");
    await expect(as(db, { sub: uid, role: "authenticated" }, "SELECT * FROM public.vault_mentoring_entitlements")).rejects.toThrow();
    expect((await as(db, { sub: uid, role: "authenticated", email: "buyer@example.com", session_id: pw }, "SELECT * FROM public.get_my_vault_mentoring()")).rows).toHaveLength(0);
    const other = await h.addUser(db, "other@example.com");
    const os = await h.addSession(db, other, "otp");
    expect((await as(db, { sub: other, role: "authenticated", email: "other@example.com", session_id: os }, "SELECT * FROM public.get_my_vault_mentoring()")).rows).toHaveLength(0);
    const otp = await h.addSession(db, uid, "otp");
    const rows = (await as(db, { sub: uid, role: "authenticated", email: "buyer@example.com", session_id: otp }, "SELECT * FROM public.get_my_vault_mentoring()")).rows as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].booking_url).toBe("https://calendly.com/d/x");
    await expect(as(db, { sub: uid, role: "authenticated" }, "SELECT public.record_vault_mentoring_payment('a','b','c','d','e','f','g','h','i','j',4900,'usd',true,'k')")).rejects.toThrow();
  });
});
