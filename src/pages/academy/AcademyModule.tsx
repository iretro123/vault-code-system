import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useAcademyModules } from "@/hooks/useAcademyModules";
import { useAcademyLessons, AcademyLesson } from "@/hooks/useAcademyLessons";
import { useLessonProgress } from "@/hooks/useLessonProgress";
import { useAcademyRole } from "@/hooks/useAcademyRole";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Loader2, Check, CheckCircle2, Plus, Pencil, Trash2,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Play,
} from "lucide-react";
import { useState, useMemo } from "react";
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

  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Admin state
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

  // Auto-select first incomplete lesson (or first lesson)
  const activeLesson = useMemo(() => {
    if (!lessons.length) return null;
    if (activeLessonId) return lessons.find((l) => l.id === activeLessonId) || lessons[0];
    const firstIncomplete = lessons.find((l) => !progress[l.id]);
    return firstIncomplete || lessons[0];
  }, [lessons, activeLessonId, progress]);

  const activeIndex = activeLesson ? lessons.findIndex((l) => l.id === activeLesson.id) : -1;
  const completedCount = lessons.filter((l) => progress[l.id]).length;
  const progressPct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  if (!loading && !mod) {
    return <Navigate to="/academy/learn" replace />;
  }

  const goToLesson = (index: number) => {
    if (index >= 0 && index < lessons.length) {
      setActiveLessonId(lessons[index].id);
    }
  };

  const handleMarkComplete = async () => {
    if (!activeLesson) return;
    await markComplete(activeLesson.id);
    // Auto-advance to next incomplete
    const nextIncomplete = lessons.find((l, i) => i > activeIndex && !progress[l.id]);
    if (nextIncomplete) setActiveLessonId(nextIncomplete.id);
  };

  const handleAddLesson = async () => {
    if (!newTitle.trim() || !mod) return;
    setSaving(true);
    const { error } = await supabase.from("academy_lessons").insert({
      module_slug: mod.slug, module_title: mod.title,
      lesson_title: newTitle.trim(), video_url: newVideoUrl.trim(),
      notes: newNotes.trim(), sort_order: lessons.length + 1,
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
    if (activeLessonId === id) setActiveLessonId(null);
    refetchLessons();
  };

  if (loading) {
    return (
      <>
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <AcademyLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 shrink-0">
          <button
            onClick={() => navigate("/academy/learn")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Courses</span>
          </button>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-sm font-semibold text-foreground truncate flex-1">{mod!.title}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">{progressPct}%</span>
            <Progress value={progressPct} className="w-20 h-1.5" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - lesson list */}
          <div className={cn(
            "border-r border-border bg-card/30 shrink-0 flex flex-col transition-all duration-200",
            sidebarOpen ? "w-full md:w-72 lg:w-80" : "w-0 md:w-72 lg:w-80",
            !sidebarOpen && "md:flex hidden overflow-hidden"
          )}>
            {/* Mobile: collapsible; Desktop: always visible */}
            <div className={cn("flex flex-col flex-1 overflow-hidden", !sidebarOpen && "hidden md:flex")}>
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs text-muted-foreground font-medium">
                  {completedCount}/{lessons.length} lessons complete
                </p>
              </div>

              <ScrollArea className="flex-1">
                <div className="py-1">
                  {lessons.map((lesson, i) => {
                    const isCompleted = progress[lesson.id];
                    const isActive = activeLesson?.id === lesson.id;

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => { setActiveLessonId(lesson.id); setSidebarOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors group",
                          isActive
                            ? "bg-primary/10 border-l-2 border-primary"
                            : "hover:bg-muted/40 border-l-2 border-transparent"
                        )}
                      >
                        <div className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-mono",
                          isCompleted
                            ? "bg-primary/20 text-primary"
                            : isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                        )}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <span>{i + 1}</span>
                          )}
                        </div>
                        <span className={cn(
                          "text-sm leading-snug flex-1 min-w-0 truncate",
                          isActive ? "font-medium text-foreground" : "text-muted-foreground"
                        )}>
                          {lesson.lesson_title}
                        </span>
                        {isAdmin && (
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
                            <button
                              className="p-1 hover:text-foreground text-muted-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(lesson.id);
                                setEditTitle(lesson.lesson_title);
                                setEditVideoUrl(lesson.video_url);
                                setEditNotes(lesson.notes || "");
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              className="p-1 hover:text-destructive text-muted-foreground"
                              onClick={(e) => { e.stopPropagation(); handleDeleteLesson(lesson.id); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Admin: add lesson */}
                {isAdmin && (
                  <div className="px-4 py-3 border-t border-border">
                    {showAdd ? (
                      <div className="space-y-2">
                        <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Lesson title" className="h-8 text-sm" />
                        <Input value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} placeholder="Video URL" className="h-8 text-sm" />
                        <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Notes" rows={2} className="resize-none text-sm" />
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs" onClick={handleAddLesson} disabled={saving || !newTitle.trim()}>
                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAdd(false)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs h-8" onClick={() => setShowAdd(true)}>
                        <Plus className="h-3 w-3" /> Add Lesson
                      </Button>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Edit modal overlay */}
            {editingId && isAdmin && (() => {
              const lesson = lessons.find((l) => l.id === editingId);
              if (!lesson) return null;
              return (
                <div className="p-6 max-w-2xl mx-auto w-full">
                  <Card className="vault-card p-5 space-y-3">
                    <h3 className="text-sm font-semibold">Edit Lesson</h3>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Lesson title" />
                    <Input value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.target.value)} placeholder="Video URL" />
                    <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes" rows={3} className="resize-none" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdateLesson(editingId)} disabled={saving}>
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </Card>
                </div>
              );
            })()}

            {/* Video player */}
            {!editingId && activeLesson && (
              <div className="flex flex-col flex-1">
                {/* Video */}
                <div className="w-full bg-black">
                  {activeLesson.video_url ? (() => {
                    const embedUrl = getEmbedUrl(activeLesson.video_url);
                    if (embedUrl) {
                      return (
                        <AspectRatio ratio={16 / 9} className="max-h-[70vh]">
                          <iframe
                            src={embedUrl}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={activeLesson.lesson_title}
                          />
                        </AspectRatio>
                      );
                    }
                    return (
                      <div className="flex items-center justify-center py-20">
                        <a href={activeLesson.video_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                          Open video in new tab →
                        </a>
                      </div>
                    );
                  })() : (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <Play className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No video for this lesson</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lesson info */}
                <div className="px-6 py-5 flex-1">
                  <div className="max-w-3xl mx-auto">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Lesson {activeIndex + 1} of {lessons.length}
                        </p>
                        <h2 className="text-xl font-semibold text-foreground">
                          {activeLesson.lesson_title}
                        </h2>
                      </div>
                      {progress[activeLesson.id] && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md shrink-0">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </span>
                      )}
                    </div>

                    {/* Notes */}
                    {activeLesson.notes && (
                      <div className="rounded-lg bg-muted/30 border border-border p-4 mb-6">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Study Notes</p>
                        <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                          {activeLesson.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom action bar */}
                <div className="border-t border-border bg-card/50 px-6 py-4 shrink-0">
                  <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      disabled={activeIndex <= 0}
                      onClick={() => goToLesson(activeIndex - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex items-center gap-2">
                      {!progress[activeLesson.id] && (
                        <Button
                          size="sm"
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={handleMarkComplete}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Mark Complete
                        </Button>
                      )}

                      {activeIndex < lessons.length - 1 ? (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            if (!progress[activeLesson.id]) markComplete(activeLesson.id);
                            goToLesson(activeIndex + 1);
                          }}
                        >
                          Next Lesson
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            if (!progress[activeLesson.id]) markComplete(activeLesson.id);
                            navigate("/academy/learn");
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Finish Course
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* No lessons state */}
            {!editingId && !activeLesson && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  No lessons yet.{isAdmin && " Add your first lesson in the sidebar."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AcademyLayout>
  );
};

export default AcademyModule;
