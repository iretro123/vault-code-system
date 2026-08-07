import { useEffect, Suspense, ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { VaultStateProvider } from "@/contexts/VaultStateContext";
import { AcademyDataProvider } from "@/contexts/AcademyDataContext";
import { AdminModeProvider } from "@/contexts/AdminModeContext";
import { captureReferral } from "@/lib/referralCapture";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { lazyWithRetry, clearLazyReloadGuard } from "@/lib/lazyWithRetry";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import { VaultOSGate } from "./components/VaultOSGate";
import { BasicTierGate } from "./components/BasicTierGate";
import { AcademyLayout } from "./components/layout/AcademyLayout";
import { Loader2 } from "lucide-react";
import { isSharedGuestAccount } from "@/lib/membership";
import { hasFullAccess, isFreeBasicAllowedPath } from "@/lib/entitlements";


// Lazy-loaded routes — split from main bundle.
// Wrapped with lazyWithRetry so stale-deploy chunk-hash mismatches
// trigger a single auto-reload instead of a permanent error.
const AcademyHome = lazyWithRetry(() => import("./pages/academy/AcademyHome"));
const AcademyLearn = lazyWithRetry(() => import("./pages/academy/AcademyLearn"));
const AcademyModule = lazyWithRetry(() => import("./pages/academy/AcademyModule"));
const AcademyBootcamp = lazyWithRetry(() => import("./pages/academy/AcademyBootcamp"));
const AcademyCommunity = lazyWithRetry(() => import("./pages/academy/AcademyCommunity"));
const AcademyTrade = lazyWithRetry(() => import("./pages/academy/AcademyTrade"));
const AcademyRoom = lazyWithRetry(() => import("./pages/academy/AcademyRoom"));
const AcademyLive = lazyWithRetry(() => import("./pages/academy/AcademyLive"));
const AcademyResources = lazyWithRetry(() => import("./pages/academy/AcademyResources"));
const AcademyProfile = lazyWithRetry(() => import("./pages/academy/AcademyProfile"));
const AcademySettings = lazyWithRetry(() => import("./pages/academy/AcademySettings"));
const AcademyAdmin = lazyWithRetry(() => import("./pages/academy/AcademyAdmin"));
const AcademyAdminUsers = lazyWithRetry(() => import("./pages/academy/AcademyAdminUsers"));
const AdminPanel = lazyWithRetry(() => import("./pages/academy/AdminPanel"));
const AcademyJournal = lazyWithRetry(() => import("./pages/academy/AcademyJournal"));
const AcademyProgress = lazyWithRetry(() => import("./pages/academy/AcademyProgress"));
const AcademyMyQuestions = lazyWithRetry(() => import("./pages/academy/AcademyMyQuestions"));
const AcademyPlaybook = lazyWithRetry(() => import("./pages/academy/AcademyPlaybook"));
const AcademyQA = lazyWithRetry(() => import("./pages/academy/AcademyQA"));
const AcademySupport = lazyWithRetry(() => import("./pages/academy/AcademySupport"));
const AcademyVaultApproval = lazyWithRetry(() => import("./pages/academy/AcademyVaultApproval"));
const ReferralRedirect = lazyWithRetry(() => import("./pages/ReferralRedirect"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Signup = lazyWithRetry(() => import("./pages/Signup"));
const TradeLog = lazyWithRetry(() => import("./pages/TradeLog"));
const TraderCockpit = lazyWithRetry(() => import("./pages/TraderCockpit"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const VaultLog = lazyWithRetry(() => import("./pages/VaultLog"));
const Reports = lazyWithRetry(() => import("./pages/Reports"));
const GuestPreview = lazyWithRetry(() => import("./pages/GuestPreview"));
const Welcome = lazyWithRetry(() => import("./pages/Welcome"));
const IntroCarousel = lazyWithRetry(() => import("./pages/IntroCarousel"));
const CreateAccount = lazyWithRetry(() => import("./pages/CreateAccount"));
const BasicHome = lazyWithRetry(() => import("./pages/basic/BasicHome"));
const BasicModule = lazyWithRetry(() => import("./pages/basic/BasicModule"));
const MembershipUpgrade = lazyWithRetry(() => import("./pages/MembershipUpgrade"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazyWithRetry(() => import("./pages/TermsOfUse"));
const YouTubeEmbed = lazyWithRetry(() => import("./pages/YouTubeEmbed"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ReferralCapture() {
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) captureReferral(ref);
  }, [searchParams]);
  return null;
}

function PushBootstrap() {
  usePushNotifications();
  return null;
}

function ReloadGuardReset() {
  useEffect(() => {
    clearLazyReloadGuard();
  }, []);
  return null;
}

/**
 * Redirect Free Basic members away from full-app routes before
 * any heavy layout/data fetching mounts. Uses AuthContext's
 * already-loaded role to stay synchronous.
 *
 * Deny-by-default: only roles in FULL_ACCESS_ROLES pass through.
 */
function BasicTierRedirect({ children }: { children: ReactNode }) {
  const { userRole, loading } = useAuth();
  const location = useLocation();
  if (loading) return <RouteFallback />;
  if (hasFullAccess(userRole?.role)) return <>{children}</>;
  if (isFreeBasicAllowedPath(location.pathname)) return <>{children}</>;
  return <Navigate to="/academy/learn" replace />;
}


function RouteFallback() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[200px]">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function LaunchRedirect() {
  const { user, profile, userRole, loading } = useAuth();

  if (loading) return <RouteFallback />;
  if (!user) return <Navigate to="/welcome" replace />;
  if (userRole?.role === "basic_tier") {
    return <Navigate to="/academy/community?tab=trade-floor" replace />;
  }
  return <Navigate to="/academy/home" replace />;
}

function WelcomeRoute() {
  const { user, loading } = useAuth();

  if (loading) return <RouteFallback />;
  if (user) return <Navigate to="/" replace />;
  return <Welcome />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ReferralCapture />
      <AuthProvider>
        <PushBootstrap />
        <ReloadGuardReset />
        <VaultStateProvider>
        <AcademyDataProvider>
        <AdminModeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<LaunchRedirect />} />
            <Route path="/hub" element={<Navigate to="/academy" replace />} />
            <Route path="/cockpit" element={<BasicTierRedirect><VaultOSGate><TraderCockpit /></VaultOSGate></BasicTierRedirect>} />
            <Route path="/log" element={<BasicTierRedirect><VaultOSGate><TradeLog /></VaultOSGate></BasicTierRedirect>} />
            <Route path="/vault-log" element={<BasicTierRedirect><VaultOSGate><VaultLog /></VaultOSGate></BasicTierRedirect>} />
            <Route path="/reports" element={<BasicTierRedirect><VaultOSGate><Reports /></VaultOSGate></BasicTierRedirect>} />
            <Route path="/settings" element={<BasicTierRedirect><VaultOSGate><Settings /></VaultOSGate></BasicTierRedirect>} />
            <Route path="/welcome" element={<Suspense fallback={<RouteFallback />}><WelcomeRoute /></Suspense>} />
            <Route path="/intro" element={<Suspense fallback={<RouteFallback />}><IntroCarousel /></Suspense>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/guest" element={<Suspense fallback={<RouteFallback />}><GuestPreview /></Suspense>} />
            <Route path="/create-account" element={<Suspense fallback={<RouteFallback />}><CreateAccount /></Suspense>} />
            <Route path="/create-account/full" element={<Suspense fallback={<RouteFallback />}><CreateAccount /></Suspense>} />
            <Route path="/membership" element={<Suspense fallback={<RouteFallback />}><MembershipUpgrade /></Suspense>} />
            <Route path="/youtube-embed" element={<Suspense fallback={<RouteFallback />}><YouTubeEmbed /></Suspense>} />
            <Route path="/privacy-policy" element={<Suspense fallback={<RouteFallback />}><PrivacyPolicy /></Suspense>} />
            <Route path="/terms-of-use" element={<Suspense fallback={<RouteFallback />}><TermsOfUse /></Suspense>} />
            <Route path="/basic" element={<BasicTierGate><Suspense fallback={<RouteFallback />}><BasicHome /></Suspense></BasicTierGate>} />
            <Route path="/basic/learn/:slug" element={<BasicTierGate><Suspense fallback={<RouteFallback />}><BasicModule /></Suspense></BasicTierGate>} />
            <Route path="/ref/:userId" element={<ReferralRedirect />} />
            <Route path="/academy" element={<BasicTierRedirect><AcademyLayout /></BasicTierRedirect>}>

              <Route index element={<Navigate to="home" replace />} />
              <Route path="home" element={<Suspense fallback={<RouteFallback />}><AcademyHome /></Suspense>} />
              <Route path="start" element={<Navigate to="/academy/home" replace />} />
              <Route path="learn" element={<Suspense fallback={<RouteFallback />}><AcademyLearn /></Suspense>} />
              <Route path="learn/:moduleSlug" element={<Suspense fallback={<RouteFallback />}><AcademyModule /></Suspense>} />
              <Route path="bootcamp" element={<Suspense fallback={<RouteFallback />}><AcademyBootcamp /></Suspense>} />
              <Route path="community" element={<Suspense fallback={<RouteFallback />}><AcademyCommunity /></Suspense>} />
              <Route path="trade" element={<Suspense fallback={<RouteFallback />}><AcademyTrade /></Suspense>} />
              <Route path="rooms" element={<Navigate to="/academy/community" replace />} />
              <Route path="room/:roomSlug" element={<Suspense fallback={<RouteFallback />}><AcademyRoom /></Suspense>} />
              <Route path="live" element={<Suspense fallback={<RouteFallback />}><AcademyLive /></Suspense>} />
              <Route path="resources" element={<Suspense fallback={<RouteFallback />}><AcademyResources /></Suspense>} />
              <Route path="profile" element={<Suspense fallback={<RouteFallback />}><AcademyProfile /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<RouteFallback />}><AcademySettings /></Suspense>} />
              <Route path="my-questions" element={<Suspense fallback={<RouteFallback />}><AcademyMyQuestions /></Suspense>} />
              <Route path="journal" element={<Suspense fallback={<RouteFallback />}><AcademyJournal /></Suspense>} />
              <Route path="progress" element={<Suspense fallback={<RouteFallback />}><AcademyProgress /></Suspense>} />
              <Route path="playbook" element={<Suspense fallback={<RouteFallback />}><AcademyPlaybook /></Suspense>} />
              <Route path="vault-os" element={<Navigate to="/academy/home" replace />} />
              <Route path="vault" element={<Suspense fallback={<RouteFallback />}><AcademyVaultApproval /></Suspense>} />
              <Route path="support" element={<Suspense fallback={<RouteFallback />}><AcademySupport /></Suspense>} />
              <Route path="admin" element={<Suspense fallback={<RouteFallback />}><AcademyAdmin /></Suspense>} />
              <Route path="admin/users" element={<Suspense fallback={<RouteFallback />}><AcademyAdminUsers /></Suspense>} />
              <Route path="admin/panel" element={<Suspense fallback={<RouteFallback />}><AdminPanel /></Suspense>} />
              <Route path="admin/qa" element={<Suspense fallback={<RouteFallback />}><AcademyQA /></Suspense>} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </TooltipProvider>
        </AdminModeProvider>
        </AcademyDataProvider>
        </VaultStateProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
