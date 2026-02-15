import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, CheckCircle, Clock, Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { useAcademyRole } from "@/hooks/useAcademyRole";
import { Navigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAcademyLessons, AcademyLesson } from "@/hooks/useAcademyLessons";
import { toast } from "sonner";

interface CoachRequest {
  id: string;
  user_id: string;
  category: string;
  message: string;
  status: string;
  created_at: string;
}

const EMPTY_FORM = { module_slug: "", module_title: "", lesson_title: "", video_url: "", sort_order: 0 };

const AcademyAdmin = () => {
  const { isAdmin } = useAcademyRole();
  const [requests, setRequests] = useState<CoachRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Lesson management
  const { lessons, loading: lessonsLoading, refetch } = useAcademyLessons();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRequests = useCallback(async () => {
    const { data } = await supabase
      .from("coach_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setRequests((data as CoachRequest[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchRequests();
  }, [isAdmin, fetchRequests]);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "open" ? "closed" : "open";
    setUpdating(id);
    await supabase.from("coach_requests").update({ status: newStatus }).eq("id", id);
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    setUpdating(null);
  };

  const handleSaveLesson = async () => {
    if (!form.module_slug || !form.module_title || !form.lesson_title || !form.video_url) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    if (editingId) {
      const { error } = await supabase
        .from("academy_lessons")
        .update({
          module_slug: form.module_slug,
          module_title: form.module_title,
          lesson_title: form.lesson_title,
          video_url: form.video_url,
          sort_order: form.sort_order,
        })
        .eq("id", editingId);
      if (error) toast.error(error.message);
      else toast.success("Lesson updated");
    } else {
      const { error } = await supabase
        .from("academy_lessons")
        .insert({
          module_slug: form.module_slug,
          module_title: form.module_title,
          lesson_title: form.lesson_title,
          video_url: form.video_url,
          sort_order: form.sort_order,
        });
      if (error) toast.error(error.message);
      else toast.success("Lesson added");
    }
    setForm(EMPTY_FORM);
    setEditingId(null);
    setSaving(false);
    refetch();
  };

  const handleEdit = (lesson: AcademyLesson) => {
    setEditingId(lesson.id);
    setForm({
      module_slug: lesson.module_slug,
      module_title: lesson.module_title,
      lesson_title: lesson.lesson_title,
      video_url: lesson.video_url,
      sort_order: lesson.sort_order,
    });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("academy_lessons").delete().eq("id", id);
    toast.success("Lesson deleted");
    refetch();
  };

  if (!isAdmin) {
    return <Navigate to="/academy/home" replace />;
  }

  // Group lessons by module
  const grouped = lessons.reduce<Record<string, AcademyLesson[]>>((acc, l) => {
    (acc[l.module_slug] = acc[l.module_slug] || []).push(l);
    return acc;
  }, {});

  return (
    <AcademyLayout>
      <PageHeader
        title="Admin Panel"
        subtitle="Manage Academy content and users"
      />
      <div className="px-4 md:px-6 pb-6 space-y-8">
        {/* Lesson Management */}
        <div>
          <p className="section-title mb-3">Manage Lessons</p>
          <Card className="p-5 max-w-2xl space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Module Slug</Label>
                <Input
                  placeholder="e.g. discipline-foundations"
                  value={form.module_slug}
                  onChange={(e) => setForm((f) => ({ ...f, module_slug: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Module Title</Label>
                <Input
                  placeholder="e.g. Discipline Foundations"
                  value={form.module_title}
                  onChange={(e) => setForm((f) => ({ ...f, module_title: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Lesson Title</Label>
                <Input
                  placeholder="e.g. Why Discipline Beats Strategy"
                  value={form.lesson_title}
                  onChange={(e) => setForm((f) => ({ ...f, lesson_title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sort Order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Video URL</Label>
              <Input
                placeholder="https://www.youtube.com/watch?v=... or Vimeo/Loom link"
                value={form.video_url}
                onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveLesson} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {editingId ? "Update Lesson" : "Add Lesson"}
              </Button>
              {editingId && (
                <Button variant="ghost" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}>
                  Cancel
                </Button>
              )}
            </div>
          </Card>

          {/* Existing lessons grouped by module */}
          {lessonsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <Card className="p-6 text-center mt-4 max-w-2xl">
              <p className="text-sm text-muted-foreground">No lessons added yet.</p>
            </Card>
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
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(l)} className="h-7 w-7 p-0">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(l.id)} className="h-7 w-7 p-0 text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coach Requests */}
        <div>
          <p className="section-title mb-3">Coach Requests</p>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">No requests yet.</p>
            </Card>
          ) : (
            <div className="space-y-2 max-w-2xl">
              {requests.map((req) => (
                <Card key={req.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider bg-muted px-2 py-0.5 rounded text-muted-foreground">
                          {req.category}
                        </span>
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-medium",
                          req.status === "open" ? "text-amber-400" : "text-emerald-400"
                        )}>
                          {req.status === "open" ? (
                            <Clock className="h-3 w-3" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          {req.status}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {format(new Date(req.created_at), "MMM d, HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{req.message}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatus(req.id, req.status)}
                      disabled={updating === req.id}
                      className="shrink-0 text-xs"
                    >
                      {updating === req.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : req.status === "open" ? (
                        "Resolve"
                      ) : (
                        "Reopen"
                      )}
                    </Button>
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
