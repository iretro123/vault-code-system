 import { useState, useEffect } from "react";
 import { useNavigate } from "react-router-dom";
 import { AppLayout } from "@/components/layout/AppLayout";
 import { PageHeader } from "@/components/layout/PageHeader";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Checkbox } from "@/components/ui/checkbox";
 import { Card } from "@/components/ui/card";
 import { Save, Lock, Loader2 } from "lucide-react";
 import { useAuth } from "@/hooks/useAuth";
 import { useTradingRules } from "@/hooks/useTradingRules";
 
 const tradingSessions = [
   { id: "london", label: "London Session" },
   { id: "newyork", label: "New York Session" },
 ];
 
 const forbiddenBehaviors = [
   { id: "revenge", label: "Revenge trading" },
   { id: "oversize", label: "Oversizing positions" },
   { id: "fomo", label: "FOMO entries" },
   { id: "noplan", label: "Trading without a plan" },
   { id: "earlyexit", label: "Early exit from winners" },
   { id: "movingsl", label: "Moving stop loss" },
 ];
 
 const Rules = () => {
   const { user, hasMinRole, loading: authLoading } = useAuth();
   const { rules: savedRules, loading: rulesLoading, updateRules } = useTradingRules();
   const navigate = useNavigate();
   const [saving, setSaving] = useState(false);
   
   const [localRules, setLocalRules] = useState({
     maxRiskPerTrade: "1",
     maxTradesPerDay: "3",
     maxDailyLoss: "3",
     allowedSessions: ["london", "newyork"] as string[],
     forbiddenBehaviors: [] as string[],
   });
   
   useEffect(() => {
     if (savedRules) {
       setLocalRules({
         maxRiskPerTrade: String(savedRules.max_risk_per_trade),
         maxTradesPerDay: String(savedRules.max_trades_per_day),
         maxDailyLoss: String(savedRules.max_daily_loss),
         allowedSessions: savedRules.allowed_sessions,
         forbiddenBehaviors: savedRules.forbidden_behaviors,
       });
     }
   }, [savedRules]);
   
   const handleSessionChange = (sessionId: string, checked: boolean) => {
     setLocalRules(prev => ({
       ...prev,
       allowedSessions: checked 
         ? [...prev.allowedSessions, sessionId]
         : prev.allowedSessions.filter(s => s !== sessionId)
     }));
   };
   
   const handleBehaviorChange = (behaviorId: string, checked: boolean) => {
     setLocalRules(prev => ({
       ...prev,
       forbiddenBehaviors: checked 
         ? [...prev.forbiddenBehaviors, behaviorId]
         : prev.forbiddenBehaviors.filter(b => b !== behaviorId)
     }));
   };
   
   const handleSave = async () => {
     setSaving(true);
     await updateRules({
       max_risk_per_trade: parseFloat(localRules.maxRiskPerTrade),
       max_trades_per_day: parseInt(localRules.maxTradesPerDay),
       max_daily_loss: parseFloat(localRules.maxDailyLoss),
       allowed_sessions: localRules.allowedSessions,
       forbidden_behaviors: localRules.forbiddenBehaviors,
     });
     setSaving(false);
   };
   
   if (authLoading || rulesLoading) {
     return (
       <AppLayout>
         <div className="flex items-center justify-center min-h-[60vh]">
           <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
         </div>
       </AppLayout>
     );
   }
   
   if (!user) {
     navigate("/auth");
     return null;
   }
   
   const hasAccess = hasMinRole("vault_os_owner");
   
   if (!hasAccess) {
     return (
       <AppLayout>
         <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
           <Lock className="w-12 h-12 text-muted-foreground mb-4" />
           <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
           <p className="text-muted-foreground max-w-sm">
             Rule Vault is only available to Vault OS Owners. Upgrade to unlock.
           </p>
           <Button className="mt-6" onClick={() => navigate("/upgrade")}>
             Upgrade Now
           </Button>
         </div>
       </AppLayout>
     );
   }
   
   return (
     <AppLayout>
       <PageHeader 
         title="Rule Vault" 
         subtitle="Define your trading discipline"
       />
       
       <div className="px-4 md:px-6 space-y-6 pb-6">
         <Card className="p-5">
           <h3 className="font-medium mb-4">Risk Parameters</h3>
           <div className="space-y-4">
             <div>
               <Label htmlFor="maxRisk" className="text-sm text-muted-foreground">
                 Max Risk Per Trade (%)
               </Label>
               <Input
                 id="maxRisk"
                 type="number"
                 min="0.1"
                 max="10"
                 step="0.1"
                 value={localRules.maxRiskPerTrade}
                 onChange={(e) => setLocalRules(prev => ({ ...prev, maxRiskPerTrade: e.target.value }))}
                 className="mt-1.5 h-12 text-lg font-mono"
               />
             </div>
             <div>
               <Label htmlFor="maxTrades" className="text-sm text-muted-foreground">
                 Max Trades Per Day
               </Label>
               <Input
                 id="maxTrades"
                 type="number"
                 min="1"
                 max="20"
                 value={localRules.maxTradesPerDay}
                 onChange={(e) => setLocalRules(prev => ({ ...prev, maxTradesPerDay: e.target.value }))}
                 className="mt-1.5 h-12 text-lg font-mono"
               />
             </div>
             <div>
               <Label htmlFor="maxLoss" className="text-sm text-muted-foreground">
                 Max Daily Loss (%)
               </Label>
               <Input
                 id="maxLoss"
                 type="number"
                 min="0.5"
                 max="20"
                 step="0.5"
                 value={localRules.maxDailyLoss}
                 onChange={(e) => setLocalRules(prev => ({ ...prev, maxDailyLoss: e.target.value }))}
                 className="mt-1.5 h-12 text-lg font-mono"
               />
             </div>
           </div>
         </Card>
         
         <Card className="p-5">
           <h3 className="font-medium mb-4">Allowed Trading Sessions</h3>
           <div className="space-y-3">
             {tradingSessions.map((session) => (
               <label
                 key={session.id}
                 className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
               >
                 <Checkbox
                   checked={localRules.allowedSessions.includes(session.id)}
                   onCheckedChange={(checked) => handleSessionChange(session.id, checked as boolean)}
                 />
                 <span className="font-medium">{session.label}</span>
               </label>
             ))}
           </div>
         </Card>
         
         <Card className="p-5">
           <h3 className="font-medium mb-4">Forbidden Behaviors</h3>
           <p className="text-sm text-muted-foreground mb-4">
             Select behaviors that violate your discipline
           </p>
           <div className="grid grid-cols-1 gap-2">
             {forbiddenBehaviors.map((behavior) => (
               <label
                 key={behavior.id}
                 className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
               >
                 <Checkbox
                   checked={localRules.forbiddenBehaviors.includes(behavior.id)}
                   onCheckedChange={(checked) => handleBehaviorChange(behavior.id, checked as boolean)}
                 />
                 <span>{behavior.label}</span>
               </label>
             ))}
           </div>
         </Card>
         
         <Button 
           size="lg" 
           className="w-full h-14 text-base font-medium gap-2"
           onClick={handleSave}
           disabled={saving}
         >
           {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
           {saving ? "Saving..." : "Save Rules"}
         </Button>
       </div>
     </AppLayout>
   );
 };
 
 export default Rules;