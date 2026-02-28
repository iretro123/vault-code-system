import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Loader2, Search, RefreshCw, CreditCard, AlertTriangle,
  CheckCircle2, XCircle, Copy, Eye, ChevronDown, ShieldAlert,
  Clock, Activity, Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTimeFull } from "@/lib/formatTime";
import { toast } from "sonner";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { useStudentAccess } from "@/hooks/useStudentAccess";

// ─── Types ───

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
  payload_json?: Record<string, unknown>;
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

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success("Copied");
};

// ─── Main Component ───

export function AdminStripeTab() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [accessRecords, setAccessRecords] = useState<AccessRow[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<WebhookEventRow | null>(null);

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
      toast.error(err.message || "Failed to create checkout session");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [studentsRes, accessRes, eventsRes] = await Promise.all([
      supabase.from("students").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("student_access").select("*").order("updated_at", { ascending: false }).limit(200),
      supabase.from("stripe_webhook_events").select("id, stripe_event_id, event_type, status, email, stripe_customer_id, amount, currency, error_message, trace_id, received_at, processed_at").order("received_at", { ascending: false }).limit(100),
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
              <li>Create a test checkout via <code className="bg-white/5 px-1 rounded">create-checkout</code></li>
              <li>Complete payment with test card: <code className="bg-white/5 px-1 rounded">4242 4242 4242 4242</code></li>
              <li>Stripe fires webhook → this tab updates</li>
              <li>Verify: student created, access = <span className="text-emerald-400">active</span>, webhook = <span className="text-emerald-400">processed</span></li>
            </ol>
            <div className="flex items-center gap-3 pt-2 border-t border-blue-500/10 mt-2">
              <Button onClick={handleTestCheckout} disabled={checkoutLoading} size="sm" className="gap-1.5">
                {checkoutLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                Run Test Checkout
              </Button>
              <button
                onClick={() => { navigator.clipboard.writeText("4242424242424242"); toast.success("Test card copied"); }}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 font-mono"
              >
                4242 4242 4242 4242 <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Warning */}
      {students.length > 0 && accessRecords.some(a => a.status === 'active') && webhookEvents.length === 0 && (
        <Card className="p-3 border-amber-500/20 bg-amber-500/[0.04] flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">Access was granted but no webhook events found — check webhook logging.</p>
        </Card>
      )}

      {/* Stats */}
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

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search email, name, stripe ID…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
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
                            {s.stripe_customer_id.slice(0, 18)}… <Copy className="h-3 w-3" />
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
                      <TableCell className="text-xs text-muted-foreground">{formatDateTimeFull(s.created_at)}</TableCell>
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
          onRefresh={fetchData}
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
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhookEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">
                      No webhook events yet. Run a test checkout to generate events.
                    </TableCell>
                  </TableRow>
                ) : (
                  webhookEvents.slice(0, 25).map((e) => (
                    <TableRow key={e.id} className="cursor-pointer hover:bg-white/[0.02]" onClick={() => setSelectedEvent(e)}>
                      <TableCell className="text-xs font-mono">{e.event_type}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[e.status] || ""}`}>{e.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.email || "—"}</TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground">{e.trace_id}</TableCell>
                      <TableCell className="text-xs text-red-400 max-w-[200px] truncate">{e.error_message || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTimeFull(e.received_at)}</TableCell>
                      <TableCell><Eye className="h-3.5 w-3.5 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Webhook Event Detail Modal */}
      {selectedEvent && (
        <WebhookEventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}

      {/* System Health Checklist */}
      <SystemHealthCard webhookEvents={webhookEvents} />

      {/* QA Test Steps */}
      <QATestSteps />
    </div>
  );
}

// ─── Webhook Event Detail Modal ───

function WebhookEventDetailModal({ event, onClose }: { event: WebhookEventRow; onClose: () => void }) {
  const [payload, setPayload] = useState<Record<string, unknown> | null>(event.payload_json || null);
  const [loadingPayload, setLoadingPayload] = useState(!event.payload_json);
  const [jsonOpen, setJsonOpen] = useState(false);

  useEffect(() => {
    if (event.payload_json) return;
    (async () => {
      setLoadingPayload(true);
      const { data } = await supabase
        .from("stripe_webhook_events")
        .select("payload_json")
        .eq("id", event.id)
        .single();
      setPayload((data as any)?.payload_json || null);
      setLoadingPayload(false);
    })();
  }, [event.id, event.payload_json]);

  const fields = [
    { label: "Event ID", value: event.stripe_event_id, copyable: true },
    { label: "Event Type", value: event.event_type },
    { label: "Status", value: event.status, badge: true },
    { label: "Trace ID", value: event.trace_id, copyable: true },
    { label: "Email", value: event.email || "—" },
    { label: "Customer ID", value: event.stripe_customer_id || "—", copyable: !!event.stripe_customer_id },
    { label: "Amount", value: event.amount ? `${(event.amount / 100).toFixed(2)} ${event.currency?.toUpperCase() || ""}` : "—" },
    { label: "Received", value: formatDateTimeFull(event.received_at) },
    { label: "Processed", value: event.processed_at ? formatDateTimeFull(event.processed_at) : "—" },
  ];

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Webhook Event Detail</DialogTitle>
          <DialogDescription className="text-xs font-mono text-muted-foreground">{event.event_type}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {fields.map(({ label, value, copyable, badge }) => (
            <div key={label} className="flex justify-between items-center text-xs py-1 border-b border-white/5">
              <span className="text-muted-foreground">{label}</span>
              <span className="flex items-center gap-1.5">
                {badge ? (
                  <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[value as string] || ""}`}>{value}</Badge>
                ) : (
                  <span className="font-mono text-right max-w-[250px] truncate">{value}</span>
                )}
                {copyable && value && value !== "—" && (
                  <button onClick={() => copyToClipboard(value as string)} className="text-muted-foreground hover:text-foreground">
                    <Copy className="h-3 w-3" />
                  </button>
                )}
              </span>
            </div>
          ))}

          {event.error_message && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-2 text-xs text-red-400 mt-2">
              <span className="font-medium">Error:</span> {event.error_message}
            </div>
          )}

          <Collapsible open={jsonOpen} onOpenChange={setJsonOpen}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-2">
              <ChevronDown className={`h-3 w-3 transition-transform ${jsonOpen ? "rotate-0" : "-rotate-90"}`} />
              Raw JSON Payload
            </CollapsibleTrigger>
            <CollapsibleContent>
              {loadingPayload ? (
                <div className="py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : (
                <pre className="mt-2 bg-black/30 rounded p-3 text-[10px] font-mono text-muted-foreground overflow-auto max-h-64">
                  {JSON.stringify(payload, null, 2)}
                </pre>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Student Detail Panel ───

function StudentDetail({
  student,
  access,
  events,
  onRefresh,
}: {
  student: StudentRow;
  access: AccessRow[];
  events: WebhookEventRow[];
  onRefresh: () => void;
}) {
  const { isCEO, isOperator } = useAcademyPermissions();
  const canOverride = isCEO || isOperator;

  return (
    <Card className="p-4 space-y-4 border-white/[0.08]">
      <h4 className="text-sm font-semibold">Detail: {student.email}</h4>

      {/* Identity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {[
          { label: "Student ID", value: student.id },
          { label: "Auth User ID", value: student.auth_user_id || "—" },
          { label: "Email", value: student.email },
          { label: "Stripe Customer", value: student.stripe_customer_id || "—" },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center gap-2 bg-white/[0.02] rounded px-3 py-2">
            <span className="text-muted-foreground shrink-0">{label}:</span>
            <span className="font-mono truncate">{value}</span>
            {value !== "—" && (
              <button onClick={() => copyToClipboard(value)} className="text-muted-foreground hover:text-foreground ml-auto shrink-0">
                <Copy className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

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

      {/* Admin Tools */}
      {canOverride && (
        <div className="border-t border-white/[0.06] pt-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
            <ShieldAlert className="h-4 w-4" /> Admin Tools
          </div>
          <div className="flex gap-3 flex-wrap">
            <ReconcileButton studentId={student.id} onDone={onRefresh} />
          </div>
          <ManualOverrideSection studentId={student.id} onDone={onRefresh} />
        </div>
      )}
    </Card>
  );
}

// ─── Reconcile Button ───

function ReconcileButton({ studentId, onDone }: { studentId: string; onDone: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleReconcile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reconcile-access", {
        body: { student_id: studentId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data.changed) {
        toast.success(`Access updated: ${data.previous_status} → ${data.new_status}`);
      } else {
        toast.info(data.reason || "No changes needed");
      }
      onDone();
    } catch (err: any) {
      toast.error(err.message || "Reconcile failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleReconcile} disabled={loading} variant="outline" size="sm" className="gap-1.5 text-xs">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
      Reconcile from Stripe
    </Button>
  );
}

// ─── Manual Override Section ───

function ManualOverrideSection({ studentId, onDone }: { studentId: string; onDone: () => void }) {
  const [action, setAction] = useState<string>("");
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const actionLabels: Record<string, string> = {
    active: "Grant Active Access",
    past_due: "Mark Past Due",
    canceled: "Revoke / Cancel Access",
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_override_access", {
        target_student_id: studentId,
        new_status: action,
        reason: reason.trim(),
      });
      if (error) throw error;
      const result = data as any;
      if (result?.success === false) {
        toast.error(result.error || "Override rejected by server");
        return;
      }
      toast.success(`Access overridden: ${result?.before_status || "none"} → ${result?.after_status}`);
      setAction("");
      setReason("");
      setConfirmOpen(false);
      onDone();
    } catch (err: any) {
      toast.error(err.message || "Override failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground font-medium">Manual Access Override</p>
      <div className="flex gap-2 items-start flex-wrap">
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-48 h-8 text-xs">
            <SelectValue placeholder="Select action…" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(actionLabels).map(([val, label]) => (
              <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          placeholder="Reason (min 8 chars)… e.g. 'manual support correction'"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="text-xs h-8 min-h-[32px] flex-1 min-w-[200px] resize-none"
          rows={1}
        />
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={!action || reason.trim().length < 8}
          variant="destructive"
          size="sm"
          className="text-xs"
        >
          Apply Override
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Confirm Access Override</DialogTitle>
            <DialogDescription className="text-xs">
              You are about to <strong>{actionLabels[action]?.toLowerCase()}</strong> for this student. This action is logged for audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs space-y-1 bg-white/[0.02] rounded p-3">
            <div><span className="text-muted-foreground">Action:</span> {actionLabels[action]}</div>
            <div><span className="text-muted-foreground">Reason:</span> {reason}</div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)} className="text-xs">Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleSubmit} disabled={loading} className="text-xs gap-1.5">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
