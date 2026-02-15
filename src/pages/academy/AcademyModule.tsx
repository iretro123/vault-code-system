import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useAcademyModules } from "@/hooks/useAcademyModules";
import { useAcademyLessons, AcademyLesson } from "@/hooks/useAcademyLessons";
import { useLessonProgress } from "@/hooks/useLessonProgress";
import { useAcademyRole } from "@/hooks/useAcademyRole";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, PlayCircle, X, Loader2, Check, CheckCircle2, Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function getEmbedUrl(url: string): string | null {
  try {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
    if (url.includes("/embed")) return url;
  } catch {}
  return null;
}

const AcademyModule = () => {
  const { moduleSlug } = useParams();
  const navigate = useNavigate();
  const { modules, loading: modsLoading } = useAcademyModules();
  const { lessons, loading: lessonsLoading, refetch: refetchLessons } = useAcademyLessons(moduleSlug);
  const { progress, markComplete } = useLessonProgress();
  const { isAdmin } = useAcademyRole();

  const [activeLesson, setActiveLesson] = useState<AcademyLesson | null>(null);

  // Admin: add lesson
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const mod = modules.find((m) => m.slug === moduleSlug);
  const loading = modsLoading || lessonsLoading;

  if (!loading && !mod) {
    return <Navigate to="/academy/learn" replace />;
  }

  const handleAddLesson = async () => {
    if (!newTitle.trim() || !mod) return;
    setSaving(true);
    const { error } = await supabase.from("academy_lessons").insert({
      module_slug: mod.slug,
      module_title: mod.title,
      lesson_title: newTitle.trim(),
      video_url: newVideoUrl.trim(),
      notes: newNotes.trim(),
      sort_order: lessons.length + 1,
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Lesson added");
    setNewTitle(""); setNewVideoUrl(""); setNewNotes("");
    setShowAdd(false);
    refetchLessons();
  };

  const handleUpdateLesson = async (id: string) => {
    setSaving(true);
    const { error } = await supabase.from("academy_lessons")
      .update({ lesson_title: editTitle.trim(), video_url: editVideoUrl.trim(), notes: editNotes.trim() } as any)
      .eq("id", id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Lesson updated");
    setEditingId(null);
    refetchLessons();
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm("Delete this lesson?")) return;
    await supabase.from("academy_lessons").delete().eq("id", id);
    toast.success("Lesson deleted");
    if (activeLesson?.id === id) setActiveLesson(null);
    refetchLessons();
  };

  return (
    <AcademyLayout>
      <div className="px-4 md:px-6 pt-4">
        <button
          onClick={() => navigate("/academy/learn")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Modules
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <PageHeader title={mod!.title} subtitle={mod!.subtitle} />

          <div className="px-4 md:px-6 pb-6">
            <div className="max-w-3xl space-y-4">
              {/* Active lesson player */}
              {activeLesson && (
                <Card className="overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                    <span className="text-xs font-medium text-muted-foreground">
                      {activeLesson.lesson_title}
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setActiveLesson(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {activeLesson.video_url ? (() => {
                    const embedUrl = getEmbedUrl(activeLesson.video_url);
                    if (embedUrl) {
                      return (
                        <AspectRatio ratio={16 / 9}>
                          <iframe
                            src={embedUrl}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="Lesson video"
                          />
                        </AspectRatio>
                      );
                    }
                    return (
                      <div className="p-6 text-center">
                        <a href={activeLesson.video_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                          Open video in new tab →
                        </a>
                      </div>
                    );
                  })() : (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No video URL set for this lesson.
                    </div>
                  )}

                  {/* Notes */}
                  {(activeLesson as any).notes && (
                    <div className="px-4 py-3 border-t border-border bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm text-foreground/90 whitespace-pre-line">
                        {(activeLesson as any).notes}
                      </p>
                    </div>
                  )}

                  {/* Mark complete */}
                  <div className="px-4 py-3 border-t border-border">
                    {progress[activeLesson.id] ? (
                      <div className="flex items-center gap-2 text-primary text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        Completed
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => markComplete(activeLesson.id)}>
                        <Check className="h-3.5 w-3.5" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </Card>
              )}

              {/* Lesson list */}
              <div className="space-y-2">
                {lessons.map((lesson, i) => {
                  const isCompleted = progress[lesson.id];
                  const isActive = activeLesson?.id === lesson.id;
                  const isEditing = editingId === lesson.id;

                  if (isEditing && isAdmin) {
                    return (
                      <Card key={lesson.id} className="p-4 space-y-2">
                        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Lesson title" />
                        <Input value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.target.value)} placeholder="Video URL (YouTube, Vimeo, Loom)" />
                        <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes (optional)" rows={3} className="resize-none" />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdateLesson(lesson.id)} disabled={saving}>
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      </Card>
                    );
                  }

                  return (
                    <Card
                      key={lesson.id}
                      className={cn(
                        "p-4 group cursor-pointer transition-colors hover:bg-muted/30",
                        isActive && "border-primary/30 bg-primary/5"
                      )}
                      onClick={() => setActiveLesson(lesson)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          isCompleted ? "bg-primary/10" : "bg-muted"
                        )}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <span className="text-xs font-mono font-semibold text-muted-foreground">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={cn(
                            "text-sm font-medium",
                            isCompleted ? "text-primary" : "text-foreground"
                          )}>
                            {lesson.lesson_title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(lesson.id);
                                  setEditTitle(lesson.lesson_title);
                                  setEditVideoUrl(lesson.video_url);
                                  setEditNotes((lesson as any).notes || "");
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
                                  handleDeleteLesson(lesson.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          <PlayCircle className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {lessons.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No lessons yet.{isAdmin && " Add your first lesson below."}
                  </p>
                )}
              </div>

              {/* Admin: Add lesson */}
              {isAdmin && (
                showAdd ? (
                  <Card className="vault-card p-4 space-y-2">
                    <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Lesson title" />
                    <Input value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} placeholder="Video URL (YouTube, Vimeo, Loom)" />
                    <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Notes (optional)" rows={3} className="resize-none" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddLesson} disabled={saving || !newTitle.trim()}>
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add Lesson"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
                    </div>
                  </Card>
                ) : (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Lesson
                  </Button>
                )
              )}
            </div>
          </div>
        </>
      )}
    </AcademyLayout>
  );
};

export default AcademyModule;
