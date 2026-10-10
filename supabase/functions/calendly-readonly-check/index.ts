// TEMPORARY read-only diagnostic. Staff only. Never returns or logs the key or raw provider payloads.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const TARGET = "https://calendly.com/rz_/vault-os-private-2-hour-trading-mentoring";
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const auth = req.headers.get("authorization");
  if (!auth) return reply(401, { error: "unauthorized" });
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: { user } } = await createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false }, global: { headers: { authorization: auth } } }).auth.getUser();
  if (!user) return reply(401, { error: "unauthorized" });
  const [{ data: op }, { data: owner }] = await Promise.all([
    admin.rpc("has_role", { _user_id: user.id, _role: "operator" }),
    admin.rpc("has_role", { _user_id: user.id, _role: "vault_os_owner" }),
  ]);
  if (!op && !owner) return reply(403, { error: "forbidden" });

  const key = Deno.env.get("CALENDLY_PERSONAL_ACCESS_TOKEN");
  const out: Record<string, unknown> = { key_exists: !!key, key_format_valid: !!key && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key) };
  if (!key) return reply(200, out);
  const get = async (path: string, q: Record<string, string> = {}) => {
    const r = await fetch(`https://api.calendly.com${path}?${new URLSearchParams(q)}`, { headers: { Authorization: `Bearer ${key}` } });
    let body: any = null; try { body = await r.json(); } catch { /* ignore */ }
    return { status: r.status, body };
  };
  try {
    const me = await get("/users/me");
    out.users_me_status = me.status;
    if (me.status !== 200) return reply(200, out);
    const ev = await get("/event_types", { user: me.body?.resource?.uri ?? "", count: "100" });
    out.event_types_status = ev.status;
    if (ev.status !== 200) return reply(200, out);
    const list = ev.body?.collection ?? [];
    out.event_types_more_pages = !!ev.body?.pagination?.next_page;
    const m = list.filter((e: any) => e?.scheduling_url === TARGET);
    out.exact_matches = m.length;
    if (m.length !== 1) return reply(200, out);
    const e = m[0];
    out.event = { uri: e.uri, name: e.name, active: e.active, secret: e.secret, duration: e.duration, kind: e.kind, location_kinds: (e.locations ?? []).map((l: any) => l?.kind) };
    const start = new Date(Date.now() + 5 * 60_000).toISOString(), end = new Date(Date.now() + 7 * 86400_000).toISOString();
    const av = await get("/event_type_available_times", { event_type: e.uri, start_time: start, end_time: end });
    out.available_times_status = av.status;
    if (av.status === 200) out.slots_next_7_days = (av.body?.collection ?? []).length;
  } catch {
    out.error = "provider request failed";
  }
  return reply(200, out);
});
