import { useEffect, useRef, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { PlayerIdentity } from "./PlayerIdentity";
import { AcademySidebar } from "./AcademySidebar";
import { MobileNav } from "./MobileNav";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { CoachDrawer } from "@/components/academy/CoachDrawer";
import { NotificationsPanel } from "@/components/academy/NotificationsPanel";
import { ReferralModal } from "@/components/academy/ReferralModal";
import { AccessBlockModal } from "@/components/academy/AccessBlockModal";
import { PastDueBanner } from "@/components/academy/PastDueBanner";
import { isBillingVisible } from "@/lib/featureFlags";
import { useAuth } from "@/hooks/useAuth";
import { useSmartNotifications } from "@/hooks/useSmartNotifications";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { useSmartRefresh } from "@/hooks/useSmartRefresh";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, ShieldAlert, WifiOff, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { AppOnboarding } from "@/components/onboarding/AppOnboarding";
import { useIsBasicTier } from "@/hooks/useIsBasicTier";
import { VAULT_OS_MONTHLY_FALLBACK_PRICE, isSharedGuestAccount } from "@/lib/membership";
import { cn } from "@/lib/utils";

const ambientBgStyle = {
  background: [
    'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)',
    'radial-gradient(ellipse 50% 50% at 15% 10%, rgba(56,189,248,0.10) 0%, transparent 70%)',
    'radial-gradient(ellipse 45% 55% at 85% 45%, rgba(59,130,246,0.08) 0%, transparent 70%)',
    'radial-gradient(ellipse 40% 40% at 10% 90%, rgba(56,130,246,0.06) 0%, transparent 70%)',
    'linear-gradient(170deg, hsl(220,25%,5%) 0%, hsl(216,30%,6%) 40%, hsl(222,35%,4%) 100%)',
  ].join(', '),
};

const GUEST_UPGRADE_BANNER_DISMISSED_KEY = "va_guest_upgrade_banner_dismissed";

interface AcademyProfileShape {
  access_status?: string | null;
  profile_completed?: boolean | null;
  onboarding_completed?: boolean | null;
}

function LoadingShell() {
  return (
    <div className="academy-mobile-fit h-[100dvh] flex w-full bg-background relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" style={ambientBgStyle} />
      <div className="flex-1 flex min-h-0 flex-col min-w-0 relative z-[1] overflow-hidden">
        <div className="h-14 border-b border-white/[0.06] bg-background flex items-center px-4">
          <span className="text-lg font-bold tracking-tight text-foreground">
            Vault<span className="text-primary">Academy</span>
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

/** Inner layout that lives inside SidebarProvider so useSidebar() works. */
function AcademyLayoutInner() {
  const { user, profile, loading, signOut } = useAuth();
  const { isBasicTier, loading: basicLoading } = useIsBasicTier();
  const { hydrated } = useAcademyData();
  // Persist hydration flag to sessionStorage so tab discards don't reset it
  const [everHydrated, setEverHydrated] = useState(() => {
    try { return sessionStorage.getItem("va_ever_hydrated") === "1"; } catch { return false; }
  });
  useEffect(() => {
    if (hydrated && !everHydrated) {
      setEverHydrated(true);
      try { sessionStorage.setItem("va_ever_hydrated", "1"); } catch { void 0; }
    }
  }, [hydrated, everHydrated]);
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { setOpenMobile } = useSidebar();
  const { logActivity } = useActivityLog();
  const { status: accessStatus2, loading: accessLoading, refetch: refetchAccess, isAdminBypass } = useStudentAccess();
  const { toast } = useToast();
  const isOnline = useOnlineStatus();
  const lastPageRef = useRef("");
  const hadUserRef = useRef(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const sharedGuest = isSharedGuestAccount(user, profile);
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(() => {
    try { return localStorage.getItem(GUEST_UPGRADE_BANNER_DISMISSED_KEY) === "1"; } catch { return false; }
  });
  useSmartNotifications();
  useSmartRefresh();
  usePresenceHeartbeat();

  useEffect(() => {
    const handler = () => setReferralOpen(true);
    window.addEventListener("open-referral-modal", handler);
    return () => window.removeEventListener("open-referral-modal", handler);
  }, []);

  const isCommunity = location.pathname.startsWith("/academy/community");
  const showBlockModal = isBillingVisible() && !accessLoading && !isAdminBypass && (accessStatus2 === "canceled" || accessStatus2 === "none");
  const showPastDueBanner = isBillingVisible() && !accessLoading && !isAdminBypass && accessStatus2 === "past_due";

  // Session-loss detection
  useEffect(() => {
    if (!loading && hadUserRef.current && !user) {
      toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
      navigate("/auth", { replace: true });
    }
    if (user) hadUserRef.current = true;
  }, [user, loading]);

  // Page view logging
  useEffect(() => {
    const path = location.pathname;
    if (path === lastPageRef.current) return;
    lastPageRef.current = path;
    const segment = path.split("/").filter(Boolean)[1] || "home";
    logActivity("page_view", segment);
  }, [location.pathname]);

  // 1. Wait for auth (and basic-tier role resolution) to finish before rendering nav.
  if (loading || basicLoading) {
    return <LoadingShell />;
  }

  // 2. No user → send to Welcome landing (first impression on app download)
  if (!user) {
    return <Navigate to="/welcome" replace />;
  }

  // 2b. Basic-tier members are locked to the Learn experience inside Academy.
  //     Render Learn directly — skip profile/hydration/onboarding/access gates
  //     that don't apply to a video-only membership.
  if (isBasicTier) {
    const path = location.pathname;
    const allowed =
      path === "/academy/learn" || path.startsWith("/academy/learn/") ||
      path === "/academy/community" || path.startsWith("/academy/community") ||
      path === "/academy/settings" || path.startsWith("/academy/settings") ||
      path === "/academy/profile";
    if (!allowed) {
      return <Navigate to="/academy/community?tab=trade-floor" replace />;
    }
    return (
      <div className="academy-mobile-fit h-[100dvh] flex w-full bg-background relative overflow-hidden">
        <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" style={ambientBgStyle} />
        <AcademySidebar />
        <div className="flex-1 flex min-h-0 flex-col min-w-0 relative z-[1] overflow-hidden">
          <header className="academy-top-safe sticky top-0 z-40 w-full border-b border-white/[0.06] bg-background">
            <div className="flex h-14 items-center justify-between px-4">
              <span className="text-lg font-bold tracking-tight text-foreground">
                Vault<span className="text-primary">Academy</span>
              </span>
            </div>
          </header>
          {(!sharedGuest || !guestBannerDismissed) && <div className="relative max-w-full overflow-hidden border-b border-primary/10 bg-primary/10 px-4 py-3">
            {sharedGuest && (
              <button
                type="button"
                aria-label="Dismiss create account banner"
                className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                onClick={() => {
                  setGuestBannerDismissed(true);
                  try { localStorage.setItem(GUEST_UPGRADE_BANNER_DISMISSED_KEY, "1"); } catch { void 0; }
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <div className="mx-auto flex w-full max-w-[25rem] min-w-0 flex-col gap-3 md:max-w-none md:flex-row md:items-center md:justify-between">
              <div className={cn("min-w-0 max-w-full", sharedGuest ? "pr-8" : undefined)}>
                <p className="break-words text-sm font-semibold leading-snug text-foreground">
                  {sharedGuest ? "Create your own full access account" : `Upgrade to full access for ${VAULT_OS_MONTHLY_FALLBACK_PRICE}`}
                </p>
                <p className="break-words text-xs leading-snug text-muted-foreground">
                  {sharedGuest
                    ? "Guest preview stays in the shared basic tier until you create your own account."
                    : "Unlock the complete Vault OS app with Apple in-app purchase."}
                </p>
              </div>
              <Button
                size="sm"
                className="w-full max-w-full rounded-xl md:w-auto"
                onClick={async () => {
                  if (sharedGuest) {
                    await signOut();
                    navigate("/create-account/full?source=guest", { replace: true });
                    return;
                  }
                  navigate("/membership");
                }}
              >
                {sharedGuest ? "Create account" : `Upgrade ${VAULT_OS_MONTHLY_FALLBACK_PRICE}`}
              </Button>
            </div>
          </div>}
          <main className="academy-main-safe academy-content-safe flex-1 min-h-0 overflow-y-auto overflow-x-hidden animate-fade-in pb-4 md:pb-6">
            <Outlet />
          </main>
          <CoachDrawer />
          <MobileNav />
        </div>
      </div>
    );
  }

  // 3. User exists but profile/hydration still loading — skip if we've been hydrated before
  if (!profile || (!hydrated && !everHydrated)) {
    return <LoadingShell />;
  }

  const profileData = profile as AcademyProfileShape | null;
  const accessStatus = profileData?.access_status ?? "trial";

  if (accessStatus === "revoked") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-destructive/10 mx-auto">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Access Revoked</h1>
          <p className="text-sm text-muted-foreground">
            Your Academy access has been revoked. Please contact support for assistance.
          </p>
          <Link
            to="/auth"
            className="inline-block text-sm text-primary hover:underline mt-2"
          >
            ← Sign in with another account
          </Link>
        </div>
      </div>
    );
  }

  // First-login onboarding gate
  const searchParams = new URLSearchParams(window.location.search);
  const isPreview = searchParams.has("preview-onboarding");
  const profileCompleted = profileData?.profile_completed;
  const onboardingCompleted = profileData?.onboarding_completed;
  // Show onboarding only for genuinely new users — skip if they've already been active
  if (isPreview || (!profileCompleted && !onboardingCompleted)) {
    return <AppOnboarding isPreview={isPreview} />;
  }

  return (
    <div className="academy-mobile-fit h-[100dvh] flex w-full bg-background relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" style={ambientBgStyle} />

      <AcademySidebar />

      <div className="flex-1 flex min-h-0 flex-col min-w-0 relative z-[1] overflow-hidden">
        {!isOnline && (
          <div className="flex items-center justify-center gap-2 bg-amber-500/15 border-b border-amber-500/20 px-4 py-1.5 text-xs font-medium text-amber-400">
            <WifiOff className="h-3.5 w-3.5" />
            You're offline — some features may not work
          </div>
        )}
        <header className="academy-top-safe sticky top-0 z-40 w-full border-b border-white/[0.06] bg-background">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              {isMobile && isCommunity && (
                <Button variant="ghost" size="icon" className="-ml-2 mr-1 h-8 w-8" onClick={() => setOpenMobile(true)}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <Link to="/academy/home" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <span className="text-lg font-bold tracking-tight text-foreground">
                  Vault<span className="text-primary">Academy</span>
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-1">
              <PlayerIdentity />
            </div>
          </div>
        </header>

        <main className={`academy-main-safe academy-content-safe flex-1 min-h-0 overflow-y-auto overflow-x-hidden animate-fade-in ${isCommunity ? "pb-4" : "pb-4 md:pb-6"}`}>
          {showPastDueBanner && <PastDueBanner />}
          <Outlet />
        </main>

        <CoachDrawer />
        <MobileNav />
        <ReferralModal open={referralOpen} onOpenChange={setReferralOpen} />
      </div>

      {showBlockModal && (
        <AccessBlockModal status={accessStatus2} refetch={refetchAccess} />
      )}
    </div>
  );
}

/** Public layout wrapper — provides SidebarProvider context. */
export function AcademyLayout() {
  return (
    <SidebarProvider>
      <AcademyLayoutInner />
    </SidebarProvider>
  );
}
