 import { useState, useCallback } from "react";
 import { useNavigate } from "react-router-dom";
 import { AppLayout } from "@/components/layout/AppLayout";
 import { PageHeader } from "@/components/layout/PageHeader";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Card } from "@/components/ui/card";
 import { Plus, CheckCircle, XCircle, Loader2, Trash2, AlertTriangle, Lock, Shield } from "lucide-react";
 import { useAuth } from "@/hooks/useAuth";
 import { useTradeLog } from "@/hooks/useTradeLog";
 import { useVaultStatus } from "@/hooks/useVaultStatus";
 import { PreTradeExecutionGate } from "@/components/PreTradeExecutionGate";
 import {
   Dialog,
   DialogContent,
 } from "@/components/ui/dialog";
 import { useToast } from "@/hooks/use-toast";
 import { cn } from "@/lib/utils";
 
 
 const TradeLog = () => {
   const { toast } = useToast();
   const { user, loading: authLoading } = useAuth();
   const { entries, loading: entriesLoading, addEntry, deleteEntry } = useTradeLog();
   const vaultStatus = useVaultStatus();
   const navigate = useNavigate();
   
   const [submitting, setSubmitting] = useState(false);
   const [showGate, setShowGate] = useState(false);
   
   const [trade, setTrade] = useState({
     riskUsed: "",
     rr: "",
     followedRules: null as boolean | null,
   });
   
   // Step 1: Validate form and open the execution gate
   const handleInitiateSubmit = () => {
     // Basic form validation
     if (!trade.riskUsed || !trade.rr || trade.followedRules === null) {
       toast({
         title: "Missing fields",
         description: "Please fill in all required fields.",
         variant: "destructive",
       });
       return;
     }
     
     // Open the PreTradeExecutionGate
     setShowGate(true);
   };
 
   // Step 2: Execute trade after gate clearance
   const handleGateCleared = useCallback(async (emotionalState: number) => {
     setShowGate(false);
     setSubmitting(true);
     
     const { error } = await addEntry({
       risk_used: parseFloat(trade.riskUsed),
       risk_reward: parseFloat(trade.rr),
       followed_rules: trade.followedRules!,
       emotional_state: emotionalState,
     });
     
     if (!error) {
       toast({
         title: "Trade logged",
         description: "Your trade has been recorded successfully.",
       });
       setTrade({
         riskUsed: "",
         rr: "",
         followedRules: null,
       });
       // Vault status refreshes automatically via realtime subscription
     } else {
       toast({
         title: "Trade blocked",
         description: error.message || "Failed to log trade",
         variant: "destructive",
       });
     }
     
     setSubmitting(false);
   }, [addEntry, trade, toast]);
 
   // Step 3: Handle gate cancellation
   const handleGateCancelled = useCallback(() => {
     setShowGate(false);
   }, []);
   
   const today = new Date().toLocaleDateString("en-US", {
     weekday: "long",
     month: "short",
     day: "numeric",
   });
   
   if (authLoading || vaultStatus.loading) {
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
   
   const isNearTradeLimit = vaultStatus.tradesRemaining <= 1 && vaultStatus.tradesRemaining > 0;
   const isNearLossLimit = vaultStatus.dailyLossRemaining < vaultStatus.maxRiskPerTrade * 2;
   const plannedRisk = parseFloat(trade.riskUsed) || 0;
   
   return (
     <AppLayout>
       <PageHeader 
         title="Trade Log" 
         subtitle={today}
       />
       
       <div className="px-4 md:px-6 space-y-6 pb-6">
         {/* Pre-Trade Execution Gate Modal */}
         <Dialog open={showGate} onOpenChange={setShowGate}>
           <DialogContent className="sm:max-w-md p-0 border-0 bg-transparent shadow-none">
             <PreTradeExecutionGate
               plannedRisk={plannedRisk}
               onCleared={handleGateCleared}
               onCancel={handleGateCancelled}
             />
           </DialogContent>
         </Dialog>
 
         {/* Trading Status Warning */}
         {!vaultStatus.canTrade && (
           <Card className="p-4 border-status-inactive/50 bg-status-inactive/5">
             <div className="flex items-start gap-3">
               <Lock className="w-5 h-5 text-status-inactive flex-shrink-0 mt-0.5" />
               <div>
               <p className="font-medium text-status-inactive">Trading Blocked</p>
                 <p className="text-sm text-muted-foreground">{vaultStatus.reason}</p>
               </div>
             </div>
           </Card>
         )}
         
         {/* Limit Warnings */}
         {vaultStatus.canTrade && (isNearTradeLimit || isNearLossLimit) && (
           <Card className="p-4 border-status-warning/50 bg-status-warning/5">
             <div className="flex items-start gap-3">
               <AlertTriangle className="w-5 h-5 text-status-warning flex-shrink-0 mt-0.5" />
               <div>
                 <p className="font-medium text-status-warning">Approaching Limits</p>
                 <p className="text-sm text-muted-foreground">
                   {isNearTradeLimit && `${vaultStatus.tradesRemaining} trade${vaultStatus.tradesRemaining === 1 ? '' : 's'} remaining. `}
                   {isNearLossLimit && `${vaultStatus.dailyLossRemaining.toFixed(1)}% daily loss remaining.`}
                 </p>
               </div>
             </div>
           </Card>
         )}
         
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
                 disabled={!vaultStatus.canTrade}
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
                 disabled={!vaultStatus.canTrade}
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
                     disabled={!vaultStatus.canTrade}
                   className={cn(
                     "flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all disabled:opacity-50",
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
                     disabled={!vaultStatus.canTrade}
                   className={cn(
                     "flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all disabled:opacity-50",
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
             
             {/* Emotional State - Now captured in the PreTradeExecutionGate */}
             <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                 <Shield className="w-4 h-4" />
                 <span>Emotional state will be confirmed in pre-trade gate</span>
               </div>
             </div>
           </div>
         </Card>
         
         {/* Submit Button */}
         <Button 
           size="lg" 
           className="w-full h-14 text-base font-medium gap-2"
           onClick={handleInitiateSubmit}
           disabled={submitting || !vaultStatus.canTrade}
           variant={vaultStatus.canTrade ? "default" : "secondary"}
         >
           {submitting ? (
             <Loader2 className="w-5 h-5 animate-spin" />
           ) : !vaultStatus.canTrade ? (
             <Lock className="w-5 h-5" />
           ) : (
             <Shield className="w-5 h-5" />
           )}
           {submitting ? "Logging..." : !vaultStatus.canTrade ? "Trading Blocked" : "Pre-Trade Check"}
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