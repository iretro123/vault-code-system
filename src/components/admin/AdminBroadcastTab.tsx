import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Send, Loader2, Clock, CheckCircle2,
  AlertTriangle, FileText, Trash2, RotateCcw,
  Sparkles, Eye, MessageSquare, Smartphone, Mail,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDateTimeFull } from "@/lib/formatTime";

/* ── Templates ── */

/* ── Templates ── */
const TEMPLATES = [
  { key: "weekly_review", title: "Weekly Review reminder", body: "Time to review your week. Head to your journal and reflect on wins, losses, and lessons learned 📊" },
  { key: "log_trades", title: "Log your trades today", body: "Don't forget to log today's trades and reflect on your performance. Consistency builds discipline 📝" },
  { key: "new_lesson", title: "New lesson available", body: "A new lesson is now available in the Academy. Head over to Learn and level up your skills 🚀" },
  { key: "live_session", title: "Live session starting soon", body: "A live session is about to start! Join now so you don't miss it 🔴" },
];

interface UserOption {
  user_id: string;
  display_name: string | null;
  email: string | null;
}

interface BroadcastRecord {
  id: string;
  mode: string;
  channel: string;
  recipient_type: string;
  recipient_user_id: string | null;
  title: string;
  body: string;
  template_key: string | null;
  status: string;
  created_at: string;
  sent_at: string | null;
}

export function AdminBroadcastTab() {
  const { user } = useAuth();

  /* ── Form state ── */
  const [mode] = useState<"motivation_ping">("motivation_ping");
  const [channel, setChannel] = useState<"in_app" | "sms" | "email">("in_app");
  const [smsStatus, setSmsStatus] = useState<{ sent: number; failed: number } | null>(null);
  const [recipientType, setRecipientType] = useState<"all" | "single">("single");
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [templateKey, setTemplateKey] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  /* ── Users list ── */
  const [users, setUsers] = useState<UserOption[]>([]);

  /* ── History ── */
  const [history, setHistory] = useState<BroadcastRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ── Auto DM state ── */
  const [dmEnabled, setDmEnabled] = useState(true);
  const [dmTitle, setDmTitle] = useState("Welcome to Vault OS");
  const [dmBody, setDmBody] = useState("");
  const [dmLink, setDmLink] = useState("/academy/home");
  const [dmSaving, setDmSaving] = useState(false);
  const [dmLoading, setDmLoading] = useState(true);
  const [dmPreview, setDmPreview] = useState(false);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, email")
      .order("display_name")
      .limit(500);
    setUsers((data as UserOption[]) || []);
  }, []);

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase
      .from("broadcast_messages" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory((data as any[] || []) as BroadcastRecord[]);
    setLoadingHistory(false);
  }, []);

  const fetchWelcomeDm = useCallback(async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "welcome_dm")
      .maybeSingle();
    if (data?.value) {
      const v = data.value as any;
      setDmEnabled(v.enabled ?? true);
      setDmTitle(v.title ?? "Welcome to Vault OS");
      setDmBody(v.body ?? "");
      setDmLink(v.link ?? "/academy/home");
    }
    setDmLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); fetchHistory(); fetchWelcomeDm(); }, [fetchUsers, fetchHistory, fetchWelcomeDm]);

  /* ── Apply template ── */
  const applyTemplate = (key: string) => {
    const t = TEMPLATES.find((t) => t.key === key);
    if (t) {
      setTitle(t.title);
      setBody(`Hey {{name}}, ${t.body.charAt(0).toLowerCase()}${t.body.slice(1)}`);
      setTemplateKey(key);
    }
  };

  /* ── Send ── */
  const handleSend = async () => {
    if (channel !== "sms" && !title.trim()) { toast.error("Title is required"); return; }
    if (channel === "sms" && !body.trim()) { toast.error("Message is required"); return; }
    if (recipientType === "single" && !userId) { toast.error("Select a recipient"); return; }
    if (!user) return;

    // Show confirm dialog first
    setConfirmOpen(true);
  };

  const executeSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    setSmsStatus(null);

    const targetUserId = recipientType === "single" ? userId : null;
    const linkVal = link.trim() || null;

    if (channel === "sms") {
      // Send via GHL edge function
      const smsMessage = body.trim();

      const { data, error } = await supabase.functions.invoke("ghl-broadcast-sms", {
        body: {
          recipientType,
          userId: targetUserId,
          message: smsMessage,
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || error?.message || "SMS send failed");
        setSending(false);
        return;
      }

      setSmsStatus({ sent: data.sent, failed: data.failed });
      toast.success(`SMS sent to ${data.sent} member${data.sent !== 1 ? "s" : ""}${data.failed ? ` (${data.failed} failed)` : ""}`);

      // Log to broadcast history
      await supabase.from("broadcast_messages").insert({
        sender_id: user!.id,
        mode,
        channel: "sms",
        recipient_type: recipientType,
        recipient_user_id: targetUserId,
        title: title.trim(),
        body: body.trim(),
        template_key: templateKey,
        status: data.failed === 0 ? "sent" : "partial",
        sent_at: new Date().toISOString(),
        metadata: { sent: data.sent, failed: data.failed } as any,
      });
    } else {
      // In-app delivery (existing logic)
      if (mode === "motivation_ping") {
        await supabase.from("inbox_items").insert({
          user_id: targetUserId,
          type: "reminder",
          title: title.trim(),
          body: body.trim(),
          link: linkVal,
          sender_id: user!.id,
        });
      } else {
        await supabase.from("inbox_items").insert({
          user_id: targetUserId,
          type: "announcement",
          title: title.trim(),
          body: body.trim(),
          link: linkVal,
          pinned: false,
          sender_id: user!.id,
        });
        await supabase.from("academy_notifications").insert({
          user_id: targetUserId,
          type: "announcement",
          title: title.trim(),
          body: body.trim(),
          link_path: linkVal,
        } as any);
      }

      // Log to history
      await supabase.from("broadcast_messages").insert({
        sender_id: user!.id,
        mode,
        channel: "in_app",
        recipient_type: recipientType,
        recipient_user_id: targetUserId,
        title: title.trim(),
        body: body.trim(),
        template_key: templateKey,
        status: "sent",
        sent_at: new Date().toISOString(),
      });

      toast.success("Message sent ✓");
    }

    setTitle(""); setBody(""); setLink(""); setUserId(""); setTemplateKey(null);
    fetchHistory();
    setSending(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("broadcast_messages" as any).delete().eq("id", deleteId);
    toast.success("Record deleted");
    setDeleteId(null);
    fetchHistory();
  };

  const handleResend = (r: BroadcastRecord) => {
    setRecipientType(r.recipient_type as any);
    setUserId(r.recipient_user_id || "");
    setTitle(r.title);
    setBody(r.body);
    setTemplateKey(r.template_key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const recipientLabel = (r: BroadcastRecord) => {
    if (r.recipient_type === "all") return "All Members";
    const u = users.find((u) => u.user_id === r.recipient_user_id);
    return u?.display_name || u?.email || r.recipient_user_id?.slice(0, 8) || "—";
  };

  const saveDm = async () => {
    if (!user) return;
    setDmSaving(true);
    await supabase.from("system_settings").upsert({
      key: "welcome_dm",
      value: { enabled: dmEnabled, title: dmTitle, body: dmBody, link: dmLink } as any,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    });
    toast.success("Auto DM saved ✓");
    setDmSaving(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Tabs defaultValue="compose" className="space-y-4">
        <TabsList className="bg-white/[0.03] border border-white/[0.06] p-1 h-auto">
          <TabsTrigger value="compose" className="gap-1.5 text-xs data-[state=active]:bg-white/[0.08] px-3 py-1.5">
            <Send className="h-3.5 w-3.5" /> Compose
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs data-[state=active]:bg-white/[0.08] px-3 py-1.5">
            <Clock className="h-3.5 w-3.5" /> Send History
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs data-[state=active]:bg-white/[0.08] px-3 py-1.5">
            <FileText className="h-3.5 w-3.5" /> Templates
          </TabsTrigger>
          <TabsTrigger value="auto_dm" className="gap-1.5 text-xs data-[state=active]:bg-white/[0.08] px-3 py-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Auto DM
          </TabsTrigger>
        </TabsList>

        {/* ─── COMPOSE ─── */}
        <TabsContent value="compose">
          <Card className="p-5 space-y-4">
            {/* Recipient */}
            <div className="space-y-1.5">
              <Label className="text-xs">Recipient</Label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setRecipientType("single")}
                  className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${
                    recipientType === "single"
                      ? "border-primary/40 bg-primary/[0.08] text-primary"
                      : "border-white/[0.06] text-muted-foreground hover:bg-white/[0.04]"
                  }`}
                >
                  Single User
                </button>
                <button
                  onClick={() => { setRecipientType("all"); setUserId(""); }}
                  className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${
                    recipientType === "all"
                      ? "border-primary/40 bg-primary/[0.08] text-primary"
                      : "border-white/[0.06] text-muted-foreground hover:bg-white/[0.04]"
                  }`}
                >
                  All Members
                </button>
              </div>
              {recipientType === "single" && (
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="Select a user…" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.display_name || u.email || "Unnamed"} {u.email ? `(${u.email})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Channel */}
            <div className="space-y-1.5">
              <Label className="text-xs">Channel</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setChannel("in_app")}
                  className={`px-3 py-1.5 rounded-md border text-xs transition-colors flex items-center gap-1.5 ${
                    channel === "in_app"
                      ? "border-primary/40 bg-primary/[0.08] text-primary"
                      : "border-white/[0.06] text-muted-foreground hover:bg-white/[0.04]"
                  }`}
                >
                  <MessageSquare className="h-3 w-3" /> In-App
                </button>
                <button
                  onClick={() => setChannel("sms")}
                  className={`px-3 py-1.5 rounded-md border text-xs transition-colors flex items-center gap-1.5 ${
                    channel === "sms"
                      ? "border-primary/40 bg-primary/[0.08] text-primary"
                      : "border-white/[0.06] text-muted-foreground hover:bg-white/[0.04]"
                  }`}
                >
                  <Smartphone className="h-3 w-3" /> SMS (GHL)
                </button>
                <button
                  onClick={() => setChannel("email")}
                  className={`px-3 py-1.5 rounded-md border text-xs transition-colors flex items-center gap-1.5 ${
                    channel === "email"
                      ? "border-primary/40 bg-primary/[0.08] text-primary"
                      : "border-white/[0.06] text-muted-foreground hover:bg-white/[0.04]"
                  }`}
                >
                  <Mail className="h-3 w-3" /> Email
                </button>
              </div>
              {channel === "sms" && (
                <p className="text-[10px] text-amber-400/80">⚡ Will send via GHL to members with phone numbers on file</p>
              )}
              {channel === "email" && recipientType === "all" && (
                <p className="text-[10px] text-blue-400/80">📧 Only members who opted into email alerts will receive this</p>
              )}
            </div>

            {/* Template quick-fill */}
            <div className="space-y-1.5">
              <Label className="text-xs">Quick Template</Label>
              <Select value={templateKey || ""} onValueChange={(v) => v && applyTemplate(v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Choose a template…" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.key} value={t.key}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title & Body */}
            {channel !== "sms" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Title</Label>
                <Input
                  placeholder={mode === "motivation_ping" ? "e.g. Keep grinding 🔥" : "e.g. Important update"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Message {mode === "motivation_ping" ? "(optional)" : ""}</Label>
              <Textarea
                placeholder="Message body…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
              />
              {channel === "sms" && (
                <p className="text-[10px] text-muted-foreground">💡 Use <code className="bg-white/[0.06] px-1 rounded text-[10px]">{"{{name}}"}</code> to personalize — e.g. "Hey {"{{name}}"}, check today's setup!"</p>
              )}
            </div>
            {channel === "in_app" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Link (optional)</Label>
                <Input
                  placeholder="e.g. /academy/home"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">User will see a clickable link in their inbox</p>
              </div>
            )}

            <Button
              onClick={handleSend}
              disabled={sending || (channel === "sms" ? !body.trim() : !title.trim()) || (recipientType === "single" && !userId)}
              className="gap-1.5"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : channel === "sms" ? <Smartphone className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
              {channel === "sms" ? "Send SMS" : "Send"}
            </Button>
            {smsStatus && (
              <p className="text-xs text-muted-foreground">
                Last SMS: {smsStatus.sent} sent{smsStatus.failed > 0 ? `, ${smsStatus.failed} failed` : ""}
              </p>
            )}
          </Card>
        </TabsContent>

        {/* ─── HISTORY ─── */}
        <TabsContent value="history">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Messages ({history.length})
            </p>
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No messages sent yet.</p>
              </Card>
            ) : (
              history.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">{r.title}</h3>
                        <Badge
                          variant={r.status === "sent" ? "default" : r.status === "draft" ? "secondary" : "destructive"}
                          className="text-[10px] h-5 gap-1"
                        >
                          {r.status === "sent" && <CheckCircle2 className="h-2.5 w-2.5" />}
                          {r.status === "draft" && <Clock className="h-2.5 w-2.5" />}
                          {r.status === "failed" && <AlertTriangle className="h-2.5 w-2.5" />}
                          {r.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] h-5">
                          {r.mode === "motivation_ping" ? "Ping" : "Broadcast"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] h-5">{r.channel}</Badge>
                      </div>
                      {r.body && <p className="text-xs text-muted-foreground line-clamp-2">{r.body}</p>}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
                        <span>To: {recipientLabel(r)}</span>
                        <span>{formatDateTimeFull(r.created_at)}</span>
                        {r.template_key && <span>Template: {r.template_key}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Resend" onClick={() => handleResend(r)}>
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Delete" onClick={() => setDeleteId(r.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ─── TEMPLATES ─── */}
        <TabsContent value="templates">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Available Templates
            </p>
            {TEMPLATES.map((t) => (
              <Card key={t.key} className="p-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{t.body}</p>
                    <Badge variant="secondary" className="text-[10px] h-5 mt-2">{t.key}</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs gap-1"
                    onClick={() => { applyTemplate(t.key); /* switch to compose tab — handled by parent Tabs state */ }}
                  >
                    <Send className="h-3 w-3" /> Use
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── AUTO DM ─── */}
        <TabsContent value="auto_dm">
          <Card className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Welcome DM</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Sent once when a new member joins</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{dmEnabled ? "On" : "Off"}</span>
                <Switch checked={dmEnabled} onCheckedChange={setDmEnabled} />
              </div>
            </div>

            {dmLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={dmTitle}
                    onChange={(e) => setDmTitle(e.target.value)}
                    placeholder="Welcome to Vault OS"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Message</Label>
                  <Textarea
                    value={dmBody}
                    onChange={(e) => setDmBody(e.target.value)}
                    rows={6}
                    placeholder="Hey {first_name} — welcome in..."
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      Use <code className="bg-white/[0.06] px-1 py-0.5 rounded text-[10px]">{"{first_name}"}</code> to personalize
                    </p>
                    <span className="text-[10px] text-muted-foreground">{dmBody.length} chars</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Link (optional)</Label>
                  <Input
                    value={dmLink}
                    onChange={(e) => setDmLink(e.target.value)}
                    placeholder="/academy/home"
                  />
                </div>

                {/* Preview */}
                {dmPreview && (
                  <Card className="p-4 bg-white/[0.02] border-white/[0.08]">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Preview</p>
                    <p className="text-sm font-semibold text-foreground">{dmTitle}</p>
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">
                      {dmBody.replace(/\{first_name\}/g, "Alex")}
                    </p>
                    {dmLink && (
                      <p className="text-xs text-primary mt-2 underline">{dmLink}</p>
                    )}
                  </Card>
                )}

                <div className="flex items-center gap-2">
                  <Button onClick={saveDm} disabled={dmSaving || !dmTitle.trim()} className="gap-1.5">
                    {dmSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Save
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setDmPreview(!dmPreview)}>
                    <Eye className="h-3 w-3" /> {dmPreview ? "Hide Preview" : "Preview"}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this message from the send history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send</AlertDialogTitle>
            <AlertDialogDescription>
              Send "{title}" to {recipientType === "all" ? "all members" : users.find(u => u.user_id === userId)?.display_name || "selected user"}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeSend}>
              Send Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
