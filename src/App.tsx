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
            <Route path="/cockpit" element={<TraderCockpit />} />
            <Route path="/log" element={<TradeLog />} />
            <Route path="/vault-log" element={<VaultLog />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/auth" element={<Auth />} />
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
