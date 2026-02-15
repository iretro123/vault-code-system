import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Radio, Calendar, Clock, ExternalLink, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useAcademyRole } from "@/hooks/useAcademyRole";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { format, isPast } from "date-fns";
import { cn } from "@/lib/utils";

interface LiveSession {
  id: string;
  title: string;
  description: string;
  session_date: string;
  join_url: string;
  session_type: string;
}

function useLiveSessions() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("live_sessions")
      .select("*")
      .order("session_date", { ascending: true });
    setSessions((data as LiveSession[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { sessions, loading, refetch: fetch };
}

function SessionForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: LiveSession;
  onSave: (data: { title: string; description: string; session_date: string; join_url: string; session_type: string }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [dateStr, setDateStr] = useState(
    initial ? format(new Date(initial.session_date), "yyyy-MM-dd'T'HH:mm") : ""
  );
  const [joinUrl, setJoinUrl] = useState(initial?.join_url || "");
  const [type, setType] = useState(initial?.session_type || "live");

  return (
    <Card className="vault-card p-4 space-y-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Session title" />
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="resize-none" />
      <div className="grid grid-cols-2 gap-2">
        <Input type="datetime-local" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
        >
          <option value="live">Live Session</option>
          <option value="office-hours">Office Hours</option>
        </select>
      </div>
      <Input value={joinUrl} onChange={(e) => setJoinUrl(e.target.value)} placeholder="Join URL (Zoom, Meet, etc.)" />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={saving || !title.trim() || !dateStr}
          onClick={() => onSave({ title: title.trim(), description: description.trim(), session_date: new Date(dateStr).toISOString(), join_url: joinUrl.trim(), session_type: type })}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : initial ? "Save" : "Add Session"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}

const AcademyLive = () => {
  const { sessions, loading, refetch } = useLiveSessions();
  const { isAdmin } = useAcademyRole();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const liveSessions = sessions.filter((s) => s.session_type === "live");
  const officeHours = sessions.filter((s) => s.session_type === "office-hours");

  const nextLive = liveSessions.find((s) => !isPast(new Date(s.session_date)));
  const nextOfficeHours = officeHours.find((s) => !isPast(new Date(s.session_date)));

  const handleAdd = async (data: any) => {
    setSaving(true);
    const { error } = await supabase.from("live_sessions").insert(data as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Session added");
    setShowAdd(false);
    refetch();
  };

  const handleUpdate = async (id: string, data: any) => {
    setSaving(true);
    const { error } = await supabase.from("live_sessions").update(data as any).eq("id", id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Session updated");
    setEditingId(null);
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this session?")) return;
    await supabase.from("live_sessions").delete().eq("id", id);
    toast.success("Session deleted");
    refetch();
  };

  if (loading) {
    return (
      <AcademyLayout>
        <PageHeader title="Live Sessions" subtitle="Join scheduled live events and office hours" />
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AcademyLayout>
    );
  }

  return (
    <AcademyLayout>
      <PageHeader title="Live Sessions" subtitle="Join scheduled live events and office hours" />
      <div className="px-4 md:px-6 pb-6 space-y-8 max-w-2xl">

        {/* Next Live Session */}
        <section>
          <p className="section-title">Next Live Session</p>
          {nextLive ? (
            <SessionCard
              session={nextLive}
              isAdmin={isAdmin}
              isEditing={editingId === nextLive.id}
              saving={saving}
              onEdit={() => setEditingId(nextLive.id)}
              onUpdate={(data) => handleUpdate(nextLive.id, data)}
              onCancelEdit={() => setEditingId(null)}
              onDelete={() => handleDelete(nextLive.id)}
              accent
            />
          ) : (
            <Card className="vault-card p-8 flex flex-col items-center text-center">
              <div className="h-11 w-11 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Radio className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No upcoming live sessions scheduled.</p>
            </Card>
          )}
        </section>

        {/* Office Hours */}
        <section>
          <p className="section-title">Office Hours</p>
          {nextOfficeHours ? (
            <SessionCard
              session={nextOfficeHours}
              isAdmin={isAdmin}
              isEditing={editingId === nextOfficeHours.id}
              saving={saving}
              onEdit={() => setEditingId(nextOfficeHours.id)}
              onUpdate={(data) => handleUpdate(nextOfficeHours.id, data)}
              onCancelEdit={() => setEditingId(null)}
              onDelete={() => handleDelete(nextOfficeHours.id)}
            />
          ) : (
            <Card className="vault-card p-8 flex flex-col items-center text-center">
              <div className="h-11 w-11 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No upcoming office hours scheduled.</p>
            </Card>
          )}
        </section>

        {/* Past sessions (admin view) */}
        {isAdmin && sessions.filter((s) => isPast(new Date(s.session_date))).length > 0 && (
          <section>
            <p className="section-title text-muted-foreground/60">Past Sessions</p>
            <div className="space-y-2">
              {sessions.filter((s) => isPast(new Date(s.session_date))).map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  isAdmin={isAdmin}
                  isEditing={editingId === s.id}
                  saving={saving}
                  onEdit={() => setEditingId(s.id)}
                  onUpdate={(data) => handleUpdate(s.id, data)}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={() => handleDelete(s.id)}
                  past
                />
              ))}
            </div>
          </section>
        )}

        {/* Admin: Add session */}
        {isAdmin && (
          showAdd ? (
            <SessionForm onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add Session
            </Button>
          )
        )}
      </div>
    </AcademyLayout>
  );
};

function SessionCard({
  session,
  isAdmin,
  isEditing,
  saving,
  onEdit,
  onUpdate,
  onCancelEdit,
  onDelete,
  accent,
  past,
}: {
  session: LiveSession;
  isAdmin: boolean;
  isEditing: boolean;
  saving: boolean;
  onEdit: () => void;
  onUpdate: (data: any) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  accent?: boolean;
  past?: boolean;
}) {
  if (isEditing) {
    return (
      <SessionForm
        initial={session}
        onSave={(data) => onUpdate(data)}
        onCancel={onCancelEdit}
        saving={saving}
      />
    );
  }

  const date = new Date(session.session_date);

  return (
    <Card className={cn(
      "vault-card group p-5 transition-colors",
      accent && "border-primary/30 bg-primary/5",
      past && "opacity-50"
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "h-11 w-11 shrink-0 rounded-xl flex items-center justify-center",
          accent ? "bg-primary/10" : "bg-muted"
        )}>
          {session.session_type === "office-hours" ? (
            <Clock className={cn("h-5 w-5", accent ? "text-primary" : "text-muted-foreground")} />
          ) : (
            <Radio className={cn("h-5 w-5", accent ? "text-primary" : "text-muted-foreground")} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm">{session.title}</h3>
          {session.description && (
            <p className="text-xs text-muted-foreground mt-1">{session.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(date, "EEE, MMM d, yyyy")}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(date, "h:mm a")}
            </span>
          </div>

          {session.join_url && !past && (
            <a
              href={session.join_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block"
              onClick={(e) => e.stopPropagation()}
            >
              <Button size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                Join Session
              </Button>
            </a>
          )}
        </div>

        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export default AcademyLive;
