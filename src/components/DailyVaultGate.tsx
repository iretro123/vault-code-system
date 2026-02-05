 import { useState } from "react";
 import { Card } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Progress } from "@/components/ui/progress";
 import { Checkbox } from "@/components/ui/checkbox";
 import { Slider } from "@/components/ui/slider";
 import { useDailyVaultStatus, useCompleteDailyChecklist } from "@/hooks/useDailyVaultStatus";
 import { Lock, Unlock, Brain, Moon, Heart, FileText, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { Skeleton } from "@/components/ui/skeleton";
 import { toast } from "sonner";
 
 interface ChecklistFormData {
   mentalState: number;
   sleepQuality: number;
   emotionalControl: number;
   planReviewed: boolean;
   riskConfirmed: boolean;
 }
 
 function RatingSlider({ 
   value, 
   onChange, 
   label, 
   icon: Icon 
 }: { 
   value: number; 
   onChange: (v: number) => void; 
   label: string;
   icon: React.ElementType;
 }) {
   const getLabel = (v: number) => {
     if (v === 1) return "Poor";
     if (v === 2) return "Below Avg";
     if (v === 3) return "Average";
     if (v === 4) return "Good";
     return "Excellent";
   };
 
   const getColor = (v: number) => {
     if (v <= 2) return "text-status-inactive";
     if (v === 3) return "text-status-warning";
     return "text-status-active";
   };
 
   return (
     <div className="space-y-3">
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-2">
           <Icon className="w-4 h-4 text-muted-foreground" />
           <span className="text-sm font-medium">{label}</span>
         </div>
         <span className={cn("text-sm font-bold", getColor(value))}>
           {value}/5 — {getLabel(value)}
         </span>
       </div>
       <Slider
         value={[value]}
         onValueChange={(v) => onChange(v[0])}
         min={1}
         max={5}
         step={1}
         className="w-full"
       />
     </div>
   );
 }
 
 export function DailyVaultGate() {
   const dailyStatus = useDailyVaultStatus();
   const { completeChecklist, loading: submitting } = useCompleteDailyChecklist();
   
   const [formData, setFormData] = useState<ChecklistFormData>({
     mentalState: 3,
     sleepQuality: 3,
     emotionalControl: 3,
     planReviewed: false,
     riskConfirmed: false,
   });
 
   const handleSubmit = async () => {
     if (!formData.planReviewed || !formData.riskConfirmed) {
       toast.error("Please complete all checklist items");
       return;
     }
 
     const result = await completeChecklist(formData);
     
     if (result.success) {
       toast.success(result.message);
       dailyStatus.refetch();
     } else {
       toast.error(result.message);
     }
   };
 
   // If vault is open, don't show the gate
   if (!dailyStatus.loading && dailyStatus.vaultOpen) {
     return null;
   }
 
   // If already completed but vault still locked (discipline locked), show different message
   if (!dailyStatus.loading && dailyStatus.checklistCompleted && !dailyStatus.vaultOpen) {
     return (
       <Card className="p-6 border-2 border-status-warning/30 bg-status-warning/5">
         <div className="flex items-center gap-3 mb-4">
           <div className="p-3 rounded-full bg-status-warning/20">
             <AlertTriangle className="w-6 h-6 text-status-warning" />
           </div>
           <div>
             <h3 className="font-bold text-status-warning">Vault Partially Locked</h3>
             <p className="text-sm text-muted-foreground">
               Daily ritual complete, but discipline is locked
             </p>
           </div>
         </div>
         <p className="text-sm text-muted-foreground">
           Complete your recovery tasks to fully unlock the vault.
         </p>
       </Card>
     );
   }
 
   if (dailyStatus.loading) {
     return (
       <Card className="p-6 border-2 border-primary/20">
         <div className="flex items-center gap-3 mb-6">
           <Skeleton className="h-12 w-12 rounded-full" />
           <div className="space-y-2">
             <Skeleton className="h-5 w-40" />
             <Skeleton className="h-4 w-56" />
           </div>
         </div>
         <div className="space-y-4">
           <Skeleton className="h-16 w-full" />
           <Skeleton className="h-16 w-full" />
           <Skeleton className="h-16 w-full" />
         </div>
       </Card>
     );
   }
 
   const progress = ((5 - dailyStatus.actionsRemaining) / 5) * 100;
 
   return (
     <Card className="p-6 border-2 border-status-inactive/30 bg-gradient-to-b from-status-inactive/10 to-transparent">
       {/* Header */}
       <div className="flex items-center gap-3 mb-6">
         <div className="p-3 rounded-full bg-status-inactive/20">
           <Lock className="w-6 h-6 text-status-inactive" />
         </div>
         <div className="flex-1">
           <h3 className="font-bold text-status-inactive text-lg">Vault Closed</h3>
           <p className="text-sm text-muted-foreground">
             Complete your daily ritual to open the vault
           </p>
         </div>
       </div>
 
       {/* Progress */}
       <div className="mb-6">
         <div className="flex items-center justify-between mb-2">
           <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
             Ritual Progress
           </span>
           <span className="text-sm font-bold">
             {5 - dailyStatus.actionsRemaining}/5 Complete
           </span>
         </div>
         <Progress value={progress} className="h-2" />
       </div>
 
       {/* Checklist Form */}
       <div className="space-y-5">
         {/* Rating Sliders */}
         <RatingSlider
           value={formData.mentalState}
           onChange={(v) => setFormData((p) => ({ ...p, mentalState: v }))}
           label="Mental State"
           icon={Brain}
         />
         
         <RatingSlider
           value={formData.sleepQuality}
           onChange={(v) => setFormData((p) => ({ ...p, sleepQuality: v }))}
           label="Sleep Quality"
           icon={Moon}
         />
         
         <RatingSlider
           value={formData.emotionalControl}
           onChange={(v) => setFormData((p) => ({ ...p, emotionalControl: v }))}
           label="Emotional Control"
           icon={Heart}
         />
 
         {/* Boolean Confirmations */}
         <div className="space-y-3 pt-2 border-t border-border">
           <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
             <Checkbox
               checked={formData.planReviewed}
               onCheckedChange={(checked) => 
                 setFormData((p) => ({ ...p, planReviewed: checked === true }))
               }
               className="mt-0.5"
             />
             <div className="flex-1">
               <div className="flex items-center gap-2">
                 <FileText className="w-4 h-4 text-muted-foreground" />
                 <span className="text-sm font-medium">Trading Plan Reviewed</span>
               </div>
               <p className="text-xs text-muted-foreground mt-1">
                 I have reviewed my trading plan and know my setups for today
               </p>
             </div>
           </label>
 
           <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
             <Checkbox
               checked={formData.riskConfirmed}
               onCheckedChange={(checked) => 
                 setFormData((p) => ({ ...p, riskConfirmed: checked === true }))
               }
               className="mt-0.5"
             />
             <div className="flex-1">
               <div className="flex items-center gap-2">
                 <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                 <span className="text-sm font-medium">Max Risk Understood</span>
               </div>
               <p className="text-xs text-muted-foreground mt-1">
                 I understand my maximum risk per trade and daily loss limits
               </p>
             </div>
           </label>
         </div>
       </div>
 
       {/* Submit Button */}
       <Button
         onClick={handleSubmit}
         disabled={submitting || !formData.planReviewed || !formData.riskConfirmed}
         className="w-full mt-6 h-12 text-base font-medium gap-2"
       >
         {submitting ? (
           <>
             <Loader2 className="w-5 h-5 animate-spin" />
             Opening Vault...
           </>
         ) : (
           <>
             <Unlock className="w-5 h-5" />
             Complete Ritual & Open Vault
           </>
         )}
       </Button>
 
       {/* Warning for low scores */}
       {(formData.mentalState <= 2 || formData.sleepQuality <= 2 || formData.emotionalControl <= 2) && (
         <div className="mt-4 p-3 rounded-lg bg-status-warning/10 border border-status-warning/20">
           <div className="flex items-start gap-2">
             <AlertTriangle className="w-4 h-4 text-status-warning shrink-0 mt-0.5" />
             <p className="text-xs text-status-warning">
               Your self-assessment indicates suboptimal conditions. Consider reducing risk or sitting out today.
             </p>
           </div>
         </div>
       )}
     </Card>
   );
 }