import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Radio, Calendar, Clock, ExternalLink, Plus, Pencil, Trash2, Loader2,
  Bell, Link2, CalendarPlus, Play, ChevronRight, CalendarDays, Settings2,
  Eye, EyeOff,
} from "lucide-react";
import { AdminActionBar } from "@/components/admin/AdminActionBar";
import { AdminOnly } from "@/components/admin/AdminOnly";
import { useAdminMode } from "@/contexts/AdminModeContext";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { PremiumGate } from "@/components/academy/PremiumGate";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format, isPast, isThisWeek } from "date-fns";
import { formatTime } from "@/lib/formatTime";
import { cn } from "@/lib/utils";

/* ── Google Calendar helper ── */
function buildGoogleCalendarUrl(s: { title: string; session_date: string; duration_minutes: number; description: string; join_url: string }) {
  const start = new Date(s.session_date);
  const end = new Date(start.getTime() + (s.duration_minutes || 60) * 60_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: s.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `${s.description}\n\nJoin: ${s.join_url || "TBD"}`,
    ctz: "America/New_York",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/* ── Types ── */
interface LiveSession {
  id: string;
  title: string;
  description: string;
  session_date: string;
  join_url: string;
  session_type: string;
  duration_minutes: number;
  status: string;
  is_replay: boolean;
  replay_url: string | null;
  created_by: string | null;
}

/* ── Data hook ── */
const LIVE_CACHE_KEY = "va_cache_live_sessions";

function readLiveCache(): LiveSession[] {
  try {
    const raw = localStorage.getItem(LIVE_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function useLiveSessions() {
  const [sessions, setSessions] = useState<LiveSession[]>(() => readLiveCache());
  const [loading, setLoading] = useState(() => localStorage.getItem(LIVE_CACHE_KEY) === null);

  const fetch = useCallback(async () => {
    if (localStorage.getItem(LIVE_CACHE_KEY) === null) setLoading(true);
    const { data } = await supabase
      .from("live_sessions")
      .select("*")
      .order("session_date", { ascending: true });
    const result = (data as LiveSession[]) || [];
    setSessions(result);
    try { localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify(result)); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { sessions, loading, refetch: fetch };
}

/* ── 12h time helpers ── */
function parse12hTo24h(hour: string, minute: string, ampm: string): { h: number; m: number } | null {
  let h = parseInt(hour, 10);
  const m = parseInt(minute, 10);
  if (isNaN(h) || isNaN(m) || h < 1 || h > 12 || m < 0 || m > 59) return null;
  if (ampm === "AM" && h === 12) h = 0;
  else if (ampm === "PM" && h !== 12) h += 12;
  return { h, m };
}

function to12h(date: Date) {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return { hour: String(h), minute: String(m).padStart(2, "0"), ampm };
}

/* ── Audit helper ── */
async function logAudit(adminId: string, action: string, targetId: string, metadata?: Record<string, any>) {
  await supabase.from("audit_logs").insert({
    admin_id: adminId,
    action,
    target_user_id: targetId,
    metadata: metadata ?? {},
  } as any);
}

/* ── Session Form (used in modal) ── */
function SessionForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: LiveSession;
  onSave: (data: {
    title: string; description: string; session_date: string; join_url: string;
    session_type: string; duration_minutes: number; status: string;
    is_replay: boolean; replay_url: string | null;
  }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [dateStr, setDateStr] = useState(
    initial ? format(new Date(initial.session_date), "yyyy-MM-dd") : ""
  );
  const initTime = initial ? to12h(new Date(initial.session_date)) : { hour: "", minute: "", ampm: "AM" };
  const [hour, setHour] = useState(initTime.hour);
  const [minute, setMinute] = useState(initTime.minute);
  const [ampm, setAmpm] = useState(initTime.ampm);
  const [joinUrl, setJoinUrl] = useState(initial?.join_url || "");
  const [type, setType] = useState(initial?.session_type || "live");
  const [duration, setDuration] = useState(String(initial?.duration_minutes ?? 60));
  const [status, setStatus] = useState(initial?.status || "scheduled");
  const [isReplay, setIsReplay] = useState(initial?.is_replay ?? false);
  const [replayUrl, setReplayUrl] = useState(initial?.replay_url || "");

  const buildDate = () => {
    const parsed = parse12hTo24h(hour, minute, ampm);
    if (!parsed || !dateStr) return null;
    const d = new Date(`${dateStr}T00:00:00`);
    d.setHours(parsed.h, parsed.m, 0, 0);
    return d;
  };

  const isValid = !!title.trim() && !!dateStr && !!buildDate();

  return (
    <div className="space-y-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Session title" />
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="resize-none" />
      <div className="grid grid-cols-2 gap-2">
        <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
        >
          <option value="live">Live Session</option>
          <option value="office-hours">Office Hours</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <Input className="w-16 text-center" placeholder="HH" maxLength={2} value={hour}
          onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 2); if (v === "" || (parseInt(v) >= 1 && parseInt(v) <= 12)) setHour(v); }} />
        <span className="text-muted-foreground font-medium">:</span>
        <Input className="w-16 text-center" placeholder="MM" maxLength={2} value={minute}
          onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 2); if (v === "" || parseInt(v) <= 59) setMinute(v); }} />
        <select value={ampm} onChange={(e) => setAmpm(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background">
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Duration (min)</label>
          <Input value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))} placeholder="60" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          >
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>
      <Input value={joinUrl} onChange={(e) => setJoinUrl(e.target.value)} placeholder="Join URL (Zoom, Meet, etc.)" />
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is-replay" checked={isReplay} onChange={(e) => setIsReplay(e.target.checked)} className="rounded" />
        <label htmlFor="is-replay" className="text-sm text-muted-foreground">Has replay</label>
      </div>
      {isReplay && (
        <Input value={replayUrl} onChange={(e) => setReplayUrl(e.target.value)} placeholder="Replay URL" />
      )}
      <div className="flex gap-2 pt-2">
        <Button size="sm" disabled={saving || !isValid}
          onClick={() => {
            const d = buildDate();
            if (!d) return;
            onSave({
              title: title.trim(), description: description.trim(),
              session_date: d.toISOString(), join_url: joinUrl.trim(),
              session_type: type, duration_minutes: parseInt(duration) || 60,
              status, is_replay: isReplay, replay_url: replayUrl.trim() || null,
            });
          }}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : initial ? "Save" : "Create Session"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

/* ── Mock data for dev preview ── */
function getMockSessions(): LiveSession[] {
  const now = new Date();
  const day = (offset: number, h: number, m: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  return [
    { id: "mock-1", title: "Market Prep + Q&A", description: "Weekly market overview and open Q&A", session_date: day(1, 22, 0), join_url: "https://zoom.us/j/123456789", session_type: "live", duration_minutes: 60, status: "scheduled", is_replay: false, replay_url: null, created_by: null },
    { id: "mock-2", title: "Trading Psychology Workshop", description: "", session_date: day(2, 17, 0), join_url: "https://zoom.us/j/123456789", session_type: "live", duration_minutes: 45, status: "scheduled", is_replay: false, replay_url: null, created_by: null },
    { id: "mock-3", title: "Advanced Options Strategies", description: "", session_date: day(3, 19, 0), join_url: "https://zoom.us/j/123456789", session_type: "live", duration_minutes: 60, status: "scheduled", is_replay: false, replay_url: null, created_by: null },
    { id: "mock-4", title: "Weekly Market Review", description: "", session_date: day(4, 9, 30), join_url: "https://zoom.us/j/123456789", session_type: "office-hours", duration_minutes: 30, status: "scheduled", is_replay: false, replay_url: null, created_by: null },
    { id: "mock-r1", title: "Risk Management Essentials", description: "35 min", session_date: day(-5, 14, 0), join_url: "https://zoom.us/j/123456789", session_type: "live", duration_minutes: 35, status: "completed", is_replay: true, replay_url: "https://zoom.us/j/123456789", created_by: null },
    { id: "mock-r2", title: "Options Risk Firewall", description: "42 min", session_date: day(-10, 15, 0), join_url: "https://zoom.us/j/123456789", session_type: "live", duration_minutes: 42, status: "completed", is_replay: true, replay_url: "https://zoom.us/j/123456789", created_by: null },
  ];
}

/* ═══════════════ PAGE ═══════════════ */
const AcademyLive = () => {
  const { sessions: realSessions, loading, refetch } = useLiveSessions();
  const { hasAccess, status, loading: accessLoading } = useStudentAccess();
  const { user } = useAuth();
  const { isAdminActive } = useAdminMode();
  const { hasPermission } = useAcademyPermissions();
  const canManage = isAdminActive && hasPermission("manage_live_sessions");

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  const isMockMode = searchParams.get("mockLive") === "1";
  const realUpcoming = realSessions.filter((s) => !isPast(new Date(s.session_date)));

  const sessions = useMemo(() => {
    if (isMockMode && realUpcoming.length === 0) {
      return [...getMockSessions(), ...realSessions];
    }
    return realSessions;
  }, [isMockMode, realUpcoming.length, realSessions]);

  const upcoming = sessions.filter((s) => !isPast(new Date(s.session_date)) && s.status !== "completed");
  const past = sessions.filter((s) => isPast(new Date(s.session_date)) || s.status === "completed");
  const nextSession = upcoming[0] || null;
  const thisWeek = upcoming.filter((s) => isThisWeek(new Date(s.session_date), { weekStartsOn: 1 }));
  const weekList = thisWeek.length > 0 ? thisWeek : upcoming;

  const selectedSession = selectedId ? sessions.find((s) => s.id === selectedId) ?? null : null;

  /* ── Handlers ── */
  const handleAdd = async (data: any) => {
    if (!user?.id) return;
    setSaving(true);
    const { data: inserted, error } = await supabase.from("live_sessions").insert({
      ...data,
      created_by: user.id,
    } as any).select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await logAudit(user.id, "live_session.create", user.id, { session_id: (inserted as any)?.id, title: data.title });
    toast.success("Session created");
    setShowAdd(false);
    refetch();
  };

  const handleUpdate = async (id: string, data: any) => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase.from("live_sessions").update(data as any).eq("id", id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await logAudit(user.id, "live_session.update", user.id, { session_id: id, changes: data });
    toast.success("Session updated");
    setEditingId(null);
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (!user?.id || !confirm("Delete this session?")) return;
    const { error } = await supabase.from("live_sessions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAudit(user.id, "live_session.delete", user.id, { session_id: id });
    toast.success("Session deleted");
    if (selectedId === id) setSelectedId(null);
    refetch();
  };

  const handleTogglePublish = async (session: LiveSession) => {
    if (!user?.id) return;
    const newStatus = session.status === "scheduled" ? "completed" : "scheduled";
    const { error } = await supabase.from("live_sessions").update({ status: newStatus } as any).eq("id", session.id);
    if (error) { toast.error(error.message); return; }
    await logAudit(user.id, `live_session.${newStatus === "completed" ? "unpublish" : "publish"}`, user.id, { session_id: session.id });
    toast.success(newStatus === "scheduled" ? "Session published" : "Session unpublished");
    refetch();
  };

  const handleMarkReplay = async (session: LiveSession) => {
    if (!user?.id) return;
    const replayUrl = prompt("Enter replay URL:", session.replay_url || "");
    if (replayUrl === null) return;
    const { error } = await supabase.from("live_sessions").update({
      is_replay: true,
      replay_url: replayUrl.trim() || null,
      status: "completed",
    } as any).eq("id", session.id);
    if (error) { toast.error(error.message); return; }
    await logAudit(user.id, "live_session.mark_replay", user.id, { session_id: session.id, replay_url: replayUrl });
    toast.success("Marked as replay");
    refetch();
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  if (!hasAccess && !accessLoading) {
    return (
      <AcademyLayout>
        <PremiumGate status={status} pageName="Live Sessions" />
      </AcademyLayout>
    );
  }

  if (loading && sessions.length === 0) {
    return (
      <AcademyLayout>
        <div className="liveSessionsPage">
          <PageHeader title="Live Sessions" subtitle="Join scheduled live events and office hours" />
          <div className="px-4 md:px-6 pb-8 space-y-4 animate-pulse">
            <div className="h-32 rounded-2xl bg-muted/30" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-24 rounded-xl bg-muted/20" />
              <div className="h-24 rounded-xl bg-muted/20" />
            </div>
          </div>
        </div>
      </AcademyLayout>
    );
  }

  return (
    <AcademyLayout>
      <div className="liveSessionsPage">
        <div className="flex items-center justify-between px-4 md:px-6">
          <PageHeader title="Live Sessions" subtitle="Join scheduled live events and office hours" />
          {/* Create button only visible in admin mode */}
          {canManage && (
            <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
              <Plus className="h-3.5 w-3.5" /> Create Session
            </Button>
          )}
        </div>

        {/* Create / Edit Dialog */}
        <Dialog open={showAdd || !!editingId} onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditingId(null); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Session" : "Create Live Session"}</DialogTitle>
            </DialogHeader>
            {editingId ? (
              (() => {
                const s = sessions.find((x) => x.id === editingId);
                return s ? <SessionForm initial={s} onSave={(data) => handleUpdate(s.id, data)} onCancel={() => setEditingId(null)} saving={saving} /> : null;
              })()
            ) : (
              <SessionForm onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
            )}
          </DialogContent>
        </Dialog>

        {/* Mock mode indicator */}
        {isMockMode && realUpcoming.length === 0 && (
          <div className="mx-4 md:mx-6 mb-4 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300/80 bg-amber-500/10 border border-amber-500/20 inline-flex items-center gap-1.5">
            ⚡ Dev preview — showing mock data
          </div>
        )}

        <div className="px-4 md:px-6 pb-8 space-y-4">
          {/* Admin Action Bar — real actions */}
          <AdminActionBar
            title="Live Sessions Admin"
            permission="manage_live_sessions"
            actions={[
              { label: "Create Session", icon: Plus, onClick: () => setShowAdd(true) },
              { label: "Edit", icon: Pencil, onClick: selectedSession ? () => setEditingId(selectedSession.id) : undefined, disabled: !selectedSession },
              { label: "Delete", icon: Trash2, onClick: selectedSession ? () => handleDelete(selectedSession.id) : undefined, disabled: !selectedSession },
              { label: selectedSession?.status === "completed" ? "Publish" : "Unpublish", icon: selectedSession?.status === "completed" ? Eye : EyeOff, onClick: selectedSession ? () => handleTogglePublish(selectedSession) : undefined, disabled: !selectedSession },
              { label: "Mark Replay", icon: Play, onClick: selectedSession ? () => handleMarkReplay(selectedSession) : undefined, disabled: !selectedSession },
            ]}
          />

          <div className="flex gap-6 max-w-[1200px]">

            {/* ─── LEFT COLUMN (main) ─── */}
            <div className="flex-1 min-w-0 space-y-6">

              {/* Next Live Session Hero */}
              {nextSession ? (
                <div
                  className={cn("live-glass-card live-glass-card--hero p-6 relative group", canManage && "cursor-pointer", selectedId === nextSession.id && canManage && "ring-1 ring-primary/40")}
                  onClick={canManage ? () => setSelectedId(selectedId === nextSession.id ? null : nextSession.id) : undefined}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Next Live Session</p>
                    <div className="flex items-center gap-1">
                      {canManage && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); setEditingId(nextSession.id); }} className="live-icon-btn"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(nextSession.id); }} className="live-icon-btn text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                        </>
                      )}
                      <button className="live-icon-btn"><CalendarDays className="h-3.5 w-3.5" /></button>
                      <button className="live-icon-btn"><Settings2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-white mt-2">{nextSession.title}</h2>
                  {nextSession.description && <p className="text-sm text-white/50 mt-1">{nextSession.description}</p>}
                  <p className="text-sm text-white/45 mt-1">
                    {format(new Date(nextSession.session_date), "EEEE, MMMM d")} at {format(new Date(nextSession.session_date), "EEEE, MMMM d")} at {formatTime(nextSession.session_date)} EST
                    {nextSession.duration_minutes > 0 && <span className="ml-2 text-white/30">· {nextSession.duration_minutes} min</span>}
                  </p>

                  <div className="flex items-center gap-3 mt-5 flex-wrap">
                    {nextSession.join_url && (
                      <a href={nextSession.join_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                        <button className="live-btn-primary">
                          <ExternalLink className="h-4 w-4" /> Join Zoom
                        </button>
                      </a>
                    )}
                    {nextSession.join_url && (
                      <button className="live-btn-glass" onClick={(e) => { e.stopPropagation(); copyLink(nextSession.join_url); }}>
                        <Link2 className="h-3.5 w-3.5" /> Copy Link
                      </button>
                    )}
                    <button className="live-btn-glass" onClick={(e) => e.stopPropagation()}>
                      <CalendarPlus className="h-3.5 w-3.5" /> Add to Calendar
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.06]">
                    <button className="live-btn-glass text-xs gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Bell className="h-3.5 w-3.5" /> Notify Me
                    </button>
                  </div>
                </div>
              ) : (
                <div className="live-glass-card p-8 flex flex-col items-center text-center">
                  <div className="h-11 w-11 rounded-2xl bg-white/[0.06] flex items-center justify-center mb-4">
                    <Radio className="h-5 w-5 text-white/30" />
                  </div>
                  <p className="text-sm text-white/40">No upcoming live sessions scheduled.</p>
                  {canManage && <p className="text-xs text-white/30 mt-1">Click "Create Session" to add one.</p>}
                </div>
              )}

              {/* This Week */}
              {weekList.length > 0 && (
                <section>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-3">This Week</p>
                  <div className="live-glass-card divide-y divide-white/[0.05]">
                    {weekList.map((s) => (
                      <div
                        key={s.id}
                        className={cn(
                          "flex items-center gap-3 px-5 py-3.5 group/row hover:bg-white/[0.02] transition-colors",
                          canManage && "cursor-pointer",
                          selectedId === s.id && canManage && "bg-primary/[0.06]"
                        )}
                        onClick={canManage ? () => setSelectedId(selectedId === s.id ? null : s.id) : undefined}
                      >
                        <div className="h-7 w-7 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                          <CalendarDays className="h-3.5 w-3.5 text-white/35" />
                        </div>
                        <span className="text-xs text-white/40 w-10 shrink-0">{format(new Date(s.session_date), "EEE d")}</span>
                        <span className="text-sm font-medium text-white/85 flex-1 truncate">{s.title}</span>
                        <span className="text-xs text-white/30 shrink-0">{s.duration_minutes} min</span>
                        <span className="text-xs text-white/40 shrink-0">{formatTime(s.session_date)} EST</span>
                        {canManage && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); setEditingId(s.id); }} className="live-icon-btn opacity-0 group-hover/row:opacity-100"><Pencil className="h-3 w-3" /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="live-icon-btn text-red-400 opacity-0 group-hover/row:opacity-100"><Trash2 className="h-3 w-3" /></button>
                          </>
                        )}
                        <ChevronRight className="h-3.5 w-3.5 text-white/20 shrink-0" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Replays (past / completed sessions) */}
              {past.length > 0 && (
                <section>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-3">Replays</p>
                  <div className="space-y-2">
                    {past.map((s) => (
                      <div
                        key={s.id}
                        className={cn(
                          "live-glass-card px-5 py-4 flex items-center gap-4 group/replay",
                          canManage && "cursor-pointer",
                          selectedId === s.id && canManage && "ring-1 ring-primary/40"
                        )}
                        onClick={canManage ? () => setSelectedId(selectedId === s.id ? null : s.id) : undefined}
                      >
                        <div className="h-10 w-10 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0">
                          <Play className="h-4 w-4 text-white/30" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white/85 truncate">{s.title}</p>
                          <p className="text-xs text-white/35">
                            {format(new Date(s.session_date), "EEEE, MMM d")}
                            {s.duration_minutes > 0 && <span> · {s.duration_minutes} min</span>}
                          </p>
                        </div>
                        {canManage && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); setEditingId(s.id); }} className="live-icon-btn opacity-0 group-hover/replay:opacity-100"><Pencil className="h-3 w-3" /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="live-icon-btn text-red-400 opacity-0 group-hover/replay:opacity-100"><Trash2 className="h-3 w-3" /></button>
                          </>
                        )}
                        {(s.replay_url || s.join_url) && (
                          <a href={s.replay_url || s.join_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            <button className="live-pill-btn">Watch Replay</button>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* ─── RIGHT COLUMN (sidebar) ─── */}
            <div className="hidden lg:flex flex-col gap-5 w-[300px] shrink-0">
              <button className="live-btn-glass w-full justify-center py-2.5 gap-2">
                <CalendarDays className="h-4 w-4" /> Full Schedule
              </button>

              {weekList.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-3">This Week</p>
                  <div className="space-y-2">
                    {weekList.map((s) => {
                      const d = new Date(s.session_date);
                      return (
                        <div key={s.id} className="live-glass-card p-4">
                          <div className="flex items-baseline justify-between mb-2">
                            <span className="text-sm font-bold text-white/90">{format(d, "EEEE")}<span className="text-white/40 font-normal">. {format(d, "MMM d")}</span></span>
                            <span className="text-xs text-white/45">{formatTime(d)} EST</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-md bg-white/[0.06] flex items-center justify-center shrink-0">
                              {s.session_type === "office-hours" ? <Clock className="h-3 w-3 text-white/35" /> : <Radio className="h-3 w-3 text-white/35" />}
                            </div>
                            <span className="text-xs text-white/60 truncate flex-1">{s.title}</span>
                            <ChevronRight className="h-3.5 w-3.5 text-white/20 shrink-0" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {past.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-3">Replays</p>
                  <div className="space-y-2">
                    {past.slice(0, 3).map((s) => (
                      <div key={s.id} className="live-glass-card p-4">
                        <p className="text-sm font-semibold text-white/85 mb-1">{s.title}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/40">
                            {format(new Date(s.session_date), "EEEE, MMM d")}
                            {s.duration_minutes > 0 && <span> · {s.duration_minutes} min</span>}
                          </span>
                          {(s.replay_url || s.join_url) && (
                            <a href={s.replay_url || s.join_url} target="_blank" rel="noopener noreferrer">
                              <button className="live-pill-btn text-[11px]">Watch Replay</button>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AcademyLayout>
  );
};

export default AcademyLive;
