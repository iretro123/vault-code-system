 import { Card } from "@/components/ui/card";
 import { Progress } from "@/components/ui/progress";
 import { useVaultRecoveryPlan } from "@/hooks/useVaultRecoveryPlan";
 import { Lock, CheckCircle2, Circle, Clock, AlertTriangle, ArrowRight } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { Skeleton } from "@/components/ui/skeleton";
 
 export function VaultRecoveryCard() {
   const recovery = useVaultRecoveryPlan();
 
   // Don't render if not locked
   if (!recovery.loading && !recovery.isLocked) {
     return null;
   }
 
   if (recovery.loading) {
     return (
       <Card className="p-5 border-2 border-status-inactive/30 bg-status-inactive/5">
         <div className="flex items-center gap-3 mb-4">
           <Skeleton className="h-10 w-10 rounded-full" />
           <div className="space-y-2">
             <Skeleton className="h-4 w-32" />
             <Skeleton className="h-3 w-48" />
           </div>
         </div>
         <Skeleton className="h-2 w-full mb-4" />
         <div className="space-y-3">
           <Skeleton className="h-12 w-full" />
           <Skeleton className="h-12 w-full" />
           <Skeleton className="h-12 w-full" />
         </div>
       </Card>
     );
   }
 
   return (
     <Card className="p-5 border-2 border-status-inactive/30 bg-gradient-to-b from-status-inactive/10 to-transparent">
       {/* Header */}
       <div className="flex items-center gap-3 mb-4">
         <div className="p-2.5 rounded-full bg-status-inactive/20 shrink-0">
           <Lock className="w-5 h-5 text-status-inactive" />
         </div>
         <div className="flex-1 min-w-0">
           <h3 className="font-semibold text-status-inactive">Vault Locked</h3>
           <p className="text-xs text-muted-foreground truncate">{recovery.lockReason}</p>
         </div>
       </div>
 
       {/* Progress Section */}
       <div className="mb-5">
         <div className="flex items-center justify-between mb-2">
           <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
             Recovery Progress
           </span>
           <span className="text-sm font-bold text-foreground">
             {recovery.tasksCompleted}/{recovery.tasksRequired}
           </span>
         </div>
         <Progress 
           value={recovery.progressPercent} 
           className="h-2.5 bg-muted"
         />
         <div className="flex items-center gap-1.5 mt-2">
           <Clock className="w-3 h-3 text-muted-foreground" />
           <span className="text-xs text-muted-foreground">
             {recovery.estimatedUnlockTime}
           </span>
         </div>
       </div>
 
       {/* Task List */}
       <div className="space-y-2 mb-4">
         {recovery.tasks.map((task) => (
           <div 
             key={task.id}
             className={cn(
               "flex items-start gap-3 p-3 rounded-lg transition-all",
               task.completed 
                 ? "bg-status-active/10 border border-status-active/20" 
                 : "bg-muted/50 border border-border"
             )}
           >
             <div className="shrink-0 mt-0.5">
               {task.completed ? (
                 <CheckCircle2 className="w-4 h-4 text-status-active" />
               ) : (
                 <Circle className="w-4 h-4 text-muted-foreground" />
               )}
             </div>
             <div className="flex-1 min-w-0">
               <p className={cn(
                 "text-sm font-medium",
                 task.completed ? "text-status-active line-through" : "text-foreground"
               )}>
                 {task.title}
               </p>
               <p className="text-xs text-muted-foreground mt-0.5">
                 {task.description}
               </p>
             </div>
           </div>
         ))}
       </div>
 
       {/* Next Action */}
       <div className="p-3 rounded-lg bg-status-warning/10 border border-status-warning/20">
         <div className="flex items-start gap-2">
           <AlertTriangle className="w-4 h-4 text-status-warning shrink-0 mt-0.5" />
           <div>
             <p className="text-xs font-medium text-status-warning uppercase tracking-wide mb-1">
               Next Step
             </p>
             <p className="text-sm text-foreground flex items-center gap-1.5">
               <ArrowRight className="w-3.5 h-3.5" />
               {recovery.nextAction}
             </p>
           </div>
         </div>
       </div>
     </Card>
   );
 }