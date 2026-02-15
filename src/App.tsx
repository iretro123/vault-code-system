import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { VaultStateProvider } from "@/contexts/VaultStateContext";
import NotFound from "./pages/NotFound";
import TradeLog from "./pages/TradeLog";
import Auth from "./pages/Auth";
import TraderCockpit from "./pages/TraderCockpit";
import Settings from "./pages/Settings";
import VaultLog from "./pages/VaultLog";
import Reports from "./pages/Reports";
import AcademyHome from "./pages/academy/AcademyHome";
import AcademyStart from "./pages/academy/AcademyStart";
import AcademyLearn from "./pages/academy/AcademyLearn";
import AcademyRoom from "./pages/academy/AcademyRoom";
import AcademyRooms from "./pages/academy/AcademyRooms";
import AcademyLive from "./pages/academy/AcademyLive";
import AcademyResources from "./pages/academy/AcademyResources";
import AcademyProfile from "./pages/academy/AcademyProfile";
import AcademyAdmin from "./pages/academy/AcademyAdmin";
import Hub from "./pages/Hub";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <VaultStateProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Navigate to="/cockpit" replace />} />
            <Route path="/hub" element={<Hub />} />
            <Route path="/cockpit" element={<TraderCockpit />} />
            <Route path="/log" element={<TradeLog />} />
            <Route path="/vault-log" element={<VaultLog />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/academy" element={<Navigate to="/academy/home" replace />} />
            <Route path="/academy/home" element={<AcademyHome />} />
            <Route path="/academy/start" element={<AcademyStart />} />
            <Route path="/academy/learn" element={<AcademyLearn />} />
            <Route path="/academy/rooms" element={<AcademyRooms />} />
            <Route path="/academy/room/:roomSlug" element={<AcademyRoom />} />
            <Route path="/academy/live" element={<AcademyLive />} />
            <Route path="/academy/resources" element={<AcademyResources />} />
            <Route path="/academy/profile" element={<AcademyProfile />} />
            <Route path="/academy/admin" element={<AcademyAdmin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
        </VaultStateProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
