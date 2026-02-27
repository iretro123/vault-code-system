import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, RefreshCw, CreditCard, AlertTriangle, CheckCircle2, XCircle, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTimeFull } from "@/lib/formatTime";
import { toast } from "sonner";

interface StudentRow {
  id: string;
  email: string;
  full_name: string | null;
  stripe_customer_id: string | null;
  auth_user_id: string | null;
  created_at: string;
}

interface AccessRow {
  id: string;
  user_id: string;
  product_key: string;
  tier: string;
  status: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  access_granted_at: string;
  access_ended_at: string | null;
  last_synced_at: string;
}

interface WebhookEventRow {
  id: string;
  stripe_event_id: string;
  event_type: string;
  status: string;
  email: string | null;
  stripe_customer_id: string | null;
  amount: number | null;
  currency: string | null;
  error_message: string | null;
  trace_id: string;
  received_at: string;
  processed_at: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  trialing: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  past_due: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  canceled: "bg-red-500/15 text-red-400 border-red-500/20",
  paused: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  processed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  received: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  failed: "bg-red-500/15 text-red-400 border-red-500/20",
  duplicate: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  ignored: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

export function AdminStripeTab() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [accessRecords, setAccessRecords] = useState<AccessRow[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleTestCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Checkout session created — opening Stripe…");
      } else {
        throw new Error(data?.error || "No checkout URL returned");
      }
    } catch (err: any) {
      console.error("[TestCheckout]", err);
      toast.error(err.message || "Failed to create checkout session");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const copyTestCard = () => {
    navigator.clipboard.writeText("4242424242424242");
    toast.success("Test card number copied");
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [studentsRes, accessRes, eventsRes] = await Promise.all([
      supabase.from("students").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("student_access").select("*").order("updated_at", { ascending: false }).limit(200),
      supabase.from("stripe_webhook_events").select("*").order("received_at", { ascending: false }).limit(100),
    ]);

    setStudents((studentsRes.data as StudentRow[]) || []);
    setAccessRecords((accessRes.data as AccessRow[]) || []);
    setWebhookEvents((eventsRes.data as WebhookEventRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredStudents = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.email.toLowerCase().includes(q) || s.full_name?.toLowerCase().includes(q) || s.stripe_customer_id?.toLowerCase().includes(q);
  });

  const getAccessForStudent = (studentId: string) =>
    accessRecords.filter((a) => a.user_id === studentId);

  const getEventsForStudent = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return [];
    return webhookEvents.filter(
      (e) => e.email?.toLowerCase() === student.email.toLowerCase() ||
        (student.stripe_customer_id && e.stripe_customer_id === student.stripe_customer_id)
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  // Webhook event stats
  const eventStats = {
    total: webhookEvents.length,
    processed: webhookEvents.filter((e) => e.status === "processed").length,
    failed: webhookEvents.filter((e) => e.status === "failed").length,
    duplicate: webhookEvents.filter((e) => e.status === "duplicate").length,
    ignored: webhookEvents.filter((e) => e.status === "ignored").length,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Test Flow Note */}
      <Card className="p-4 border-blue-500/20 bg-blue-500/[0.04]">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-blue-300">Stripe Test Mode — End-to-End Test Flow</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
              <li>Create a test checkout via <code className="bg-white/5 px-1 rounded">create-checkout</code> edge function (or frontend button)</li>
              <li>Complete payment with Stripe test card: <code className="bg-white/5 px-1 rounded">4242 4242 4242 4242</code></li>
              <li>Stripe fires <code className="bg-white/5 px-1 rounded">checkout.session.completed</code> webhook → this tab updates</li>
              <li>Verify: student created below, access = <span className="text-emerald-400">active</span>, webhook event = <span className="text-emerald-400">processed</span></li>
              <li>Access is granted by webhook only — not by the success redirect page</li>
            </ol>
            <p className="text-xs text-muted-foreground/70">
              Webhook endpoint: <code className="bg-white/5 px-1 rounded text-[10px]">https://oemylhcjqncovnmvvgxh.supabase.co/functions/v1/stripe-webhook</code>
            </p>
            <div className="flex items-center gap-3 pt-2 border-t border-blue-500/10 mt-2">
              <Button
                onClick={handleTestCheckout}
                disabled={checkoutLoading}
                size="sm"
                className="gap-1.5"
              >
                {checkoutLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                Run Test Checkout
              </Button>
              <button
                onClick={copyTestCard}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 font-mono"
              >
                4242 4242 4242 4242 · any future date · any CVC
                <Copy className="h-3 w-3" />
              </button>
            </div>

      {/* Webhook Event Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Events", value: eventStats.total, icon: CreditCard },
          { label: "Processed", value: eventStats.processed, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Failed", value: eventStats.failed, icon: XCircle, color: "text-red-400" },
          { label: "Duplicate", value: eventStats.duplicate, icon: RefreshCw, color: "text-amber-400" },
          { label: "Ignored", value: eventStats.ignored, icon: RefreshCw, color: "text-gray-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-3 flex items-center gap-3">
            <Icon className={`h-4 w-4 ${color || "text-muted-foreground"}`} />
            <div>
              <p className="text-lg font-bold leading-none">{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Student Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search email, name, stripe ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
        <span className="text-xs text-muted-foreground">{filteredStudents.length} students</span>
      </div>

      {/* Students Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Stripe Customer</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                    No student records yet. Complete a Stripe test checkout to see data here.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((s) => {
                  const access = getAccessForStudent(s.id);
                  const isSelected = selectedStudentId === s.id;
                  return (
                    <TableRow
                      key={s.id}
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"}`}
                      onClick={() => setSelectedStudentId(isSelected ? null : s.id)}
                    >
                      <TableCell className="text-sm font-medium">{s.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.full_name || "—"}</TableCell>
                      <TableCell>
                        {s.stripe_customer_id ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(s.stripe_customer_id!); }}
                            className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            {s.stripe_customer_id.slice(0, 18)}…
                            <Copy className="h-3 w-3" />
                          </button>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {access.length === 0 ? (
                          <span className="text-xs text-muted-foreground">No access</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {access.map((a) => (
                              <Badge key={a.id} variant="outline" className={`text-[10px] ${STATUS_COLORS[a.status] || ""}`}>
                                {a.tier} · {a.status}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTimeFull(s.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Selected Student Detail */}
      {selectedStudentId && (
        <StudentDetail
          student={students.find((s) => s.id === selectedStudentId)!}
          access={getAccessForStudent(selectedStudentId)}
          events={getEventsForStudent(selectedStudentId)}
        />
      )}

      {/* Recent Webhook Events */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Recent Webhook Events</h3>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Trace</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhookEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">
                      No webhook events yet. Run a test checkout to generate events.
                    </TableCell>
                  </TableRow>
                ) : (
                  webhookEvents.slice(0, 25).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs font-mono">{e.event_type}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[e.status] || ""}`}>
                          {e.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.email || "—"}</TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground">{e.trace_id}</TableCell>
                      <TableCell className="text-xs text-red-400 max-w-[200px] truncate">{e.error_message || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTimeFull(e.received_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StudentDetail({
  student,
  access,
  events,
}: {
  student: StudentRow;
  access: AccessRow[];
  events: WebhookEventRow[];
}) {
  return (
    <Card className="p-4 space-y-4 border-white/[0.08]">
      <h4 className="text-sm font-semibold">Detail: {student.email}</h4>

      {/* Access Records */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium">Access Records</p>
        {access.length === 0 ? (
          <p className="text-xs text-muted-foreground">No access records.</p>
        ) : (
          <div className="space-y-2">
            {access.map((a) => (
              <div key={a.id} className="bg-white/[0.02] rounded-lg p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div><span className="text-muted-foreground">Product:</span> {a.product_key}</div>
                <div><span className="text-muted-foreground">Tier:</span> {a.tier}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[a.status] || ""}`}>{a.status}</Badge></div>
                <div><span className="text-muted-foreground">Granted:</span> {formatDateTimeFull(a.access_granted_at)}</div>
                {a.stripe_subscription_id && <div className="col-span-2"><span className="text-muted-foreground">Sub ID:</span> <span className="font-mono">{a.stripe_subscription_id}</span></div>}
                {a.stripe_price_id && <div className="col-span-2"><span className="text-muted-foreground">Price:</span> <span className="font-mono">{a.stripe_price_id}</span></div>}
                <div><span className="text-muted-foreground">Synced:</span> {formatDateTimeFull(a.last_synced_at)}</div>
                {a.access_ended_at && <div><span className="text-muted-foreground">Ended:</span> {formatDateTimeFull(a.access_ended_at)}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related Webhook Events */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium">Related Webhook Events ({events.length})</p>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">No matching events found.</p>
        ) : (
          <div className="space-y-1">
            {events.slice(0, 10).map((e) => (
              <div key={e.id} className="bg-white/[0.02] rounded px-3 py-2 text-xs flex items-center gap-3 flex-wrap">
                <span className="font-mono">{e.event_type}</span>
                <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[e.status] || ""}`}>{e.status}</Badge>
                <span className="text-muted-foreground">{formatDateTimeFull(e.received_at)}</span>
                {e.error_message && <span className="text-red-400 truncate max-w-[200px]">{e.error_message}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
