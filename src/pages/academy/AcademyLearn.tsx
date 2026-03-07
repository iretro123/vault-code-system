import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, Pencil, Trash2, Lock, Bell, Play, ArrowRight, EyeOff } from "lucide-react";
import { AdminActionBar } from "@/components/admin/AdminActionBar";
import { VaultPlaybookIcon } from "@/components/icons/VaultPlaybookIcon";
import { useAcademyModules } from "@/hooks/useAcademyModules";
import { useAcademyLessons } from "@/hooks/useAcademyLessons";
import { useLessonProgress } from "@/hooks/useLessonProgress";
import { useAdminMode } from "@/contexts/AdminModeContext";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { supabase } from "@/integrations/supabase/client";
import { SendNotificationModal } from "@/components/academy/SendNotificationModal";
import { ClaimRoleBanner } from "@/components/academy/ClaimRoleBanner";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import courseCoverDefault from "@/assets/course-cover-default.jpg";
import { usePlaybookProgress } from "@/hooks/usePlaybookProgress";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { PremiumGate } from "@/components/academy/PremiumGate";

const AcademyLearn = () => {
  const navigate = useNavigate();
  const { hasAccess, status, loading: accessLoading } = useStudentAccess();
  const { modules: allModules, loading: modsLoading, refetch: refetchModules } = useAcademyModules();
  const { lessons: allLessons, loading: lessonsLoading } = useAcademyLessons();
  const { progress } = useLessonProgress();
  const { isAdminActive } = useAdminMode();
  const { hasPermission } = useAcademyPermissions();
  const canManageContent = isAdminActive && hasPermission("manage_content");
  const { totalCount: pbTotal, completedCount: pbDone, pct: pbPct, nextChapter: pbNext } = usePlaybookProgress();

  // Filter hidden modules for non-admins
  const modules = useMemo(() =>
    canManageContent ? allModules : allModules.filter(m => m.visible !== false),
    [allModules, canManageContent]
  );
  const lessons = useMemo(() =>
    canManageContent ? allLessons : allLessons.filter(l => l.visible !== false),
    [allLessons, canManageContent]
  );

  // Admin state
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editVisible, setEditVisible] = useState(true);
  const [notifyOpen, setNotifyOpen] = useState(false);

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

  const handleUpdateModule = async (id: string, oldSlug: string) => {
    if (!editTitle.trim()) return;
    setSaving(true);
    const newSlug = editTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("academy_modules")
      .update({ title: editTitle.trim(), subtitle: editSubtitle.trim(), slug: newSlug, visible: editVisible } as any)
      .eq("id", id);
    if (error) { setSaving(false); toast.error(error.message); return; }
    if (newSlug !== oldSlug) {
      await supabase.from("academy_lessons")
        .update({ module_slug: newSlug, module_title: editTitle.trim() } as any)
        .eq("module_slug", oldSlug);
    }
    setSaving(false);
    toast.success("Module updated");
    setEditingId(null);
    refetchModules();
  };

  const handleDeleteModule = async (id: string, slug: string) => {
    if (!confirm("Delete this module and all its lessons?")) return;
    await supabase.from("academy_lessons").delete().eq("module_slug", slug);
    await supabase.from("academy_modules").delete().eq("id", id);
    toast.success("Module deleted");
    refetchModules();
  };

  const loading = modsLoading || lessonsLoading;

  const lessonsByModule = lessons.reduce<Record<string, typeof lessons>>((acc, l) => {
    (acc[l.module_slug] ||= []).push(l);
    return acc;
  }, {});

  if (!hasAccess && !accessLoading) {
    return <PremiumGate status={status} pageName="Courses" />;
  }

  return (
    <>
      <div className="px-4 md:px-8 pt-6 pb-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Courses</h1>
          <p className="text-muted-foreground mt-1">Master discipline, one module at a time.</p>
          {!loading && lessons.length > 0 && (() => {
            const totalLessons = lessons.length;
            const completedLessons = lessons.filter((l) => progress[l.id]).length;
            const overallPct = Math.round((completedLessons / totalLessons) * 100);
            return (
              <div className="mt-4 flex items-center gap-3">
                <Progress value={overallPct} className="h-2 flex-1 max-w-xs" />
                <span className="text-sm font-medium text-muted-foreground">
                  {overallPct}% overall ({completedLessons}/{totalLessons} lessons)
                </span>
              </div>
            );
          })()}
        </div>

        <AdminActionBar
          title="Learn Admin"
          permission="manage_content"
          actions={[
            { label: "Reorder Modules", disabled: true },
            { label: "Add Module", disabled: true },
          ]}
        />

        <ClaimRoleBanner />

        {/* Playbook Hero Strip */}
        {pbTotal > 0 && pbDone < pbTotal && (
          <div
            className="vault-glass-card p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer hover:border-primary/20 transition-colors"
            onClick={() => navigate(`/academy/playbook${pbNext ? `?chapter=${pbNext.id}` : ""}`)}
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <VaultPlaybookIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-foreground">Vault Playbook</h3>
                <p className="text-xs text-muted-foreground">Finish the OS before you binge modules.</p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wide bg-primary/20 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">Start Here</span>
              <div className="text-right">
                <span className="text-sm font-bold text-foreground">{pbPct}%</span>
                <p className="text-[10px] text-muted-foreground">{pbDone}/{pbTotal}</p>
              </div>
              <Button size="sm" className="gap-1.5">
                {pbDone > 0 ? "Continue" : "Open"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {loading && modules.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
                <div className="aspect-[16/9] bg-muted/40" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-3/4 rounded bg-muted/40" />
                  <div className="h-3 w-1/2 rounded bg-muted/30" />
                  <div className="h-1.5 w-full rounded bg-muted/20 mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Course grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {modules.map((mod, i) => {
                const modLessons = lessonsByModule[mod.slug] || [];
                const completedCount = modLessons.filter((l) => progress[l.id]).length;
                const totalLessons = modLessons.length;
                const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
                const isStarted = completedCount > 0;
                const isComplete = totalLessons > 0 && completedCount === totalLessons;
                const isEditing = editingId === mod.id;
                const isLocked = false;
                const isHidden = mod.visible === false;

                if (isEditing && isAdmin) {
                  return (
                    <Card key={mod.id} className="vault-card p-5 space-y-3">
                      <h3 className="text-sm font-semibold text-foreground">Edit Module</h3>
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
                      <Input value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)} placeholder="Subtitle" />
                      <div className="flex items-center justify-between py-1">
                        <label className="text-sm text-muted-foreground">Visible to members</label>
                        <Switch checked={editVisible} onCheckedChange={setEditVisible} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdateModule(mod.id, mod.slug)} disabled={saving}>
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </Card>
                  );
                }

                return (
                  <Card
                    key={mod.id}
                    className={cn(
                      "vault-card overflow-hidden group transition-colors transition-shadow duration-200",
                      isLocked ? "opacity-70" : "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 cursor-pointer",
                      isHidden && isAdmin && "opacity-60 border-dashed"
                    )}
                    onClick={() => !isLocked && navigate(`/academy/learn/${mod.slug}`)}
                  >
                    {/* Cover image */}
                    <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                      <img
                        src={mod.cover_image_url || courseCoverDefault}
                        alt={mod.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                      {/* Module number badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-sm text-[11px] font-mono text-white/70">
                          Module {String(i + 1).padStart(2, "0")}
                        </span>
                        {isHidden && isAdmin && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-500/80 backdrop-blur-sm text-[10px] font-semibold text-black">
                            <EyeOff className="h-3 w-3" /> Hidden
                          </span>
                        )}
                      </div>

                      {/* Lock overlay */}
                      {isLocked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px]">
                          <Lock className="h-8 w-8 text-white/40 mb-2" />
                          <span className="text-xs font-medium text-white/50">Private Access</span>
                        </div>
                      )}

                      {/* Play icon on hover */}
                      {!isLocked && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="h-12 w-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                            <Play className="h-5 w-5 text-primary-foreground ml-0.5" fill="currentColor" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="font-semibold text-foreground text-base leading-snug mb-1">{mod.title}</h3>
                      {mod.subtitle && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{mod.subtitle}</p>
                      )}

                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground">
                            {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}
                          </span>
                          <span className={cn(
                            "text-xs font-medium",
                            isComplete ? "text-emerald-400" : "text-muted-foreground"
                          )}>
                            {progressPct}% complete
                          </span>
                        </div>
                        <Progress value={progressPct} className="h-1.5" />
                      </div>

                      {/* CTA */}
                      <div className="flex items-center gap-2">
                        {isLocked ? (
                          <Button disabled variant="secondary" className="w-full gap-2">
                            <Lock className="h-4 w-4" /> Locked
                          </Button>
                        ) : isComplete ? (
                          <Button variant="secondary" className="w-full gap-2">
                            Review <ArrowRight className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button className="w-full gap-2">
                            {isStarted ? "Continue" : "Start"} <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Admin controls */}
                        {isAdmin && (
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(mod.id);
                                setEditTitle(mod.title);
                                setEditSubtitle(mod.subtitle);
                                setEditVisible(mod.visible !== false);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteModule(mod.id, mod.slug);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Admin: Add module */}
            {isAdmin && (
              <div className="mt-6">
                {showAdd ? (
                  <Card className="vault-card p-5 space-y-3 max-w-md">
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
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
                      <Plus className="h-3.5 w-3.5" /> Add Module
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setNotifyOpen(true)}>
                      <Bell className="h-3.5 w-3.5" /> Notify: New Module
                    </Button>
                    <SendNotificationModal
                      open={notifyOpen}
                      onClose={() => setNotifyOpen(false)}
                      defaultType="new_module"
                      defaultTitle="New module available!"
                      defaultLinkPath="/academy/learn"
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default AcademyLearn;
