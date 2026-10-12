// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

const dir = path.resolve(__dirname, "../../drizzle/migrations");
const sql = readFileSync(path.join(dir, readdirSync(dir).find(f => f.includes("vault_mentoring_scheduler"))!), "utf8");
// Only the token table + consume function (scheduler parts need pg_cron/pg_net, absent locally).
const tokenPart = sql.slice(0, sql.indexOf("-- Mints")) + sql.slice(sql.indexOf("CREATE OR REPLACE FUNCTION public.consume_vault_mentoring_wake"), sql.indexOf("DO $$"));

describe("mentoring wake token", () => {
  it("is single-use, expires after 2 minutes, and is not callable by members", async () => {
    const db = new PGlite();
    await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;");
    await db.exec(tokenPart);
    await db.query("INSERT INTO public.vault_mentoring_wake_tokens(token) VALUES ('a'),('b')");
    await db.query("UPDATE public.vault_mentoring_wake_tokens SET created_at=now()-interval '3 minutes' WHERE token='b'");
    const c = (t: string) => db.query<any>("SELECT public.consume_vault_mentoring_wake($1) AS ok", [t]).then(r => r.rows[0].ok);
    expect(await c("a")).toBe(true);
    expect(await c("a")).toBe(false);
    expect(await c("b")).toBe(false);
    await db.exec("SET ROLE authenticated");
    await expect(c("x")).rejects.toThrow();
  });
});
