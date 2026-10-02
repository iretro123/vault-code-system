// @vitest-environment node
// Adversarial SQL tests for the paid-return claim. Runs the exact applied
// migrations in an in-memory Postgres with a minimal auth schema stand-in.
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import * as h from "./helpers/returnClaimDb";

const root = path.resolve(__dirname, "../..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
const MIGRATIONS = [
  "supabase/migrations/20261002000100_vault_return_onboarding.sql",
  "supabase/migrations/20261002000200_vault_return_onboarding_execute_grants.sql",
  "drizzle/migrations/0002_vault_return_claim_inbox_proof.sql",
].map(read);

const BUYER = "buyer@example.com";
let db: Awaited<ReturnType<typeof h.makeDb>>;
const bound = async () =>
  (await db.query<{ auth_user_id: string | null }>("SELECT auth_user_id FROM public.vault_return_memberships")).rows.map((r) => r.auth_user_id);

describe("paid return claim requires fresh inbox proof", () => {
  beforeEach(async () => { db = await h.makeDb(MIGRATIONS); await h.addPaid(db, BUYER); });

  it("password-only auto-confirmed account cannot claim, even with a forged prep row", async () => {
    const attacker = await h.addUser(db, BUYER);
    const s = await h.addSession(db, attacker, "password");
    await h.prepare(db, s, attacker, BUYER);
    expect(await h.claim(db, attacker, BUYER, s)).toBe(false);
    expect(await bound()).toEqual([null]);
    expect(await h.hasAccess(db, attacker, BUYER, s)).toBe(false);
  });

  it("direct RPC with a fresh email-link session but no server preparation fails", async () => {
    const u = await h.addUser(db, BUYER);
    const s = await h.addSession(db, u, "otp");
    expect(await h.claim(db, u, BUYER, s)).toBe(false);
    expect(await bound()).toEqual([null]);
  });

  it("fresh email-link session prepared by the server succeeds", async () => {
    const u = await h.addUser(db, BUYER);
    const s = await h.addSession(db, u, "otp", 1);
    await h.prepare(db, s, u, BUYER);
    expect(await h.claim(db, u, BUYER, s)).toBe(true);
    expect(await bound()).toEqual([u]);
    expect(await h.hasAccess(db, u, BUYER, s)).toBe(true);
    // proof is single-use
    expect((await db.query("SELECT 1 FROM public.vault_return_claim_proofs")).rows).toHaveLength(0);
  });

  it("wrong email fails", async () => {
    const other = "someone-else@example.com";
    const u = await h.addUser(db, other);
    const s = await h.addSession(db, u, "otp");
    await h.prepare(db, s, u, other);
    expect(await h.claim(db, u, other, s)).toBe(false);
    expect(await bound()).toEqual([null]);
  });

  it("token email that differs from the account email fails", async () => {
    const u = await h.addUser(db, "changed@example.com");
    const s = await h.addSession(db, u, "otp");
    await h.prepare(db, s, u, BUYER);
    expect(await h.claim(db, u, BUYER, s)).toBe(false);
  });

  it("stale email link (older than 15 minutes) fails", async () => {
    const u = await h.addUser(db, BUYER);
    const s = await h.addSession(db, u, "otp", 20);
    await h.prepare(db, s, u, BUYER);
    expect(await h.claim(db, u, BUYER, s)).toBe(false);
  });

  it("stale server preparation fails", async () => {
    const u = await h.addUser(db, BUYER);
    const s = await h.addSession(db, u, "otp");
    await h.prepare(db, s, u, BUYER, 20);
    expect(await h.claim(db, u, BUYER, s)).toBe(false);
  });

  it("a revoked/unknown session id fails", async () => {
    const u = await h.addUser(db, BUYER);
    const s = await h.addSession(db, u, "otp");
    await h.prepare(db, s, u, BUYER);
    expect(await h.claim(db, u, BUYER, crypto.randomUUID())).toBe(false);
  });

  it("an attacker's retained earlier session on the same account does not inherit the membership", async () => {
    const u = await h.addUser(db, BUYER);
    const attackerSession = await h.addSession(db, u, "password", 60);
    const buyerSession = await h.addSession(db, u, "otp", 1);
    await h.prepare(db, buyerSession, u, BUYER);
    expect(await h.claim(db, u, BUYER, buyerSession)).toBe(true);
    expect(await h.hasAccess(db, u, BUYER, attackerSession)).toBe(false);
    expect(await h.hasAccess(db, u, BUYER, buyerSession)).toBe(true);
    // the retained session also cannot re-claim to refresh the bind
    expect(await h.claim(db, u, BUYER, attackerSession)).toBe(true); // idempotent report only
    const row = (await db.query<{ claim_session_id: string }>("SELECT claim_session_id FROM public.vault_return_memberships")).rows[0];
    expect(row.claim_session_id).toBe(buyerSession);
    expect(await h.hasAccess(db, u, BUYER, attackerSession)).toBe(false);
  });

  it("server-side checks (service role, no user JWT) still see the claimed membership", async () => {
    const u = await h.addUser(db, BUYER);
    const s = await h.addSession(db, u, "otp");
    await h.prepare(db, s, u, BUYER);
    await h.claim(db, u, BUYER, s);
    const r = await db.query<{ v: boolean }>("SELECT public.vault_access_for_user($1) AS v", [u]);
    expect(r.rows[0].v).toBe(true);
  });

  it("signed-in members cannot read or forge preparation rows", async () => {
    const u = await h.addUser(db, BUYER);
    const s = await h.addSession(db, u, "otp");
    await expect(h.asUser(db, u, BUYER, s, "SELECT count(*) AS v FROM public.vault_return_claim_proofs")).rejects.toThrow(/permission denied/);
    await expect(h.asUser(db, u, BUYER, s, `INSERT INTO public.vault_return_claim_proofs VALUES ('${s}','${u}','${BUYER}',now()) RETURNING 1 AS v`)).rejects.toThrow(/permission denied/);
    await expect(h.asUser(db, u, BUYER, s, "SELECT public.vault_return_caller_session_ok(gen_random_uuid(),null,now()) AS v")).rejects.toThrow(/permission denied/);
  });

  it("other entitlement sources are unaffected", async () => {
    const u = await h.addUser(db, "whitelisted@example.com");
    await db.query("INSERT INTO public.allowed_signups VALUES ('whitelisted@example.com')");
    const s = await h.addSession(db, u, "password", 600);
    expect(await h.hasAccess(db, u, "whitelisted@example.com", s)).toBe(true);
  });
});
