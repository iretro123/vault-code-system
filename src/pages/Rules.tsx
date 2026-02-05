 import { useState } from "react";
 import { AppLayout } from "@/components/layout/AppLayout";
 import { PageHeader } from "@/components/layout/PageHeader";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Checkbox } from "@/components/ui/checkbox";
 import { Card } from "@/components/ui/card";
 import { Save, Lock } from "lucide-react";
 import { useToast } from "@/hooks/use-toast";
 
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
   const { toast } = useToast();
   const [rules, setRules] = useState({
     maxRiskPerTrade: "1",
     maxTradesPerDay: "3",
     maxDailyLoss: "3",
     allowedSessions: ["london", "newyork"],
     forbiddenBehaviors: ["revenge", "oversize"],
   });
   
   const handleSessionChange = (sessionId: string, checked: boolean) => {
     setRules(prev => ({
       ...prev,
       allowedSessions: checked 
         ? [...prev.allowedSessions, sessionId]
         : prev.allowedSessions.filter(s => s !== sessionId)
     }));
   };
   
   const handleBehaviorChange = (behaviorId: string, checked: boolean) => {
     setRules(prev => ({
       ...prev,
       forbiddenBehaviors: checked 
         ? [...prev.forbiddenBehaviors, behaviorId]
         : prev.forbiddenBehaviors.filter(b => b !== behaviorId)
     }));
   };
   
   const handleSave = () => {
     toast({
       title: "Rules saved",
       description: "Your trading rules have been updated.",
     });
   };
   
   // Placeholder for role check - will be replaced with actual auth
   const hasAccess = true;
   
   if (!hasAccess) {
     return (
       <AppLayout>
         <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
           <Lock className="w-12 h-12 text-muted-foreground mb-4" />
           <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
           <p className="text-muted-foreground max-w-sm">
             Rule Vault is only available to Vault OS Owners. Upgrade to unlock.
           </p>
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
         {/* Risk Parameters */}
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
                 value={rules.maxRiskPerTrade}
                 onChange={(e) => setRules(prev => ({ ...prev, maxRiskPerTrade: e.target.value }))}
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
                 value={rules.maxTradesPerDay}
                 onChange={(e) => setRules(prev => ({ ...prev, maxTradesPerDay: e.target.value }))}
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
                 value={rules.maxDailyLoss}
                 onChange={(e) => setRules(prev => ({ ...prev, maxDailyLoss: e.target.value }))}
                 className="mt-1.5 h-12 text-lg font-mono"
               />
             </div>
           </div>
         </Card>
         
         {/* Trading Sessions */}
         <Card className="p-5">
           <h3 className="font-medium mb-4">Allowed Trading Sessions</h3>
           <div className="space-y-3">
             {tradingSessions.map((session) => (
               <label
                 key={session.id}
                 className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
               >
                 <Checkbox
                   checked={rules.allowedSessions.includes(session.id)}
                   onCheckedChange={(checked) => handleSessionChange(session.id, checked as boolean)}
                 />
                 <span className="font-medium">{session.label}</span>
               </label>
             ))}
           </div>
         </Card>
         
         {/* Forbidden Behaviors */}
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
                   checked={rules.forbiddenBehaviors.includes(behavior.id)}
                   onCheckedChange={(checked) => handleBehaviorChange(behavior.id, checked as boolean)}
                 />
                 <span>{behavior.label}</span>
               </label>
             ))}
           </div>
         </Card>
         
         {/* Save Button */}
         <Button 
           size="lg" 
           className="w-full h-14 text-base font-medium gap-2"
           onClick={handleSave}
         >
           <Save className="w-5 h-5" />
           Save Rules
         </Button>
       </div>
     </AppLayout>
   );
 };
 
 export default Rules;