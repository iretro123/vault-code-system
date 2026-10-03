// @vitest-environment node
// Real-Postgres checks of the service-role outbox adapter (CAS lease, lease
// expiry, sent guard, 'infinity' withholding) and of the prepared scheduler SQL.
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as h from "./helpers/returnClaimDb";
import { pgrest } from "./helpers/pgrestShim";
import { attemptImmediateOnboarding, supabaseOutboxStore, WITHHELD_AT } from "../../supabase/functions/_shared/returnOnboarding";

const root = path.resolve(__dirname, "../..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
const MIGRATIONS = [
  "supabase/migrations/20261002000100_vault_return_onboarding.sql",
  "supabase/migrations/20261002000200_vault_return_onboarding_execute_grants.sql",
  "supabase/migrations/20261002000300_vault_return_claim_inbox_proof.sql",
  "supabase/migrations/20261002000400_vault_return_claim_session_strict.sql",
].map(read);
const NET_STUB = `CREATE SCHEMA net; CREATE TABLE net.calls(url text, headers jsonb);
CREATE FUNCTION net.http_post(url text, headers jsonb, body jsonb) RETURNS bigint LANGUAGE sql AS $$ INSERT INTO net.calls VALUES (url, headers) RETURNING 1::bigint $$;`;
const ENV = { enabled: true, ghlKey: "k", locationId: "loc" };
const okCrm = () => vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith("/upsert") ? { contact: { id: "c1" } } : {}), { status: 200 }));

let db: Awaited<ReturnType<typeof h.makeDb>>;
let sub: string;
const row = async () => (await db.query<any>("SELECT state, attempts, locked_until, next_attempt_at::text AS next, last_error FROM public.vault_onboarding_outbox")).rows[0];

describe("service-role outbox adapter on real Postgres", () => {
  beforeEach(async () => { db = await h.makeDb([...MIGRATIONS, NET_STUB, read("docs/vault-return/scheduler.sql")]); sub = await h.addPaid(db, "buyer@example.com"); });

  it("CAS lease: two concurrent leases on the same version, only one wins", async () => {
    const store = supabaseOutboxStore(pgrest(db));
    const job = (await store.getJob(sub))!;
    const [a, b] = await Promise.all([store.tryLease(job, new Date()), store.tryLease(job, new Date())]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(await row()).toMatchObject({ state: "processing", attempts: 1 });
  });

  it("held lease blocks; expired lease can be retaken; sent rows are never leased", async () => {
    const store = supabaseOutboxStore(pgrest(db));
    const leased = (await store.tryLease((await store.getJob(sub))!, new Date()))!;
    expect(await store.tryLease(leased, new Date())).toBeNull();
    expect(await store.tryLease(leased, new Date(Date.now() + 6 * 60_000))).not.toBeNull();
    await store.markSent(sub, new Date());
    const sent = (await store.getJob(sub))!;
    expect(await store.tryLease(sent, new Date(Date.now() + 60 * 60_000))).toBeNull();
    // a late retry write cannot un-send
    await store.markRetry(sub, 1, "late", new Date());
    expect((await row()).state).toBe("sent");
  });

  it("immediate attempt end-to-end sends once; replay is skipped", async () => {
    const store = supabaseOutboxStore(pgrest(db)); const crm = okCrm();
    expect(await attemptImmediateOnboarding(store, sub, ENV, crm as any)).toBe("sent");
    expect(await attemptImmediateOnboarding(store, sub, ENV, crm as any)).toBe("skipped");
    expect(crm).toHaveBeenCalledTimes(2);
    expect((await row()).state).toBe("sent");
  });

  it("CRM failure leaves a pending row the SQL worker claim picks up after backoff", async () => {
    const store = supabaseOutboxStore(pgrest(db));
    expect(await attemptImmediateOnboarding(store, sub, ENV, vi.fn(async () => new Response("{}", { status: 503 })) as any)).toBe("retry");
    const r = await row();
    expect(r.state).toBe("pending"); expect(r.locked_until).toBeNull(); expect(r.last_error).toContain("503");
    expect((await db.query("SELECT * FROM public.claim_vault_onboarding_jobs()")).rows).toHaveLength(0); // backoff not elapsed
    await db.query("UPDATE public.vault_onboarding_outbox SET next_attempt_at = now() - interval '1 second'");
    expect((await db.query("SELECT * FROM public.claim_vault_onboarding_jobs()")).rows).toHaveLength(1);
  });

  it("canceled membership is withheld with 'infinity' and never claimed by worker or wake", async () => {
    await db.query("UPDATE public.vault_return_memberships SET status='canceled'");
    const store = supabaseOutboxStore(pgrest(db)); const crm = okCrm();
    expect(await attemptImmediateOnboarding(store, sub, ENV, crm as any)).toBe("withheld");
    expect(crm).not.toHaveBeenCalled();
    expect((await row()).next).toBe("infinity");
    expect((await store.getJob(sub))!.next_attempt_at).toBe(WITHHELD_AT);
    expect(await attemptImmediateOnboarding(store, sub, ENV, crm as any)).toBe("skipped");
    expect((await db.query("SELECT * FROM public.claim_vault_onboarding_jobs()")).rows).toHaveLength(0);
    await db.query("SELECT public.vault_onboarding_wake()");
    expect((await db.query("SELECT 1 FROM net.calls")).rows).toHaveLength(0);
  });
});

describe("prepared scheduler wake tokens", () => {
  beforeEach(async () => { db = await h.makeDb([...MIGRATIONS, NET_STUB, read("docs/vault-return/scheduler.sql")]); });

  it("no due jobs: no HTTP call and no token", async () => {
    await db.query("SELECT public.vault_onboarding_wake()");
    expect((await db.query("SELECT 1 FROM net.calls")).rows).toHaveLength(0);
    expect((await db.query("SELECT 1 FROM public.vault_onboarding_wake_tokens")).rows).toHaveLength(0);
  });

  it("due job: one call carrying a single-use token that expires", async () => {
    await h.addPaid(db, "buyer@example.com");
    await db.query("SELECT public.vault_onboarding_wake()");
    const calls = (await db.query<{ url: string; headers: any }>("SELECT url, headers FROM net.calls")).rows;
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toMatch(/\/functions\/v1\/sync-vault-onboarding$/);
    const t = calls[0].headers["x-vault-wake"];
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(calls[0].headers)).not.toMatch(/authorization|bearer/i);
    const consume = async (tok: string) => (await db.query<{ v: boolean }>("SELECT public.consume_vault_onboarding_wake($1) AS v", [tok])).rows[0].v;
    expect(await consume(t)).toBe(true);
    expect(await consume(t)).toBe(false); // single use
    await db.query("INSERT INTO public.vault_onboarding_wake_tokens VALUES ('old', now() - interval '3 minutes')");
    expect(await consume("old")).toBe(false); // stale
  });

  it("members and signed-out callers cannot mint, read, or consume tokens", async () => {
    const u = await h.addUser(db, "m@example.com"); const s = await h.addSession(db, u, "password");
    for (const sql of ["SELECT public.vault_onboarding_wake() AS v", "SELECT public.consume_vault_onboarding_wake('x') AS v", "SELECT count(*) AS v FROM public.vault_onboarding_wake_tokens"]) {
      await expect(h.asUser(db, u, "m@example.com", s, sql)).rejects.toThrow(/permission denied/);
    }
  });
});
