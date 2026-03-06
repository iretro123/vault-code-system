import { PageHeader } from "@/components/layout/PageHeader";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, CheckCircle2, Clock, Loader2, Plus, Trash2, Pencil, Users, AlertCircle, Send, Image, ChevronDown, ChevronUp, Megaphone, Heart, Pin } from "lucide-react";
import { useAcademyRole } from "@/hooks/useAcademyRole";
import { Navigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, formatDateShort } from "@/lib/formatTime";
import { cn } from "@/lib/utils";
import { useAcademyLessons, AcademyLesson } from "@/hooks/useAcademyLessons";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  access_status: string;
}

interface Ticket {
  id: string;
  user_id: string;
  category: string;
  urgency: string;
  question: string;
  screenshot_url: string | null;
  status: string;
  created_at: string;
}

interface Reply {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name: string;
  body: string;
  is_admin: boolean;
  created_at: string;
}

const EMPTY_FORM = { module_slug: "", module_title: "", lesson_title: "", video_url: "", sort_order: 0 };

const AcademyAdmin = () => {
  const { isAdmin } = useAcademyRole();
  const { user, profile } = useAuth();

  // Lesson management
  const { lessons, loading: lessonsLoading, refetch } = useAcademyLessons();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [ticketReplies, setTicketReplies] = useState<Record<string, Reply[]>>({});
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replySending, setReplySending] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // User access management
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  // Announcement form
  const [annoTitle, setAnnoTitle] = useState("");
  const [annoBody, setAnnoBody] = useState("");
  const [annoLink, setAnnoLink] = useState("");
  const [annoPinned, setAnnoPinned] = useState(false);
  const [annoSending, setAnnoSending] = useState(false);

  // Motivation DM
  const [motiUserId, setMotiUserId] = useState("");
  const [motiTitle, setMotiTitle] = useState("");
  const [motiBody, setMotiBody] = useState("");
  const [motiSending, setMotiSending] = useState(false);

  const handlePostAnnouncement = async () => {
    if (!annoTitle.trim()) { toast.error("Title is required"); return; }
    setAnnoSending(true);
    const { error } = await supabase.from("inbox_items" as any).insert({
      user_id: null,
      type: "announcement",
      title: annoTitle.trim(),
      body: annoBody.trim(),
      link: annoLink.trim() || null,
      pinned: annoPinned,
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("Announcement posted");
      setAnnoTitle(""); setAnnoBody(""); setAnnoLink(""); setAnnoPinned(false);
    }
    setAnnoSending(false);
  };

  const handleSendMotivation = async () => {
    if (!motiUserId || !motiTitle.trim()) { toast.error("Select a user and enter a title"); return; }
    setMotiSending(true);
    const { error } = await supabase.from("inbox_items" as any).insert({
      user_id: motiUserId,
      type: "reminder",
      title: motiTitle.trim(),
      body: motiBody.trim(),
      link: null,
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("Motivation sent");
      setMotiTitle(""); setMotiBody(""); setMotiUserId("");
    }
    setMotiSending(false);
  };

  const fetchTickets = useCallback(async () => {
    const { data } = await supabase
      .from("coach_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setTickets((data as Ticket[]) || []);
    setTicketsLoading(false);
  }, []);

  const fetchReplies = useCallback(async (ticketId: string) => {
    const { data } = await supabase
      .from("coach_ticket_replies")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setTicketReplies((prev) => ({ ...prev, [ticketId]: (data as Reply[]) || [] }));
  }, []);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, user_id, email, display_name, access_status")
      .order("created_at", { ascending: false })
      .limit(100);
    setUsers((data as UserProfile[]) || []);
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchTickets();
      fetchUsers();
    }
  }, [isAdmin, fetchTickets, fetchUsers]);

  const toggleExpand = (ticketId: string) => {
    if (expandedTicket === ticketId) {
      setExpandedTicket(null);
    } else {
      setExpandedTicket(ticketId);
      if (!ticketReplies[ticketId]) fetchReplies(ticketId);
    }
  };

  const handleAdminReply = async (ticketId: string) => {
    const text = replyTexts[ticketId];
    if (!text?.trim() || !user) return;
    setReplySending(ticketId);
    const userName = profile?.display_name || "Coach";
    await supabase.from("coach_ticket_replies").insert({
      ticket_id: ticketId,
      user_id: user.id,
      user_name: userName,
      body: text.trim(),
      is_admin: true,
    } as any);
    setReplyTexts((prev) => ({ ...prev, [ticketId]: "" }));
    setReplySending(null);
    fetchReplies(ticketId);
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    setStatusUpdating(ticketId);
    await supabase.from("coach_tickets").update({ status: newStatus } as any).eq("id", ticketId);
    setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: newStatus } : t));
    setStatusUpdating(null);
  };

  const updateAccessStatus = async (userId: string, newStatus: string) => {
    setUpdatingUser(userId);
    const { error } = await supabase.from("profiles").update({ access_status: newStatus }).eq("user_id", userId);
    if (error) toast.error("Failed to update access");
    else {
      setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, access_status: newStatus } : u)));
      toast.success(`Access updated to ${newStatus}`);
    }
    setUpdatingUser(null);
  };

  const handleSaveLesson = async () => {
    if (!form.module_slug || !form.module_title || !form.lesson_title || !form.video_url) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    if (editingId) {
      const { error } = await supabase.from("academy_lessons").update({
        module_slug: form.module_slug, module_title: form.module_title,
        lesson_title: form.lesson_title, video_url: form.video_url, sort_order: form.sort_order,
      }).eq("id", editingId);
      if (error) toast.error(error.message); else toast.success("Lesson updated");
    } else {
      const { error } = await supabase.from("academy_lessons").insert({
        module_slug: form.module_slug, module_title: form.module_title,
        lesson_title: form.lesson_title, video_url: form.video_url, sort_order: form.sort_order,
      });
      if (error) toast.error(error.message); else toast.success("Lesson added");
    }
    setForm(EMPTY_FORM);
    setEditingId(null);
    setSaving(false);
    refetch();
  };

  const handleEdit = (lesson: AcademyLesson) => {
    setEditingId(lesson.id);
    setForm({ module_slug: lesson.module_slug, module_title: lesson.module_title, lesson_title: lesson.lesson_title, video_url: lesson.video_url, sort_order: lesson.sort_order });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("academy_lessons").delete().eq("id", id);
    toast.success("Lesson deleted");
    refetch();
  };

  if (!isAdmin) return <Navigate to="/academy/home" replace />;

  const grouped = lessons.reduce<Record<string, AcademyLesson[]>>((acc, l) => {
    (acc[l.module_slug] = acc[l.module_slug] || []).push(l);
    return acc;
  }, {});

  const statusIcon = (status: string) => {
    if (status === "resolved") return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
    if (status === "waiting") return <AlertCircle className="h-3 w-3 text-amber-400" />;
    return <Clock className="h-3 w-3 text-blue-400" />;
  };

  const openTickets = tickets.filter((t) => t.status !== "resolved");
  const resolvedTickets = tickets.filter((t) => t.status === "resolved");

  return (
    <AcademyLayout>
      <PageHeader title="Admin Panel" subtitle="Manage Academy content, tickets, and users" />
      <div className="px-4 md:px-6 pb-6 space-y-8">

        {/* Post Announcement */}
        <div>
          <p className="section-title mb-3 flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Post Announcement
          </p>
          <Card className="p-5 max-w-2xl space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input placeholder="e.g. New Trading Challenge starts Monday" value={annoTitle} onChange={(e) => setAnnoTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Body (optional)</Label>
              <Textarea placeholder="Details…" value={annoBody} onChange={(e) => setAnnoBody(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Link (optional)</Label>
              <Input placeholder="/academy/room/announcements" value={annoLink} onChange={(e) => setAnnoLink(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={annoPinned} onCheckedChange={setAnnoPinned} />
              <Label className="text-xs flex items-center gap-1.5">
                <Pin className="h-3 w-3" /> Pin to top
              </Label>
            </div>
            <Button onClick={handlePostAnnouncement} disabled={annoSending || !annoTitle.trim()} className="gap-1.5">
              {annoSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Megaphone className="h-3.5 w-3.5" />}
              Broadcast
            </Button>
          </Card>
        </div>

        {/* Send Motivation DM */}
        <div>
          <p className="section-title mb-3 flex items-center gap-2">
            <Heart className="h-4 w-4" /> Send Motivation (1:1)
          </p>
          <Card className="p-5 max-w-2xl space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">User</Label>
              <Select value={motiUserId} onValueChange={setMotiUserId}>
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
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input placeholder="e.g. Keep grinding 🔥" value={motiTitle} onChange={(e) => setMotiTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Message (optional)</Label>
              <Textarea placeholder="Personal note…" value={motiBody} onChange={(e) => setMotiBody(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleSendMotivation} disabled={motiSending || !motiUserId || !motiTitle.trim()} className="gap-1.5">
              {motiSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send
            </Button>
          </Card>
        </div>

        {/* Coach Tickets */}
        <div>
          <p className="section-title mb-3">Support Tickets ({openTickets.length} open)</p>
          {ticketsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : openTickets.length === 0 ? (
            <Card className="p-6 text-center max-w-2xl">
              <p className="text-sm text-muted-foreground">No open tickets.</p>
            </Card>
          ) : (
            <div className="space-y-2 max-w-2xl">
              {openTickets.map((t) => {
                const isExpanded = expandedTicket === t.id;
                const replies = ticketReplies[t.id] || [];
                return (
                  <Card key={t.id} className="overflow-hidden">
                    <button
                      onClick={() => toggleExpand(t.id)}
                      className="w-full text-left p-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{statusIcon(t.status)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-[10px] font-semibold uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{t.category}</span>
                            {t.urgency === "priority" && (
                              <span className="text-[10px] font-semibold uppercase tracking-wider bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">Priority</span>
                            )}
                            <span className="text-[10px] text-muted-foreground/50">
                              {formatDateTime(t.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground line-clamp-2">{t.question}</p>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                        {/* Full question */}
                        <p className="text-sm text-foreground">{t.question}</p>
                        {t.screenshot_url && (
                          <a href={t.screenshot_url} target="_blank" rel="noopener noreferrer">
                            <img src={t.screenshot_url} alt="Screenshot" className="rounded-lg border border-border max-h-40 object-cover" />
                          </a>
                        )}

                        {/* Status controls */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-muted-foreground">Status:</label>
                          <Select
                            value={t.status}
                            onValueChange={(val) => updateTicketStatus(t.id, val)}
                            disabled={statusUpdating === t.id}
                          >
                            <SelectTrigger className="w-[120px] h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="waiting">Waiting</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Replies thread */}
                        {replies.length > 0 && (
                          <div className="space-y-2 pt-1">
                            {replies.map((r) => (
                              <div key={r.id} className={cn("rounded-lg p-3 text-sm", r.is_admin ? "bg-primary/5 border border-primary/10" : "bg-muted")}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={cn("text-xs font-semibold", r.is_admin ? "text-primary" : "text-foreground")}>
                                    {r.user_name}
                                    {r.is_admin && <span className="text-[10px] ml-1 font-normal text-primary/60">Coach</span>}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground/50">
                                    {formatDateTime(r.created_at)}
                                  </span>
                                </div>
                                <p className="text-foreground/90 whitespace-pre-line">{r.body}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply input */}
                        <div className="flex gap-2">
                          <Input
                            value={replyTexts[t.id] || ""}
                            onChange={(e) => setReplyTexts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                            placeholder="Reply as coach…"
                            className="flex-1"
                            maxLength={1000}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdminReply(t.id); } }}
                          />
                          <Button
                            size="icon"
                            onClick={() => handleAdminReply(t.id)}
                            disabled={!(replyTexts[t.id] || "").trim() || replySending === t.id}
                          >
                            {replySending === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {resolvedTickets.length > 0 && (
            <details className="mt-4 max-w-2xl">
              <summary className="text-xs text-muted-foreground/60 cursor-pointer hover:text-muted-foreground">
                {resolvedTickets.length} resolved ticket{resolvedTickets.length !== 1 ? "s" : ""}
              </summary>
              <div className="space-y-2 mt-2 opacity-50">
                {resolvedTickets.map((t) => (
                  <Card key={t.id} className="p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span className="text-[10px] font-semibold uppercase bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{t.category}</span>
                      <p className="text-sm text-foreground truncate flex-1">{t.question}</p>
                      <span className="text-[10px] text-muted-foreground/50 shrink-0">{formatDateShort(t.created_at)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Lesson Management */}
        <div>
          <p className="section-title mb-3">Manage Lessons</p>
          <Card className="p-5 max-w-2xl space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Module Slug</Label>
                <Input placeholder="e.g. discipline-foundations" value={form.module_slug} onChange={(e) => setForm((f) => ({ ...f, module_slug: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Module Title</Label>
                <Input placeholder="e.g. Discipline Foundations" value={form.module_title} onChange={(e) => setForm((f) => ({ ...f, module_title: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Lesson Title</Label>
                <Input placeholder="e.g. Why Discipline Beats Strategy" value={form.lesson_title} onChange={(e) => setForm((f) => ({ ...f, lesson_title: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Video URL</Label>
              <Input placeholder="https://www.youtube.com/watch?v=..." value={form.video_url} onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveLesson} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {editingId ? "Update Lesson" : "Add Lesson"}
              </Button>
              {editingId && (
                <Button variant="ghost" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}>Cancel</Button>
              )}
            </div>
          </Card>

          {lessonsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : Object.keys(grouped).length === 0 ? (
            <Card className="p-6 text-center mt-4 max-w-2xl"><p className="text-sm text-muted-foreground">No lessons added yet.</p></Card>
          ) : (
            <div className="space-y-4 mt-4 max-w-2xl">
              {Object.entries(grouped).map(([slug, moduleLessons]) => (
                <div key={slug}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {moduleLessons[0].module_title}
                    <span className="text-muted-foreground/50 ml-2 font-mono">{slug}</span>
                  </p>
                  <div className="space-y-1.5">
                    {moduleLessons.map((l) => (
                      <Card key={l.id} className="p-3 flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground w-6 text-center">{l.sort_order}</span>
                        <span className="text-sm flex-1 truncate">{l.lesson_title}</span>
                        <span className="text-[10px] text-muted-foreground/60 truncate max-w-[200px]">{l.video_url}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(l)} className="h-7 w-7 p-0"><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(l.id)} className="h-7 w-7 p-0 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Access Management */}
        <div>
          <p className="section-title mb-3">User Access</p>
          {usersLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : users.length === 0 ? (
            <Card className="p-6 text-center max-w-2xl"><p className="text-sm text-muted-foreground">No users found.</p></Card>
          ) : (
            <div className="space-y-2 max-w-2xl">
              {users.map((u) => (
                <Card key={u.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.display_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {updatingUser === u.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Select value={u.access_status} onValueChange={(val) => updateAccessStatus(u.user_id, val)}>
                          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trial">Trial</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="revoked">Revoked</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AcademyLayout>
  );
};

export default AcademyAdmin;
