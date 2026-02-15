import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, Loader2, Pencil, Trash2, BookOpen } from "lucide-react";
import { useAcademyModules } from "@/hooks/useAcademyModules";
import { useAcademyLessons } from "@/hooks/useAcademyLessons";
import { useLessonProgress } from "@/hooks/useLessonProgress";
import { useAcademyRole } from "@/hooks/useAcademyRole";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

const AcademyLearn = () => {
  const navigate = useNavigate();
  const { modules, loading: modsLoading, refetch: refetchModules } = useAcademyModules();
  const { lessons, loading: lessonsLoading } = useAcademyLessons();
  const { progress } = useLessonProgress();
  const { isAdmin } = useAcademyRole();

  // Admin: add module form
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");

  const handleAddModule = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    const slug = newTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("academy_modules").insert({
      title: newTitle.trim(),
      subtitle: newSubtitle.trim(),
      slug,
      sort_order: modules.length + 1,
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Module added");
    setNewTitle("");
    setNewSubtitle("");
    setShowAdd(false);
    refetchModules();
  };

  const handleUpdateModule = async (id: string) => {
    if (!editTitle.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("academy_modules")
      .update({ title: editTitle.trim(), subtitle: editSubtitle.trim() } as any)
      .eq("id", id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Module updated");
    setEditingId(null);
    refetchModules();
  };

  const handleDeleteModule = async (id: string, slug: string) => {
    if (!confirm("Delete this module and all its lessons?")) return;
    // Delete lessons first
    await supabase.from("academy_lessons").delete().eq("module_slug", slug);
    await supabase.from("academy_modules").delete().eq("id", id);
    toast.success("Module deleted");
    refetchModules();
  };

  const loading = modsLoading || lessonsLoading;

  // Count lessons per module
  const lessonsByModule = lessons.reduce<Record<string, typeof lessons>>((acc, l) => {
    (acc[l.module_slug] ||= []).push(l);
    return acc;
  }, {});

  return (
    <AcademyLayout>
      <PageHeader
        title="Lessons"
        subtitle="Learn trading discipline step by step"
      />
      <div className="px-4 md:px-6 pb-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {modules.map((mod, i) => {
              const modLessons = lessonsByModule[mod.slug] || [];
              const completedCount = modLessons.filter((l) => progress[l.id]).length;
              const isEditing = editingId === mod.id;

              return (
                <Card key={mod.id} className="vault-card group relative overflow-hidden">
                  {isEditing && isAdmin ? (
                    <div className="p-4 space-y-2">
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
                      <Input value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)} placeholder="Subtitle" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdateModule(mod.id)} disabled={saving}>
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="p-5 cursor-pointer transition-colors hover:bg-muted/30"
                      onClick={() => navigate(`/academy/learn/${mod.slug}`)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-muted flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-mono text-muted-foreground/50 block mb-0.5">
                            Module {String(i + 1).padStart(2, "0")}
                          </span>
                          <h3 className="font-semibold text-foreground text-sm leading-tight">
                            {mod.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {mod.subtitle}
                          </p>
                          <p className="text-[11px] text-muted-foreground/50 mt-2">
                            {modLessons.length} lessons
                            {modLessons.length > 0 && (
                              <span className="text-primary ml-1.5">
                                · {completedCount}/{modLessons.length} complete
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 mt-1">
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(mod.id);
                                  setEditTitle(mod.title);
                                  setEditSubtitle(mod.subtitle);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteModule(mod.id, mod.slug);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}

            {/* Admin: Add module */}
            {isAdmin && (
              showAdd ? (
                <Card className="vault-card p-4 space-y-2">
                  <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Module title" />
                  <Input value={newSubtitle} onChange={(e) => setNewSubtitle(e.target.value)} placeholder="Subtitle (optional)" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddModule} disabled={saving || !newTitle.trim()}>
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add Module"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
                  </div>
                </Card>
              ) : (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Module
                </Button>
              )
            )}
          </div>
        )}
      </div>
    </AcademyLayout>
  );
};

export default AcademyLearn;
