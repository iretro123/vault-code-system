import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAcademyLessons, AcademyLesson } from "@/hooks/useAcademyLessons";
import { toast } from "sonner";

const EMPTY_FORM = { module_slug: "", module_title: "", lesson_title: "", video_url: "", sort_order: 0 };

export function AdminContentTab() {
  const { lessons, loading, refetch } = useAcademyLessons();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
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
    setForm({
      module_slug: lesson.module_slug, module_title: lesson.module_title,
      lesson_title: lesson.lesson_title, video_url: lesson.video_url, sort_order: lesson.sort_order,
    });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("academy_lessons").delete().eq("id", id);
    toast.success("Lesson deleted");
    refetch();
  };

  const grouped = lessons.reduce<Record<string, AcademyLesson[]>>((acc, l) => {
    (acc[l.module_slug] = acc[l.module_slug] || []).push(l);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Add/Edit form */}
      <Card className="p-5 space-y-3">
        <p className="text-sm font-medium text-foreground">
          {editingId ? "Edit Lesson" : "Add New Lesson"}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Module Slug</Label>
            <Input value={form.module_slug} onChange={(e) => setForm({ ...form, module_slug: e.target.value })} placeholder="e.g. module-1" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Module Title</Label>
            <Input value={form.module_title} onChange={(e) => setForm({ ...form, module_title: e.target.value })} placeholder="e.g. Foundation" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Lesson Title</Label>
            <Input value={form.lesson_title} onChange={(e) => setForm({ ...form, lesson_title: e.target.value })} placeholder="e.g. Introduction to Risk" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Video URL</Label>
            <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://..." />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {editingId ? "Update" : "Add Lesson"}
          </Button>
          {editingId && (
            <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}>
              Cancel
            </Button>
          )}
        </div>
      </Card>

      {/* Lessons list */}
      {Object.entries(grouped).map(([slug, moduleLessons]) => (
        <div key={slug} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {moduleLessons[0]?.module_title || slug}
          </p>
          {moduleLessons.sort((a, b) => a.sort_order - b.sort_order).map((l) => (
            <Card key={l.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{l.lesson_title}</p>
                <p className="text-xs text-muted-foreground truncate">{l.video_url}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(l)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(l.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ))}

      {lessons.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">No lessons yet. Add one above.</p>
        </Card>
      )}
    </div>
  );
}
