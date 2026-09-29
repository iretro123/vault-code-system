import { useMemo, useState } from "react";
import { AlertTriangle, Copy, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AUDIT_CASES, type AuditCase } from "./billingAuditCases";

const RANGES = { "24h": 1, "7d": 7, "30d": 30, "90d": 90, All: 0 } as const;
type Range = keyof typeof RANGES;

const fmt = (iso: string, tz: string) =>
  new Date(iso).toLocaleString("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });
const mask = (id: string) => (id.length > 14 ? `${id.slice(0, 10)}…${id.slice(-4)}` : id);

function IdRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1 font-mono text-xs">
        {mask(value)}
        <button aria-label={`Copy ${label}`} className="p-1 text-muted-foreground hover:text-foreground" onClick={() => navigator.clipboard.writeText(value)}>
          <Copy className="h-3 w-3" />
        </button>
      </span>
    </div>
  );
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-border bg-card p-4">
    <h3 className="mb-3 text-sm font-semibold">{title}</h3>
    {children}
  </section>
);

type LiveRow = { t: string; kind: string; label: string; error?: string | null };

export function AdminBillingAuditTab() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<AuditCase | null>(null);
  const [range, setRange] = useState<Range>("All");
  const [live, setLive] = useState<LiveRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return AUDIT_CASES;
    return AUDIT_CASES.filter((c) => [c.name, c.email, c.userId, c.stripeCustomerId, c.subscriptionId].some((v) => v.toLowerCase().includes(t)));
  }, [q]);

  const searchLive = async () => {
    const t = q.trim();
    if (!t) return;
    setLoading(true);
    const rows: LiveRow[] = [];
    const like = `%${t}%`;
    const w = await supabase.from("stripe_webhook_events" as any).select("received_at,event_type,status,error_message")
      .or(`email.ilike.${like},stripe_customer_id.eq.${t},stripe_subscription_id.eq.${t}`).order("received_at", { ascending: false }).limit(100);
    (w.data as any[] | null)?.forEach((r) => rows.push({ t: r.received_at, kind: "STRIPE", label: `${r.event_type} · ${r.status}`, error: r.status === "failed" ? r.error_message : null }));
    const isUuid = /^[0-9a-f-]{36}$/i.test(t);
    if (isUuid) {
      const a = await supabase.from("user_activity_logs").select("created_at,event_name,page_key").eq("user_id", t).order("created_at", { ascending: false }).limit(200);
      a.data?.forEach((r: any) => rows.push({ t: r.created_at, kind: "USER", label: `${r.event_name} · ${r.page_key ?? "—"}` }));
      const l = await supabase.from("audit_logs").select("created_at,action").eq("target_user_id", t).order("created_at", { ascending: false }).limit(100);
      l.data?.forEach((r: any) => rows.push({ t: r.created_at, kind: "SYSTEM", label: r.action }));
    }
    rows.sort((x, y) => y.t.localeCompare(x.t));
    setLive(rows);
    setLoading(false);
  };

  const inRange = (iso: string) => !RANGES[range] || Date.now() - new Date(iso).getTime() <= RANGES[range] * 864e5;

  if (open) {
    const c = open;
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setOpen(null)}>← Back to search</Button>
        <div className="flex flex-wrap gap-2">
          {c.warnings.map((w) => (
            <span key={w} className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> {w}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Customer overview">
            <p className="text-base font-semibold">{c.name}</p>
            <p className="mb-2 text-sm text-muted-foreground">{c.email}</p>
            <IdRow label="Vault user ID" value={c.userId} />
            <IdRow label="Stripe customer" value={c.stripeCustomerId} />
            <IdRow label="Subscription" value={c.subscriptionId} />
            <IdRow label="Price" value={c.priceId} />
            <p className="mt-2 text-sm">{c.plan}</p>
          </Card>
          <Card title="Verdict">
            <p className="text-sm font-semibold">{c.classification}</p>
            <p className="mt-2 text-sm text-muted-foreground">{c.summary}</p>
          </Card>
        </div>
        <Card title="Billing, cancellation & deletion audit">
          <div className="divide-y divide-border">
            {c.facts.map((f) => (
              <div key={f.label} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                <span className="text-muted-foreground">{f.label}</span>
                <span>{f.value} <em className="ml-1 text-[11px] not-italic text-muted-foreground">[{f.evidence}]</em></span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Customer timeline">
          <div className="mb-3 flex flex-wrap gap-1">
            {(Object.keys(RANGES) as Range[]).map((r) => (
              <Button key={r} size="sm" variant={r === range ? "default" : "outline"} onClick={() => setRange(r)}>{r}</Button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left"><th className="py-2">Time ET</th><th>Time UTC</th><th>Type</th><th>Event</th><th>Source</th><th>Evidence</th></tr></thead>
              <tbody>
                {c.events.filter((e) => inRange(e.utc)).map((e, i) => (
                  <tr key={i} className="border-t align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">{fmt(e.utc, "America/New_York")}</td>
                    <td className="pr-3 whitespace-nowrap">{fmt(e.utc, "UTC")}</td>
                    <td className="pr-3">{e.actor}</td>
                    <td className="pr-3">{e.label}{e.error && <div className="text-xs font-semibold text-destructive">PROCESSING ERROR: {e.error}</div>}</td>
                    <td className="pr-3">{e.source}</td>
                    <td>{e.evidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Answers">
          <ul className="space-y-2 text-sm">{c.answers.map((a) => <li key={a.q}><strong>{a.q}</strong> {a.a}</li>)}</ul>
        </Card>
        <Card title="Evidence that cannot be obtained">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{c.limits.map((l) => <li key={l}>{l}</li>)}</ul>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Name, email, user ID, Stripe customer or subscription ID" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchLive()} />
        </div>
        <Button onClick={searchLive} disabled={loading || !q.trim()}>{loading ? "Searching…" : "Search records"}</Button>
      </div>
      <Card title="Investigated cases">
        {matches.length === 0 ? <p className="text-sm text-muted-foreground">No saved case matches. Use Search records for live data.</p> : matches.map((c) => (
          <button key={c.userId} className="flex w-full items-center justify-between rounded-xl border border-border p-3 text-left hover:bg-muted/40" onClick={() => setOpen(c)}>
            <span><span className="font-semibold">{c.name}</span><span className="ml-2 text-sm text-muted-foreground">{c.email}</span></span>
            <span className="text-xs font-semibold text-destructive">DELETED · STRIPE ACTIVE</span>
          </button>
        ))}
      </Card>
      {live && (
        <Card title={`Live records (${live.length})`}>
          {live.length === 0 ? <p className="text-sm text-muted-foreground">No records found. Tip: search a user ID to include activity and access history.</p> : (
            <table className="w-full text-sm"><tbody>
              {live.map((r, i) => (
                <tr key={i} className="border-t align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">{fmt(r.t, "America/New_York")} ET</td>
                  <td className="pr-3">{r.kind}</td>
                  <td>{r.label}{r.error && <div className="text-xs font-semibold text-destructive">PROCESSING ERROR: {r.error}</div>}</td>
                </tr>
              ))}
            </tbody></table>
          )}
        </Card>
      )}
    </div>
  );
}
