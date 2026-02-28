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
import NotFound from "./pages/NotFound";
import TradeLog from "./pages/TradeLog";
import Auth from "./pages/Auth";
import TraderCockpit from "./pages/TraderCockpit";
import { VaultOSGate } from "./components/VaultOSGate";
import Settings from "./pages/Settings";
import VaultLog from "./pages/VaultLog";
import Reports from "./pages/Reports";
import AcademyHome from "./pages/academy/AcademyHome";
import AcademyStart from "./pages/academy/AcademyStart";
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
import Hub from "./pages/Hub";

const queryClient = new QueryClient();

function ReferralCapture() {
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) captureReferral(ref);
  }, [searchParams]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ReferralCapture />
      <AuthProvider>
        <VaultStateProvider>
        <AcademyDataProvider>
        <AdminModeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Navigate to="/hub" replace />} />
            <Route path="/hub" element={<Hub />} />
            <Route path="/cockpit" element={<VaultOSGate><TraderCockpit /></VaultOSGate>} />
            <Route path="/log" element={<VaultOSGate><TradeLog /></VaultOSGate>} />
            <Route path="/vault-log" element={<VaultOSGate><VaultLog /></VaultOSGate>} />
            <Route path="/reports" element={<VaultOSGate><Reports /></VaultOSGate>} />
            <Route path="/settings" element={<VaultOSGate><Settings /></VaultOSGate>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/academy" element={<Navigate to="/academy/home" replace />} />
            <Route path="/academy/home" element={<AcademyHome />} />
            <Route path="/academy/start" element={<AcademyStart />} />
            <Route path="/academy/learn" element={<AcademyLearn />} />
            <Route path="/academy/learn/:moduleSlug" element={<AcademyModule />} />
            <Route path="/academy/community" element={<AcademyCommunity />} />
            <Route path="/academy/trade" element={<AcademyTrade />} />
            {/* Legacy room routes — redirect to community */}
            <Route path="/academy/rooms" element={<Navigate to="/academy/community" replace />} />
            <Route path="/academy/room/:roomSlug" element={<AcademyRoom />} />
            <Route path="/academy/live" element={<AcademyLive />} />
            <Route path="/academy/resources" element={<AcademyResources />} />
            <Route path="/academy/profile" element={<AcademyProfile />} />
            <Route path="/academy/settings" element={<AcademySettings />} />
            <Route path="/academy/my-questions" element={<AcademyMyQuestions />} />
            <Route path="/academy/journal" element={<AcademyJournal />} />
            <Route path="/academy/progress" element={<AcademyProgress />} />
            <Route path="/academy/playbook" element={<AcademyPlaybook />} />
            <Route path="/academy/admin" element={<AcademyAdmin />} />
            <Route path="/academy/admin/users" element={<AcademyAdminUsers />} />
            <Route path="/academy/admin/panel" element={<AdminPanel />} />
            <Route path="/academy/admin/qa" element={<AcademyQA />} />
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
