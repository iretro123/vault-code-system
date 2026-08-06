import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { useAcademyLessons } from "@/hooks/useAcademyLessons";
import { useAcademyModules } from "@/hooks/useAcademyModules";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getVideoEmbedUrl } from "@/lib/videoEmbeds";

const BasicModule = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { modules } = useAcademyModules();
  const { lessons, loading } = useAcademyLessons(slug);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  const module = useMemo(() => modules.find((m) => m.slug === slug), [modules, slug]);
  const orderedLessons = useMemo(
    () => [...lessons].filter((l) => l.visible).sort((a, b) => a.sort_order - b.sort_order),
    [lessons]
  );

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", user.id)
        .eq("completed", true);
      setCompleted(new Set((data ?? []).map((r: any) => r.lesson_id as string)));
    })();
  }, [user]);

  useEffect(() => {
    const q = searchParams.get("lesson");
    if (q) setActiveId(q);
    else if (orderedLessons.length > 0) setActiveId(orderedLessons[0].id);
  }, [searchParams, orderedLessons]);

  const active = useMemo(
    () => orderedLessons.find((l) => l.id === activeId) ?? orderedLessons[0],
    [orderedLessons, activeId]
  );

  async function markComplete(lessonId: string) {
    if (!user || completed.has(lessonId)) return;
    setCompleted((s) => new Set(s).add(lessonId));
    await supabase.from("lesson_progress").insert({
      user_id: user.id,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    });
  }

  return (
    <div
      className="min-h-screen text-foreground"
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59,130,246,0.14) 0%, transparent 55%),
          linear-gradient(180deg, hsl(212,25%,7%) 0%, hsl(212,25%,4%) 100%)
        `,
      }}
    >
      <header className="px-5 md:px-10 py-5 max-w-7xl mx-auto flex items-center justify-between">
        <Link
          to="/basic"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Library
        </Link>
        <h1 className="text-lg font-black tracking-tight">
          <span className="text-foreground">VAULT</span>
          <span className="text-primary">OS</span>
        </h1>
      </header>

      <main className="px-5 md:px-10 pb-16 max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Module</p>
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
            {module?.title ?? "Loading..."}
          </h2>
          {module?.subtitle && (
            <p className="text-muted-foreground mt-2">{module.subtitle}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player */}
          <div className="lg:col-span-2">
            {active ? (
              <div className="space-y-4">
                <div className="aspect-video rounded-2xl overflow-hidden border border-border/40 bg-black">
                  {getVideoEmbedUrl(active.video_url) ? (
                    <iframe
                      key={active.id}
                      src={getVideoEmbedUrl(active.video_url)!}
                      title={active.lesson_title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                      onLoad={() => markComplete(active.id)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center">
                      <a
                        href={active.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary underline underline-offset-4"
                      >
                        Open lesson video
                      </a>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-semibold">{active.lesson_title}</h3>
                  {active.notes && (
                    <p className="text-sm text-muted-foreground whitespace-pre-line mt-2">
                      {active.notes}
                    </p>
                  )}
                </div>
              </div>
            ) : loading ? (
              <div className="aspect-video rounded-2xl bg-muted/20 animate-pulse" />
            ) : (
              <div className="aspect-video rounded-2xl border border-border/40 bg-card/40 flex items-center justify-center text-muted-foreground">
                No lessons in this module yet.
              </div>
            )}
          </div>

          {/* Lesson list */}
          <aside className="lg:col-span-1">
            <div className="rounded-2xl border border-border/40 bg-card/40 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/40 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {orderedLessons.length} lesson{orderedLessons.length === 1 ? "" : "s"}
              </div>
              <ul className="divide-y divide-border/30 max-h-[60vh] overflow-y-auto">
                {orderedLessons.map((l, idx) => {
                  const isActive = l.id === active?.id;
                  const isDone = completed.has(l.id);
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(l.id)}
                        className={cn(
                          "w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-primary/5 transition-colors",
                          isActive && "bg-primary/10"
                        )}
                      >
                        <span className="flex-shrink-0">
                          {isDone ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : isActive ? (
                            <PlayCircle className="h-4 w-4 text-primary" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground w-5">{idx + 1}</span>
                        <span
                          className={cn(
                            "text-sm truncate",
                            isActive ? "text-foreground font-medium" : "text-muted-foreground"
                          )}
                        >
                          {l.lesson_title}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default BasicModule;
