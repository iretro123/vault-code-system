import type { PGlite } from "@electric-sql/pglite";
// Minimal PostgREST-equivalent query builder over PGlite for the exact subset the
// onboarding adapter uses (select/update + eq/neq/or(is.null,lt) + maybeSingle).
// Each statement runs as ONE SQL statement, like a PostgREST request, so
// conditional UPDATE ... RETURNING keeps real compare-and-set semantics.
type Filter = { sql: string; vals: unknown[] };
const parseOr = (expr: string): Filter => {
  const parts = expr.split(",").map((p) => {
    const [col, op, ...rest] = p.split(".");
    const val = rest.join(".");
    if (op === "is" && val === "null") return { sql: `${col} IS NULL`, vals: [] };
    if (op === "lt") return { sql: `${col} < $?`, vals: [val] };
    throw new Error(`unsupported or-filter ${p}`);
  });
  return { sql: `(${parts.map((p) => p.sql).join(" OR ")})`, vals: parts.flatMap((p) => p.vals) };
};

export function pgrest(db: PGlite) {
  return {
    from(table: string) {
      let mode: "select" | "update" = "select";
      let cols = "*"; let patch: Record<string, unknown> = {}; let returning: string | null = null; let single = false;
      const filters: Filter[] = [];
      const b: any = {
        select(c = "*") { if (mode === "update") returning = c; else cols = c; return b; },
        update(p: Record<string, unknown>) { mode = "update"; patch = p; return b; },
        eq(c: string, v: unknown) { filters.push({ sql: `${c} = $?`, vals: [v] }); return b; },
        neq(c: string, v: unknown) { filters.push({ sql: `${c} <> $?`, vals: [v] }); return b; },
        or(e: string) { filters.push(parseOr(e)); return b; },
        maybeSingle() { single = true; return b; },
        async then(res: (v: unknown) => void, rej: (e: unknown) => void) {
          try {
            const vals: unknown[] = []; let n = 0;
            const bind = (s: string, vs: unknown[]) => s.replace(/\$\?/g, () => { vals.push(vs[n++ % vs.length]); return `$${vals.length}`; });
            const where = filters.length ? " WHERE " + filters.map((f) => { n = 0; return bind(f.sql, f.vals); }).join(" AND ") : "";
            let sql: string;
            if (mode === "update") {
              const set = Object.entries(patch).map(([k, v]) => { vals.push(v); return `${k} = $${vals.length}`; }).join(", ");
              sql = `UPDATE public.${table} SET ${set}${where}${returning ? ` RETURNING ${returning}` : ""}`;
            } else sql = `SELECT ${cols} FROM public.${table}${where}`;
            const r = await db.query<Record<string, unknown>>(sql, vals);
            const rows = r.rows.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v instanceof Date ? (Number.isFinite(v.getTime()) ? v.toISOString() : "infinity") : v])));
            res({ data: single ? rows[0] ?? null : mode === "update" && !returning ? null : rows, error: null });
          } catch (e) { res({ data: null, error: e }); void rej; }
        },
      };
      return b;
    },
  };
}
