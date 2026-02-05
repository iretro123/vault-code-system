 import { useState } from "react";
 import { AppLayout } from "@/components/layout/AppLayout";
 import { PageHeader } from "@/components/layout/PageHeader";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Card } from "@/components/ui/card";
 import { Plus, CheckCircle, XCircle } from "lucide-react";
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
   const [trade, setTrade] = useState({
     riskUsed: "",
     rr: "",
     followedRules: null as boolean | null,
     emotionalState: 3,
   });
   
   const handleSubmit = () => {
     if (!trade.riskUsed || !trade.rr || trade.followedRules === null) {
       toast({
         title: "Missing fields",
         description: "Please fill in all required fields.",
         variant: "destructive",
       });
       return;
     }
     
     toast({
       title: "Trade logged",
       description: "Your trade has been recorded.",
     });
     
     // Reset form
     setTrade({
       riskUsed: "",
       rr: "",
       followedRules: null,
       emotionalState: 3,
     });
   };
   
   const today = new Date().toLocaleDateString("en-US", {
     weekday: "long",
     month: "short",
     day: "numeric",
   });
   
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
         >
           <Plus className="w-5 h-5" />
           Log Trade
         </Button>
         
         {/* Recent Trades Placeholder */}
         <div className="pt-4">
           <p className="section-title">Recent Entries</p>
           <div className="text-center py-8 text-muted-foreground">
             <p className="text-sm">No trades logged yet</p>
           </div>
         </div>
       </div>
     </AppLayout>
   );
 };
 
 export default TradeLog;