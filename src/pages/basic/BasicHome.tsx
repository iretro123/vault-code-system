import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, LogOut, PlayCircle, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAcademyModules } from "@/hooks/useAcademyModules";
import { useAcademyLessons } from "@/hooks/useAcademyLessons";
import { supabase } from "@/integrations/supabase/client";
import { BASIC_UPGRADE_BANNER_DISMISSED_KEY, VAULT_OS_MONTHLY_FALLBACK_PRICE, isSharedGuestAccount } from "@/lib/membership";

const BasicHome = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { modules, loading: modulesLoading } = useAcademyModules();
  const { lessons } = useAcademyLessons();
  const [lastLessonId, setLastLessonId] = useState<string | null>(null);
  const [upgradeCardDismissed, setUpgradeCardDismissed] = useState(() => {
    try { return sessionStorage.getItem(`${BASIC_UPGRADE_BANNER_DISMISSED_KEY}:home`) === "1"; } catch { return false; }
  });

  // Most recently watched lesson (if any)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id, created_at, completed_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.lesson_id) setLastLessonId(data.lesson_id);
    })();
  }, [user]);

  const visibleModules = useMemo(
    () => modules.filter((m) => m.visible).sort((a, b) => a.sort_order - b.sort_order),
    [modules]
  );

  const continueLesson = useMemo(() => {
    if (lastLessonId) {
      const l = lessons.find((x) => x.id === lastLessonId);
      if (l) return l;
    }
    return lessons[0] ?? null;
  }, [lastLessonId, lessons]);

  const firstName =
    profile?.display_name?.split(" ")[0] || profile?.email?.split("@")[0] || "Trader";
  const sharedGuest = isSharedGuestAccount(user, profile);

  async function handleSignOut() {
    await signOut();
    navigate("/create-account", { replace: true });
  }

  return (
    <div
      className="min-h-screen text-foreground"
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59,130,246,0.18) 0%, transparent 55%),
          linear-gradient(180deg, hsl(212,25%,7%) 0%, hsl(212,25%,4%) 100%)
        `,
      }}
    >
      {/* Top bar */}
      <header className="px-5 md:px-10 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <h1 className="text-2xl font-black tracking-tight">
          <span className="text-foreground">VAULT</span>
          <span className="text-primary">OS</span>
        </h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </header>

      <main className="px-5 md:px-10 pb-16 max-w-7xl mx-auto">
        {/* Hero / Continue watching */}
        <section className="mb-10 md:mb-14">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Welcome back, {firstName}
          </p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Continue watching
          </h2>

          {continueLesson ? (
            <Link
              to={`/basic/learn/${continueLesson.module_slug}?lesson=${continueLesson.id}`}
              className="group block relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/15 via-background to-background p-8 md:p-12 hover:border-primary/60 transition-all"
            >
              <div className="relative z-10 flex items-center gap-5">
                <div className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-primary/20 backdrop-blur flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                  <Play className="h-6 w-6 md:h-7 md:w-7 text-primary fill-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">
                    {continueLesson.module_title}
                  </p>
                  <p className="text-xl md:text-2xl font-semibold truncate">
                    {continueLesson.lesson_title}
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-2xl border border-border/40 bg-card/40 p-8 text-muted-foreground">
              Pick a module below to begin.
            </div>
          )}
        </section>

        {!upgradeCardDismissed && (
        <section className="mb-10">
          <div className="relative rounded-2xl border border-primary/20 bg-primary/10 p-6 pr-14 shadow-[0_18px_50px_rgba(37,99,235,0.08)] md:p-7 md:pr-16">
            <button
              type="button"
              aria-label="Hide full access reminder"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-background/40 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              onClick={() => {
                setUpgradeCardDismissed(true);
                try { sessionStorage.setItem(`${BASIC_UPGRADE_BANNER_DISMISSED_KEY}:home`, "1"); } catch { void 0; }
              }}
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Full Access</p>
            <h3 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">
              Unlock the full Vault OS when you're ready
            </h3>
            <p className="mt-3 max-w-2xl text-sm md:text-base text-muted-foreground">
              Keep learning free, or move into lessons, tools, live areas, and member sections for {VAULT_OS_MONTHLY_FALLBACK_PRICE}.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                className="h-12 rounded-2xl px-6"
                onClick={async () => {
                  if (sharedGuest) {
                    await signOut();
                    navigate("/create-account/full?source=guest", { replace: true });
                    return;
                  }
                  navigate("/membership");
                }}
              >
                {sharedGuest ? "Create your own account" : "View Full Access"}
              </Button>
              {sharedGuest ? (
                <p className="text-xs text-muted-foreground self-center">
                  Guest preview uses a shared account, so upgrades need your own account first.
                </p>
              ) : null}
            </div>
          </div>
        </section>
        )}

        <section className="mb-10">
          <div className="rounded-2xl border border-border/40 bg-card/40 p-6 md:p-7">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Account</p>
            <h3 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">
              Privacy & account deletion
            </h3>
            <p className="mt-3 max-w-2xl text-sm md:text-base text-muted-foreground">
              Manage your data, download your information, or permanently delete your Vault OS account inside the app.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="h-12 rounded-2xl px-6 gap-2"
                onClick={() => navigate("/academy/settings?section=account&focus=delete-account")}
              >
                <Shield className="h-4 w-4" />
                Open Account
              </Button>
            </div>
          </div>
        </section>

        {/* Library grid */}
        <section>
          <h3 className="text-2xl md:text-3xl font-semibold tracking-tight mb-6">Library</h3>

          {modulesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[4/5] rounded-2xl bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : visibleModules.length === 0 ? (
            <p className="text-muted-foreground">No modules available yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {visibleModules.map((m) => (
                <Link
                  key={m.id}
                  to={`/basic/learn/${m.slug}`}
                  className="group relative aspect-[4/5] rounded-2xl overflow-hidden border border-border/40 bg-card hover:border-primary/60 transition-all"
                >
                  {m.cover_image_url ? (
                    <img
                      src={m.cover_image_url}
                      alt={m.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-background flex items-center justify-center">
                      <PlayCircle className="h-12 w-12 text-primary/60" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-sm md:text-base font-semibold leading-tight line-clamp-2">
                      {m.title}
                    </p>
                    {m.subtitle && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {m.subtitle}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60 pb-8">
        Powered by Vault Trading Academy
      </footer>
    </div>
  );
};

export default BasicHome;
