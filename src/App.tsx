import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { VaultStateProvider } from "@/contexts/VaultStateContext";
import { AcademyDataProvider } from "@/contexts/AcademyDataContext";
import { AdminModeProvider } from "@/contexts/AdminModeContext";
import { captureReferral } from "@/lib/referralCapture";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import { VaultOSGate } from "./components/VaultOSGate";
import { AcademyLayout } from "./components/layout/AcademyLayout";
import { Loader2 } from "lucide-react";

// Lazy-loaded routes — split from main bundle
const AcademyHome = lazy(() => import("./pages/academy/AcademyHome"));
const AcademyLearn = lazy(() => import("./pages/academy/AcademyLearn"));
const AcademyModule = lazy(() => import("./pages/academy/AcademyModule"));
const AcademyCommunity = lazy(() => import("./pages/academy/AcademyCommunity"));
const AcademyTrade = lazy(() => import("./pages/academy/AcademyTrade"));
const AcademyRoom = lazy(() => import("./pages/academy/AcademyRoom"));
const AcademyLive = lazy(() => import("./pages/academy/AcademyLive"));
const AcademyResources = lazy(() => import("./pages/academy/AcademyResources"));
const AcademyProfile = lazy(() => import("./pages/academy/AcademyProfile"));
const AcademySettings = lazy(() => import("./pages/academy/AcademySettings"));
const AcademyAdmin = lazy(() => import("./pages/academy/AcademyAdmin"));
const AcademyAdminUsers = lazy(() => import("./pages/academy/AcademyAdminUsers"));
const AdminPanel = lazy(() => import("./pages/academy/AdminPanel"));
const AcademyJournal = lazy(() => import("./pages/academy/AcademyJournal"));
const AcademyProgress = lazy(() => import("./pages/academy/AcademyProgress"));
const AcademyMyQuestions = lazy(() => import("./pages/academy/AcademyMyQuestions"));
const AcademyPlaybook = lazy(() => import("./pages/academy/AcademyPlaybook"));
const AcademyQA = lazy(() => import("./pages/academy/AcademyQA"));
const AcademySupport = lazy(() => import("./pages/academy/AcademySupport"));
const AcademyVaultApproval = lazy(() => import("./pages/academy/AcademyVaultApproval"));
const ReferralRedirect = lazy(() => import("./pages/ReferralRedirect"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Signup = lazy(() => import("./pages/Signup"));
const TradeLog = lazy(() => import("./pages/TradeLog"));
const TraderCockpit = lazy(() => import("./pages/TraderCockpit"));
const Settings = lazy(() => import("./pages/Settings"));
const VaultLog = lazy(() => import("./pages/VaultLog"));
const Reports = lazy(() => import("./pages/Reports"));

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

function RouteFallback() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[200px]">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ReferralCapture />
      <AuthProvider>
        <PushBootstrap />
        <VaultStateProvider>
        <AcademyDataProvider>
        <AdminModeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/academy" replace />} />
            <Route path="/hub" element={<Navigate to="/academy" replace />} />
            <Route path="/cockpit" element={<VaultOSGate><TraderCockpit /></VaultOSGate>} />
            <Route path="/log" element={<VaultOSGate><TradeLog /></VaultOSGate>} />
            <Route path="/vault-log" element={<VaultOSGate><VaultLog /></VaultOSGate>} />
            <Route path="/reports" element={<VaultOSGate><Reports /></VaultOSGate>} />
            <Route path="/settings" element={<VaultOSGate><Settings /></VaultOSGate>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/ref/:userId" element={<ReferralRedirect />} />
            <Route path="/academy" element={<AcademyLayout />}>
              <Route index element={<Navigate to="home" replace />} />
              <Route path="home" element={<Suspense fallback={<RouteFallback />}><AcademyHome /></Suspense>} />
              <Route path="start" element={<Navigate to="/academy/home" replace />} />
              <Route path="learn" element={<Suspense fallback={<RouteFallback />}><AcademyLearn /></Suspense>} />
              <Route path="learn/:moduleSlug" element={<Suspense fallback={<RouteFallback />}><AcademyModule /></Suspense>} />
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
