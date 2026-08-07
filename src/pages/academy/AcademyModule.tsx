import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useAcademyModules } from "@/hooks/useAcademyModules";
import { useAcademyLessons, AcademyLesson } from "@/hooks/useAcademyLessons";
import { useLessonProgress } from "@/hooks/useLessonProgress";
import { useAdminMode } from "@/contexts/AdminModeContext";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { AdminActionBar } from "@/components/admin/AdminActionBar";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, ArrowRight, Loader2, Check, CheckCircle2, Plus, Pencil, Trash2,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Play, EyeOff,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import LessonQuiz from "@/components/academy/LessonQuiz";
import { useAuth } from "@/hooks/useAuth";
import { useIsBasicTier } from "@/hooks/useIsBasicTier";
import { isSharedGuestAccount } from "@/lib/membership";
import { getVideoEmbedUrl } from "@/lib/videoEmbeds";
import { openExternalUrl } from "@/lib/externalLinks";
import { VAULT_BOOTCAMP_URL } from "./AcademyBootcamp";

const AcademyModule = () => {
  const { moduleSlug } = useParams();
  const navigate = useNavigate();
  const { modules, loading: modsLoading } = useAcademyModules();
  const { lessons: allLessons, loading: lessonsLoading, refetch: refetchLessons } = useAcademyLessons(moduleSlug);
  const { progress, markComplete } = useLessonProgress();
  const { isAdminActive } = useAdminMode();
  const { hasPermission } = useAcademyPermissions();
  const canManageContent = isAdminActive && hasPermission("manage_content");
  const isMobile = useIsMobile();
  const { user, profile } = useAuth();
  const { isBasicTier } = useIsBasicTier();
  const sharedGuest = isSharedGuestAccount(user, profile);
  const isGuestOrBasic = isBasicTier || sharedGuest;
  const isBasicMiniCourse = moduleSlug === "chapter-1-basic-bridge";

  // Filter hidden lessons for non-admins
  const lessons = useMemo(() =>
    canManageContent ? allLessons : allLessons.filter(l => l.visible !== false),
    [allLessons, canManageContent]
  );

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
  const [editVisible, setEditVisible] = useState(true);

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
  const isMiniCourseComplete = isBasicMiniCourse && lessons.length > 0 && completedCount === lessons.length;
  const openBootcampLanding = () => openExternalUrl(VAULT_BOOTCAMP_URL);

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
      .update({
        lesson_title: editTitle.trim(),
        video_url: editVideoUrl.trim(),
        notes: editNotes.trim(),
        visible: editVisible,
      } as any)
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
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 max-w-full flex-col h-[calc(100vh-3.5rem-4rem)] md:h-[calc(100vh-4rem)] overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 shrink-0">
        <button
          onClick={() => {
            if (isMobile && !sidebarOpen) {
              setSidebarOpen(true);
            } else {
              navigate("/academy/learn");
            }
          }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Courses</span>
        </button>
        <div className="h-4 w-px bg-border" />
        <h1 className="text-sm font-semibold text-foreground truncate flex-1">
          {isBasicMiniCourse && !isGuestOrBasic && !canManageContent
            ? "Beginner Bridge — Foundations"
            : mod!.title}
        </h1>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">{progressPct}%</span>
          <Progress value={progressPct} className="w-20 h-1.5" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 md:hidden gap-1 text-xs"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? "Hide" : "Lessons"}
          {sidebarOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <div className="flex min-w-0 max-w-full flex-1 overflow-hidden">
        {/* Sidebar - lesson list */}
        <div className={cn(
          "border-r border-border bg-card/30 shrink-0 flex flex-col min-w-0 max-w-full overflow-hidden transition-all duration-200",
          sidebarOpen ? "w-full max-w-[100vw] md:w-72 md:max-w-72 lg:w-80 lg:max-w-80" : "w-0 md:w-72 lg:w-80",
          !sidebarOpen && "md:flex hidden overflow-hidden"
        )}>
          <div className={cn("flex min-w-0 max-w-full flex-col flex-1 overflow-hidden", !sidebarOpen && "hidden md:flex")}>
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs text-muted-foreground font-medium">
                {completedCount}/{lessons.length} lessons complete
              </p>
            </div>

            <ScrollArea className="min-w-0 max-w-full flex-1 overflow-x-hidden">
              <div className="min-w-0 max-w-full overflow-x-hidden py-1">
                {lessons.map((lesson, i) => {
                  const isCompleted = progress[lesson.id];
                  const isActive = activeLesson?.id === lesson.id;
                  const isHidden = lesson.visible === false;

                  return (
                    <button
                      key={lesson.id}
                      onClick={() => { setActiveLessonId(lesson.id); setSidebarOpen(false); }}
                      className={cn(
                        "w-full max-w-full min-w-0 flex items-center gap-3 overflow-hidden px-4 py-3 text-left transition-colors group",
                        isActive
                          ? "bg-primary/10 border-l-2 border-primary"
                          : "hover:bg-muted/40 border-l-2 border-transparent",
                        isHidden && canManageContent && "opacity-50"
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
                        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <span>{i + 1}</span>}
                      </div>
                      <div className="flex min-w-0 max-w-full flex-1 items-center gap-1.5 overflow-hidden">
                        <span className={cn(
                          "block min-w-0 max-w-full whitespace-normal break-words text-sm leading-snug line-clamp-2",
                          isActive ? "font-medium text-foreground" : "text-muted-foreground"
                        )}>
                          {lesson.lesson_title}
                        </span>
                        {isHidden && canManageContent && (
                          <EyeOff className="h-3 w-3 text-yellow-500 shrink-0" />
                        )}
                      </div>
                      {canManageContent && (
                        <div className="flex gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0">
                          <button
                            className="p-1 hover:text-foreground text-muted-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(lesson.id);
                              setEditTitle(lesson.lesson_title);
                              setEditVideoUrl(lesson.video_url);
                              setEditNotes(lesson.notes || "");
                              setEditVisible(lesson.visible !== false);
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

              {/* CTA for the basic mini-course */}
              {isBasicMiniCourse && isGuestOrBasic && (
                <div className="w-full max-w-full overflow-hidden border-t border-border px-4 py-4">
                  <div className="mx-auto w-full max-w-[21rem] overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      Ready for live bootcamp help?
                    </p>
                    <p className="mx-auto mb-3 max-w-[17rem] break-words text-sm font-semibold leading-snug text-foreground">
                      Join the 21-day Vault Trading Bootcamp after this mini course.
                    </p>
                    <Button
                      type="button"
                      onClick={openBootcampLanding}
                      className="mx-auto inline-flex h-9 w-full max-w-[15rem] items-center justify-center gap-1.5 rounded-lg bg-gradient-to-b from-primary to-[hsl(217,91%,50%)] px-4 text-sm font-medium text-primary-foreground transition-all duration-150 hover:shadow-[0_0_12px_2px_hsl(217_91%_60%/0.10)] hover:brightness-110 active:scale-[0.97]"
                    >
                      <span className="min-w-0 truncate sm:hidden">View Bootcamp</span>
                      <span className="hidden sm:inline">View Bootcamp Details</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Admin: add lesson */}
              {canManageContent && (
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
        <div className={cn(
          "flex-1 min-w-0 flex flex-col overflow-y-auto overflow-x-hidden",
          isMobile && sidebarOpen && "hidden"
        )}>
          {/* Edit panel */}
          {editingId && canManageContent && (() => {
            const lesson = lessons.find((l) => l.id === editingId);
            if (!lesson) return null;
            return (
              <div className="p-6 max-w-2xl mx-auto w-full">
                <Card className="vault-card p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Edit Lesson</h3>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Lesson Title</label>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Lesson title" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">YouTube / Video URL</label>
                    <Input value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Study Notes</label>
                    <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes shown below the video..." rows={4} className="resize-none" />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <label className="text-sm text-muted-foreground">Visible to members</label>
                    <Switch checked={editVisible} onCheckedChange={setEditVisible} />
                  </div>
                  <div className="flex gap-2 pt-1">
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
                  const embedUrl = getVideoEmbedUrl(activeLesson.video_url);
                  if (embedUrl) {
                    return (
                      <div>
                        <AspectRatio ratio={16 / 9} className="max-h-[70vh]">
                          <iframe
                            src={embedUrl}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            referrerPolicy="strict-origin-when-cross-origin"
                            title={activeLesson.lesson_title}
                          />
                        </AspectRatio>
                        <div className="flex justify-center border-t border-white/10 bg-black px-4 py-2">
                          <a
                            href={activeLesson.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-primary underline underline-offset-4"
                          >
                            Video not loading? Open on YouTube
                          </a>
                        </div>
                      </div>
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
              <div className="px-6 py-5 flex-1 pb-32">
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
                    <div className="flex items-center gap-2 shrink-0">
                      {progress[activeLesson.id] && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </span>
                      )}
                      {canManageContent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs h-8"
                          onClick={() => {
                            setEditingId(activeLesson.id);
                            setEditTitle(activeLesson.lesson_title);
                            setEditVideoUrl(activeLesson.video_url);
                            setEditNotes(activeLesson.notes || "");
                            setEditVisible(activeLesson.visible !== false);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {(activeLesson.notes || canManageContent) && (
                    <div className="rounded-lg bg-muted/30 border border-border p-4 mb-6">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Study Notes</p>
                      {activeLesson.notes ? (
                        <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                          {activeLesson.notes.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                            /^https?:\/\//.test(part) ? (
                              <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 break-all">{part}</a>
                            ) : part
                          )}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No notes yet. Click Edit above to add study notes.</p>
                      )}
                    </div>
                  )}

                  {/* Quiz */}
                  <LessonQuiz moduleSlug={moduleSlug} lessonId={activeLesson.id} />

                  {isBasicMiniCourse && isGuestOrBasic && (
                    <div className={cn(
                      "mt-6 overflow-hidden rounded-2xl border p-5",
                      isMiniCourseComplete
                        ? "border-primary/30 bg-primary/10"
                        : "border-white/10 bg-card/70"
                    )}>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                        {isMiniCourseComplete ? "Mini course complete" : "Next step after the mini course"}
                      </p>
                      <h3 className="mt-2 text-lg font-bold text-foreground">
                        {isMiniCourseComplete
                          ? "You finished the bridge. Now see the full Bootcamp."
                          : "When you finish, continue into the Vault Trading Bootcamp."}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        The bootcamp page shows the 21-day live training path, onboarding details, private group structure, and how to reserve your seat.
                      </p>
                      <Button
                        type="button"
                        onClick={openBootcampLanding}
                        className="mt-4 h-11 rounded-xl bg-gradient-to-b from-primary to-[hsl(217,91%,50%)] px-5 font-bold text-white"
                      >
                        View Bootcamp Landing Page
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom action bar */}
              <div className="border-t border-border bg-card/50 px-4 md:px-6 py-3 shrink-0 mb-16 md:mb-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pb-4">
                <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-2">
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
                          if (isBasicMiniCourse && isGuestOrBasic) {
                            openBootcampLanding();
                          } else {
                            navigate("/academy/learn");
                          }
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
                No lessons yet.{canManageContent && " Add your first lesson in the sidebar."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcademyModule;
