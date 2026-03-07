import { useEffect, useRef } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { PlayerIdentity } from "./PlayerIdentity";
import { AcademySidebar } from "./AcademySidebar";
import { MobileNav } from "./MobileNav";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { CoachDrawer } from "@/components/academy/CoachDrawer";
import { NotificationsPanel } from "@/components/academy/NotificationsPanel";
import { AccessBlockModal } from "@/components/academy/AccessBlockModal";
import { useAuth } from "@/hooks/useAuth";
import { useSmartNotifications } from "@/hooks/useSmartNotifications";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, ShieldAlert, WifiOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

/** Inner layout that lives inside SidebarProvider so useSidebar() works. */
function AcademyLayoutInner() {
  const { user, profile, loading } = useAuth();
  const { hydrated } = useAcademyData();
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
  useSmartNotifications();
  usePresenceHeartbeat();

  const isCommunity = location.pathname.startsWith("/academy/community");
  const showBlockModal = !accessLoading && !isAdminBypass && (accessStatus2 === "past_due" || accessStatus2 === "canceled" || accessStatus2 === "none");

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

  if (loading || !hydrated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="h-14 border-b border-white/5 bg-background/80 flex items-center px-4">
          <Skeleton className="h-5 w-32" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const accessStatus = (profile as any)?.access_status ?? "trial";

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

  return (
    <div className="h-screen flex w-full bg-background relative overflow-hidden">
      {/* FluxCharts-inspired ambient background — layered radials, vignette */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true"
        style={{
          background: [
            'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)',
            'radial-gradient(ellipse 50% 50% at 15% 10%, rgba(56,189,248,0.10) 0%, transparent 70%)',
            'radial-gradient(ellipse 45% 55% at 85% 45%, rgba(59,130,246,0.08) 0%, transparent 70%)',
            'radial-gradient(ellipse 40% 40% at 10% 90%, rgba(56,130,246,0.06) 0%, transparent 70%)',
            'linear-gradient(170deg, hsl(220,25%,5%) 0%, hsl(216,30%,6%) 40%, hsl(222,35%,4%) 100%)',
          ].join(', '),
        }}
      />

      <AcademySidebar />

      <div className="flex-1 flex flex-col min-w-0 relative z-[1] overflow-hidden">
        {!isOnline && (
          <div className="flex items-center justify-center gap-2 bg-amber-500/15 border-b border-amber-500/20 px-4 py-1.5 text-xs font-medium text-amber-400">
            <WifiOff className="h-3.5 w-3.5" />
            You're offline — some features may not work
          </div>
        )}
        <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-background/90 backdrop-blur-md">
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

        <main className={`flex-1 overflow-y-auto ${isCommunity ? "pb-6" : "pb-20 md:pb-6"}`}>
          <Outlet />
        </main>

        <CoachDrawer />
        {!isCommunity && <MobileNav />}
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
