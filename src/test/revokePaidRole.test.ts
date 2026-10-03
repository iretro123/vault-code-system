// @vitest-environment node
import { describe, expect, it } from "vitest";
import { revokePaidRole } from "../../supabase/functions/_shared/vaultAccess";

type Op = { table: string; op: string };
/** Chainable fake: every terminal await resolves to the result chosen by `pick`. */
function fakeDb(pick: (o: Op) => { data?: unknown; error?: unknown }, rpc = { data: false, error: null as unknown }) {
  const ops: Op[] = [];
  const from = (table: string) => {
    let op = "select";
    const chain: any = {
      select: () => chain, eq: () => chain, in: () => chain, not: () => chain, limit: () => chain, maybeSingle: () => chain,
      delete: () => { op = "delete"; return chain; },
      update: () => { op = "update"; return chain; },
      insert: () => { op = "insert"; return chain; },
      then: (res: any, rej: any) => { const o = { table, op }; ops.push(o); return Promise.resolve(pick(o)).then(res, rej); },
    };
    return chain;
  };
  return { db: { from, rpc: async () => rpc }, ops };
}
const ok = (o: Op) => (o.op === "select" ? { data: o.table === "user_roles" ? [] : null, error: null } : { error: null });
const fail = (table: string, op: string) => (o: Op) => (o.table === table && o.op === op ? { error: new Error(`${table} ${op} failed`) } : ok(o));

describe("revokePaidRole write errors", () => {
  it("succeeds and reports true when every write succeeds", async () => {
    const { db, ops } = fakeDb(ok);
    await expect(revokePaidRole(db, { authUserId: "u1" })).resolves.toBe(true);
    expect(ops.map(o => `${o.table}.${o.op}`)).toEqual(["user_roles.select", "user_roles.delete", "user_roles.select", "user_roles.insert", "profiles.update"]);
  });

  it.each([["user_roles", "delete"], ["user_roles", "insert"], ["profiles", "update"]])("%s %s failure throws instead of reporting removed", async (t, op) => {
    const { db } = fakeDb(fail(t, op));
    await expect(revokePaidRole(db, { authUserId: "u1" })).rejects.toThrow(`${t} ${op} failed`);
  });

  it("basic_tier update failure throws", async () => {
    let n = 0;
    const { db } = fakeDb(o => {
      if (o.table === "user_roles" && o.op === "select") return n++ === 0 ? { data: [], error: null } : { data: { id: "b1" }, error: null };
      if (o.op === "update" && o.table === "user_roles") return { error: new Error("basic update failed") };
      return ok(o);
    });
    await expect(revokePaidRole(db, { authUserId: "u1" })).rejects.toThrow("basic update failed");
  });

  it("staff lookup error throws and never deletes", async () => {
    const { db, ops } = fakeDb(o => (o.op === "select" ? { data: null, error: new Error("read failed") } : ok(o)));
    await expect(revokePaidRole(db, { authUserId: "u1" })).rejects.toThrow("read failed");
    expect(ops.some(o => o.op === "delete")).toBe(false);
  });

  it("staff with several staff roles is never revoked", async () => {
    const { db, ops } = fakeDb(o => (o.op === "select" ? { data: [{ id: "a" }, { id: "b" }], error: null } : ok(o)));
    await expect(revokePaidRole(db, { authUserId: "u1" })).resolves.toBe(false);
    expect(ops.some(o => o.op === "delete")).toBe(false);
  });

  it("entitlement check error throws; other valid entitlement keeps the role", async () => {
    await expect(revokePaidRole(fakeDb(ok, { data: false, error: new Error("rpc down") }).db, { authUserId: "u1" })).rejects.toThrow("rpc down");
    const kept = fakeDb(ok, { data: true, error: null });
    await expect(revokePaidRole(kept.db, { authUserId: "u1" })).resolves.toBe(false);
    expect(kept.ops.some(o => o.op === "delete")).toBe(false);
  });
});
