import { useEffect } from "react";
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
import TradeLog from "./pages/TradeLog";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import TraderCockpit from "./pages/TraderCockpit";
import { VaultOSGate } from "./components/VaultOSGate";
import Settings from "./pages/Settings";
import VaultLog from "./pages/VaultLog";
import Reports from "./pages/Reports";
import { AcademyLayout } from "./components/layout/AcademyLayout";
import AcademyHome from "./pages/academy/AcademyHome";

import AcademyLearn from "./pages/academy/AcademyLearn";
import AcademyModule from "./pages/academy/AcademyModule";
import AcademyCommunity from "./pages/academy/AcademyCommunity";
import AcademyTrade from "./pages/academy/AcademyTrade";
import AcademyRoom from "./pages/academy/AcademyRoom";
import AcademyLive from "./pages/academy/AcademyLive";
import AcademyResources from "./pages/academy/AcademyResources";
import AcademyProfile from "./pages/academy/AcademyProfile";
import AcademySettings from "./pages/academy/AcademySettings";
import AcademyAdmin from "./pages/academy/AcademyAdmin";
import AcademyAdminUsers from "./pages/academy/AcademyAdminUsers";
import AdminPanel from "./pages/academy/AdminPanel";
import AcademyJournal from "./pages/academy/AcademyJournal";
import AcademyProgress from "./pages/academy/AcademyProgress";
import AcademyMyQuestions from "./pages/academy/AcademyMyQuestions";
import AcademyPlaybook from "./pages/academy/AcademyPlaybook";
import AcademyQA from "./pages/academy/AcademyQA";

import AcademySupport from "./pages/academy/AcademySupport";
import AcademyVaultApproval from "./pages/academy/AcademyVaultApproval";

import ReferralRedirect from "./pages/ReferralRedirect";
import ResetPassword from "./pages/ResetPassword";

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
              <Route path="home" element={<AcademyHome />} />
              <Route path="start" element={<Navigate to="/academy/home" replace />} />
              <Route path="learn" element={<AcademyLearn />} />
              <Route path="learn/:moduleSlug" element={<AcademyModule />} />
              <Route path="community" element={<AcademyCommunity />} />
              <Route path="trade" element={<AcademyTrade />} />
              <Route path="rooms" element={<Navigate to="/academy/community" replace />} />
              <Route path="room/:roomSlug" element={<AcademyRoom />} />
              <Route path="live" element={<AcademyLive />} />
              <Route path="resources" element={<AcademyResources />} />
              <Route path="profile" element={<AcademyProfile />} />
              <Route path="settings" element={<AcademySettings />} />
              <Route path="my-questions" element={<AcademyMyQuestions />} />
              <Route path="journal" element={<AcademyJournal />} />
              <Route path="progress" element={<AcademyProgress />} />
              <Route path="playbook" element={<AcademyPlaybook />} />
              <Route path="vault-os" element={<Navigate to="/academy/home" replace />} />
              <Route path="vault" element={<AcademyVaultApproval />} />
              <Route path="support" element={<AcademySupport />} />
              <Route path="admin" element={<AcademyAdmin />} />
              <Route path="admin/users" element={<AcademyAdminUsers />} />
              <Route path="admin/panel" element={<AdminPanel />} />
              <Route path="admin/qa" element={<AcademyQA />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
        </AdminModeProvider>
        </AcademyDataProvider>
        </VaultStateProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
