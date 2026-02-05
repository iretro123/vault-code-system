 import { useState } from "react";
 import { useNavigate } from "react-router-dom";
 import { AppLayout } from "@/components/layout/AppLayout";
 import { PageHeader } from "@/components/layout/PageHeader";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Card } from "@/components/ui/card";
 import { Plus, CheckCircle, XCircle, Loader2, Trash2 } from "lucide-react";
 import { useAuth } from "@/hooks/useAuth";
 import { useTradeLog } from "@/hooks/useTradeLog";
 import { useToast } from "@/hooks/use-toast";
 import { cn } from "@/lib/utils";
 
 const emotionLevels = [
   { value: 1, label: "1", color: "bg-status-inactive" },
   { value: 2, label: "2", color: "bg-status-warning" },
   { value: 3, label: "3", color: "bg-muted-foreground" },
   { value: 4, label: "4", color: "bg-primary/70" },
   { value: 5, label: "5", color: "bg-status-active" },
 ];
 
 const TradeLog = () => {
   const { toast } = useToast();
   const { user, loading: authLoading } = useAuth();
   const { entries, loading: entriesLoading, addEntry, deleteEntry } = useTradeLog();
   const navigate = useNavigate();
   const [submitting, setSubmitting] = useState(false);
   
   const [trade, setTrade] = useState({
     riskUsed: "",
     rr: "",
     followedRules: null as boolean | null,
     emotionalState: 3,
   });
   
   const handleSubmit = async () => {
     if (!trade.riskUsed || !trade.rr || trade.followedRules === null) {
       toast({
         title: "Missing fields",
         description: "Please fill in all required fields.",
         variant: "destructive",
       });
       return;
     }
     
     setSubmitting(true);
     const { error } = await addEntry({
       risk_used: parseFloat(trade.riskUsed),
       risk_reward: parseFloat(trade.rr),
       followed_rules: trade.followedRules,
       emotional_state: trade.emotionalState,
     });
     
     if (!error) {
       setTrade({
         riskUsed: "",
         rr: "",
         followedRules: null,
         emotionalState: 3,
       });
     }
     setSubmitting(false);
   };
   
   const today = new Date().toLocaleDateString("en-US", {
     weekday: "long",
     month: "short",
     day: "numeric",
   });
   
   if (authLoading) {
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
   
   return (
     <AppLayout>
       <PageHeader 
         title="Trade Log" 
         subtitle={today}
       />
       
       <div className="px-4 md:px-6 space-y-6 pb-6">
         <Card className="p-5">
           <h3 className="font-medium mb-4">Quick Entry</h3>
           
           <div className="space-y-5">
             {/* Risk Used */}
             <div>
               <Label htmlFor="risk" className="text-sm text-muted-foreground">
                 Risk Used (%)
               </Label>
               <Input
                 id="risk"
                 type="number"
                 min="0"
                 max="100"
                 step="0.1"
                 placeholder="1.0"
                 value={trade.riskUsed}
                 onChange={(e) => setTrade(prev => ({ ...prev, riskUsed: e.target.value }))}
                 className="mt-1.5 h-14 text-xl font-mono"
               />
             </div>
             
             {/* Risk to Reward */}
             <div>
               <Label htmlFor="rr" className="text-sm text-muted-foreground">
                 Risk-to-Reward
               </Label>
               <Input
                 id="rr"
                 type="number"
                 min="0"
                 max="20"
                 step="0.1"
                 placeholder="2.0"
                 value={trade.rr}
                 onChange={(e) => setTrade(prev => ({ ...prev, rr: e.target.value }))}
                 className="mt-1.5 h-14 text-xl font-mono"
               />
             </div>
             
             {/* Followed Rules */}
             <div>
               <Label className="text-sm text-muted-foreground mb-3 block">
                 Followed Rules?
               </Label>
               <div className="grid grid-cols-2 gap-3">
                 <button
                   type="button"
                   onClick={() => setTrade(prev => ({ ...prev, followedRules: true }))}
                   className={cn(
                     "flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all",
                     trade.followedRules === true 
                       ? "border-status-active bg-status-active/10 text-status-active" 
                       : "border-border hover:border-muted-foreground"
                   )}
                 >
                   <CheckCircle className="w-5 h-5" />
                   <span className="font-medium">Yes</span>
                 </button>
                 <button
                   type="button"
                   onClick={() => setTrade(prev => ({ ...prev, followedRules: false }))}
                   className={cn(
                     "flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all",
                     trade.followedRules === false 
                       ? "border-status-inactive bg-status-inactive/10 text-status-inactive" 
                       : "border-border hover:border-muted-foreground"
                   )}
                 >
                   <XCircle className="w-5 h-5" />
                   <span className="font-medium">No</span>
                 </button>
               </div>
             </div>
             
             {/* Emotional State */}
             <div>
               <Label className="text-sm text-muted-foreground mb-3 block">
                 Emotional State (1-5)
               </Label>
               <div className="flex gap-2">
                 {emotionLevels.map((level) => (
                   <button
                     key={level.value}
                     type="button"
                     onClick={() => setTrade(prev => ({ ...prev, emotionalState: level.value }))}
                     className={cn(
                       "flex-1 aspect-square rounded-lg flex items-center justify-center text-lg font-semibold transition-all",
                       trade.emotionalState === level.value 
                         ? `${level.color} text-background scale-105` 
                         : "bg-muted text-muted-foreground hover:bg-muted/80"
                     )}
                   >
                     {level.label}
                   </button>
                 ))}
               </div>
               <p className="text-xs text-muted-foreground mt-2 text-center">
                 1 = Distressed · 5 = Calm & Focused
               </p>
             </div>
           </div>
         </Card>
         
         {/* Submit Button */}
         <Button 
           size="lg" 
           className="w-full h-14 text-base font-medium gap-2"
           onClick={handleSubmit}
           disabled={submitting}
         >
           {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
           {submitting ? "Logging..." : "Log Trade"}
         </Button>
         
         {/* Recent Trades Placeholder */}
         <div className="pt-4">
           <p className="section-title">Recent Entries</p>
           {entriesLoading ? (
             <div className="flex justify-center py-8">
               <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
             </div>
           ) : entries.length === 0 ? (
             <div className="text-center py-8 text-muted-foreground">
               <p className="text-sm">No trades logged yet</p>
             </div>
           ) : (
             <div className="space-y-2">
               {entries.slice(0, 10).map((entry) => (
                 <Card key={entry.id} className="p-4">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       {entry.followed_rules ? (
                         <CheckCircle className="w-5 h-5 text-status-active" />
                       ) : (
                         <XCircle className="w-5 h-5 text-status-inactive" />
                       )}
                       <div>
                         <p className="font-mono text-sm">
                           {entry.risk_used}% risk · {entry.risk_reward}R
                         </p>
                         <p className="text-xs text-muted-foreground">
                           {new Date(entry.trade_date).toLocaleDateString()}
                         </p>
                       </div>
                     </div>
                     <button
                       onClick={() => deleteEntry(entry.id)}
                       className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 </Card>
               ))}
             </div>
           )}
         </div>
       </div>
     </AppLayout>
   );
 };
 
 export default TradeLog;