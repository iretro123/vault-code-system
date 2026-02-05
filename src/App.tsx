import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
 import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
 import Rules from "./pages/Rules";
 import TradeLog from "./pages/TradeLog";
 import Academy from "./pages/Academy";
 import Upgrade from "./pages/Upgrade";
 import Auth from "./pages/Auth";
 import VaultIntelligence from "./pages/VaultIntelligence";
 import RiskCalculator from "./pages/RiskCalculator";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
     <BrowserRouter>
       <AuthProvider>
         <TooltipProvider>
           <Toaster />
           <Sonner />
           <Routes>
             <Route path="/" element={<Index />} />
             <Route path="/rules" element={<Rules />} />
             <Route path="/log" element={<TradeLog />} />
             <Route path="/academy" element={<Academy />} />
             <Route path="/upgrade" element={<Upgrade />} />
             <Route path="/auth" element={<Auth />} />
             <Route path="/intelligence" element={<VaultIntelligence />} />
             <Route path="/risk" element={<RiskCalculator />} />
             {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
             <Route path="*" element={<NotFound />} />
           </Routes>
         </TooltipProvider>
       </AuthProvider>
     </BrowserRouter>
  </QueryClientProvider>
);

export default App;
