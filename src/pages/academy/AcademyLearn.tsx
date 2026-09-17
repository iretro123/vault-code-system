import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Link, useNavigate } from "react-router-dom";
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
import dayTradingVocabularyCover from "@/assets/day-trading-vocabulary.png";
import { usePlaybookProgress } from "@/hooks/usePlaybookProgress";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { PremiumGate } from "@/components/academy/PremiumGate";
import { useIsBasicTier } from "@/hooks/useIsBasicTier";
import { isSharedGuestAccount } from "@/lib/membership";
import { useAuth } from "@/hooks/useAuth";
import { getYouTubeThumbnail } from "@/lib/videoEmbeds";
import playbookCover from "@/assets/vault-playbook-cover.jpg";
import "./academy-learn.css";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { localCourseCover } from "@/lib/localCourseCovers";
import ChartClassroom from "@/components/academy/ChartClassroom";

const shortChapterNames: Record<number, string> = {
  1: "Vault Install",
  2: "Chart Setup",
  3: "Market Structure",
  4: "Supply & Demand",
  5: "Entries & Execution",
  6: "Trading Playbooks",
  7: "Trader Mindset",
  8: "Backtesting Lab",
  9: "Coaching Replays",
  10: "Vault Archive",
};

const AcademyLearn = () => {
  const navigate = useNavigate();
  const { hasAccess, status, loading: accessLoading } = useStudentAccess();
  const { modules: allModules, loading: modsLoading, refetch: refetchModules } = useAcademyModules();
  const { lessons: allLessons, loading: lessonsLoading } = useAcademyLessons();
  const { progress } = useLessonProgress();
  const { isAdminActive } = useAdminMode();
  const { hasPermission } = useAcademyPermissions();
  const canManageContent = isAdminActive && hasPermission("manage_content");
  const { totalCount: pbTotal, completedCount: pbDone, nextChapter: pbNext } = usePlaybookProgress();
  const { isBasicTier } = useIsBasicTier();
  const { user, profile } = useAuth();
  const isGuestOrBasic = isBasicTier || isSharedGuestAccount(user, profile);

  const BASIC_ONLY_SLUG = "chapter-1-basic-bridge";

  // Filter hidden modules for non-admins, and gate the basic-tier duplicate.
  const modules = useMemo(() => {
    let list = canManageContent ? allModules : allModules.filter(m => m.visible !== false);
    if (canManageContent) return list;
    if (isGuestOrBasic) {
      list = list.filter(m => (m as any).basic_only === true || m.slug === BASIC_ONLY_SLUG);
      return list;
    }
    // Paid members: same Beginner Bridge videos, shown first as the foundations
    // module (labelled separately so it doesn't collide with paid "Chapter 1").
    const bridge = list.filter(m => m.slug === BASIC_ONLY_SLUG);
    const rest = list.filter(m => m.slug !== BASIC_ONLY_SLUG);
    return [...bridge, ...rest];

  }, [allModules, canManageContent, isGuestOrBasic]);

  // True when the shared Beginner Bridge card leads the grid (paid members).
  const isBridgeFirst = !canManageContent && !isGuestOrBasic && modules[0]?.slug === BASIC_ONLY_SLUG;


  // Display-only labels so the shared Beginner Bridge module reads correctly
  // for paid members (content and slug stay untouched).
  const labelFor = (mod: { slug: string; title: string; subtitle?: string | null }) => {
    // Short local display names; keep saved titles, routes and grouping intact.
    if (mod.slug !== BASIC_ONLY_SLUG) {
      const chapter = Number(mod.title.match(/^Chapter\s+(\d+)\b/i)?.[1]);
      if (shortChapterNames[chapter]) {
        return { title: `Chapter ${chapter} — ${shortChapterNames[chapter]}`, subtitle: mod.subtitle };
      }
    }
    if (mod.slug !== BASIC_ONLY_SLUG || isGuestOrBasic || canManageContent) {
      return { title: mod.title, subtitle: mod.subtitle };
    }
    return {
      title: "Beginner Bridge — Foundations",
      subtitle: "Starter videos: brokerage, TradingView setup, indicators and chart basics.",
    };
  };


  const allowedSlugs = useMemo(() => new Set(modules.map(m => m.slug)), [modules]);
  const lessons = useMemo(() => {
    const base = canManageContent ? allLessons : allLessons.filter(l => l.visible !== false);
    if (canManageContent) return base;
    return base.filter(l => allowedSlugs.has(l.module_slug));
  }, [allLessons, canManageContent, allowedSlugs]);

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

  const curriculumGroups = [
    { id: "start", title: "Start here", description: "Setup & foundations" },
    { id: "core", title: "Core skills", description: "Structure, zones & execution" },
    { id: "practice", title: "Practice & go deeper", description: "Discipline, practice & the library" },
  ].map(group => ({ ...group, modules: modules.map((mod, index) => ({mod, index})).filter(({mod}) => {
    const chapter = Number(mod.title.match(/^Chapter\s+(\d+)/i)?.[1]);
    const groupId = mod.slug === BASIC_ONLY_SLUG || (chapter > 0 && chapter <= 2) ? "start" : chapter >= 3 && chapter <= 6 ? "core" : "practice";
    return groupId === group.id;
  }) })).filter(group => group.modules.length > 0);

  if (!hasAccess && !accessLoading && !isGuestOrBasic) {
    return <PremiumGate status={status} pageName="Courses" />;
  }

  return (
    <>
      <div className="learn-library px-4 md:px-8 pt-6 pb-24 md:pb-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="learn-heading">
          <p className="learn-eyebrow">VAULT ACADEMY / LEARN</p>
          <h1>Learn at your pace.</h1>
          <p className="learn-intro">Your lessons. Your playbook. A clearer understanding of the market.</p>
          {!loading && lessons.length > 0 && (() => {
            const totalLessons = lessons.length;
            const completedLessons = lessons.filter((l) => progress[l.id]).length;
            const overallPct = Math.round((completedLessons / totalLessons) * 100);
            return (
              <div className="learn-overall">
                <Progress value={overallPct} className="h-2 flex-1 max-w-xs" />
                <span className="text-sm font-medium text-muted-foreground">
                  {completedLessons} of {totalLessons} lessons completed
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

        {!isGuestOrBasic && <ClaimRoleBanner />}

        {/* Playbook Hero Strip — hidden for basic/guest users */}
        {!isGuestOrBasic && pbTotal > 0 && (
          <Link
            className="learn-book"
            to={`/academy/playbook${pbNext ? `?chapter=${pbNext.id}` : ""}`}
          >
            <div className="learn-book-art"><img src={playbookCover} alt="Vault Stock Investment Guide — Beginner’s Edition to Options Trading" width="495" height="640" /></div>
            <div className="learn-book-copy">
              <p className="learn-eyebrow">THE MEMBER E-BOOK</p>
              <h2>The Vault <span>Playbook.</span></h2>
              <p className="learn-book-description">Your reference for the lessons ahead.</p>
              <p className="learn-book-meta">{pbTotal} chapters <span> / </span> Read online · PDF</p>
              <span className="learn-book-action">
                {pbDone === pbTotal ? "Revisit e-book" : pbDone > 0 ? "Continue reading" : "Read the e-book"}
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
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
            <div className="learn-curriculum-heading"><div><p className="learn-eyebrow">YOUR COURSES</p><h2>Choose your next step.</h2></div><span>{modules.length} modules</span></div>
            {modules.length === 0 && <div className="rounded-2xl border border-border p-6 text-center"><h2 className="text-lg font-semibold">No courses available right now</h2><p className="text-base text-muted-foreground mt-2">Try refreshing. If your courses are still missing, contact Vault support.</p><Button variant="outline" className="mt-4 min-h-11" onClick={() => refetchModules()}>Try again</Button></div>}
            <Accordion type="single" collapsible defaultValue={curriculumGroups[0]?.id} className="learn-sections">
              {curriculumGroups.map((group, groupIndex) => (
                <AccordionItem key={group.id} value={group.id} className="learn-section">
                  <AccordionTrigger className="learn-section-trigger">
                    <span className="learn-section-number">{String(groupIndex + 1).padStart(2, "0")}</span>
                    <span className="learn-section-label"><span>{group.title}</span><small>{group.description}</small></span>
                    <span className="learn-section-count">{group.modules.length} modules</span>
                  </AccordionTrigger>
                  <AccordionContent className="learn-section-content">
                    <div className="learn-course-list">
              {group.modules.map(({mod, index: i}) => {
                const modLessons = lessonsByModule[mod.slug] || [];
                const completedCount = modLessons.filter((l) => progress[l.id]).length;
                const totalLessons = modLessons.length;
                const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
                const isStarted = completedCount > 0;
                const isComplete = totalLessons > 0 && completedCount === totalLessons;
                const isEditing = editingId === mod.id;
                const isLocked = false;
                const isHidden = mod.visible === false;
                const firstLessonThumb = getYouTubeThumbnail(modLessons[0]?.video_url);
                const customCover = localCourseCover(mod);
                const coverImage = customCover || (mod.slug === BASIC_ONLY_SLUG
                  ? dayTradingVocabularyCover
                  : mod.cover_image_url || firstLessonThumb || courseCoverDefault);

                if (isEditing && canManageContent) {
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
                      "learn-course group",
                      isLocked ? "opacity-70" : "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 cursor-pointer",
                      isHidden && canManageContent && "opacity-60 border-dashed"
                    )}
                    onClick={() => !isLocked && totalLessons > 0 && navigate(`/academy/learn/${mod.slug}`)}
                  >
                    {/* Cover image */}
                    <div className="learn-course-image relative aspect-[16/9] overflow-hidden bg-muted">
                      <img
                        src={coverImage}
                        alt={labelFor(mod).title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(event) => {
                          const img = event.currentTarget;
                          if (!img.src.endsWith(courseCoverDefault)) img.src = courseCoverDefault;
                        }}
                      />
                      {!customCover && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />}

                      {/* Module number badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        {!customCover && <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-sm text-[11px] font-mono text-white/70">
                          {isBridgeFirst && i === 0
                            ? "Foundations"
                            : `Module ${String(isBridgeFirst ? i : i + 1).padStart(2, "0")}`}
                        </span>}

                        {isHidden && canManageContent && (
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
                    <div className="learn-course-copy">
                      <h3 className="font-semibold text-foreground text-base leading-snug mb-1">{labelFor(mod).title}</h3>
                      {labelFor(mod).subtitle && (
                        <p className="text-base text-muted-foreground mb-4">{labelFor(mod).subtitle}</p>
                      )}


                      {/* Progress */}
                      <div className="learn-course-progress">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[13px] text-muted-foreground">
                            {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}
                          </span>
                          {isStarted && <span className={cn(
                            "text-[13px] font-medium",
                            isComplete ? "text-emerald-400" : "text-muted-foreground"
                          )}>
                            {progressPct}% complete
                          </span>}
                        </div>
                        {isStarted && <Progress value={progressPct} className="h-1.5" />}
                      </div>

                      {/* CTA */}
                      <div className="learn-course-actions flex items-center gap-2">
                        {isLocked ? (
                          <Button disabled variant="secondary" className="w-full gap-2">
                            <Lock className="h-4 w-4" /> Locked
                          </Button>
                        ) : isComplete ? (
                          <Button variant="secondary" className="w-full min-h-11 gap-2" aria-label={`Review ${labelFor(mod).title}`}>
                            Review <ArrowRight className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button disabled={totalLessons === 0} className="w-full min-h-11 gap-2" aria-label={`${isStarted ? "Continue" : "Start"} ${labelFor(mod).title}`}>
                            {totalLessons === 0 ? "Coming soon" : isStarted ? "Continue" : "Start"} <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Admin controls */}
                        {canManageContent && (
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
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <ChartClassroom />

            {/* Admin: Add module */}
            {canManageContent && (
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
