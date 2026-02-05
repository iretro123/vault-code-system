 import { useVaultFeedback, FeedbackType } from "@/hooks/useVaultFeedback";
 import { Card } from "@/components/ui/card";
 import { Skeleton } from "@/components/ui/skeleton";
 import { cn } from "@/lib/utils";
 import { 
   AlertOctagon, 
   AlertTriangle, 
   CheckCircle2, 
   Info,
   Lightbulb,
   MessageSquare
 } from "lucide-react";
 
 // Feedback type configuration
 const FEEDBACK_CONFIG: Record<FeedbackType, {
   icon: React.ElementType;
   color: string;
   bgColor: string;
   borderColor: string;
   label: string;
 }> = {
   critical: {
     icon: AlertOctagon,
     color: "text-status-inactive",
     bgColor: "bg-status-inactive/10",
     borderColor: "border-status-inactive/30",
     label: "Critical",
   },
   warning: {
     icon: AlertTriangle,
     color: "text-status-warning",
     bgColor: "bg-status-warning/10",
     borderColor: "border-status-warning/30",
     label: "Warning",
   },
   positive: {
     icon: CheckCircle2,
     color: "text-status-active",
     bgColor: "bg-status-active/10",
     borderColor: "border-status-active/30",
     label: "Positive",
   },
   neutral: {
     icon: Info,
     color: "text-muted-foreground",
     bgColor: "bg-muted/50",
     borderColor: "border-border",
     label: "Info",
   },
 };
 
 function FeedbackSkeleton() {
   return (
     <Card className="p-4 border">
       <div className="flex gap-3">
         <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
         <div className="flex-1 space-y-2">
           <Skeleton className="h-4 w-20" />
           <Skeleton className="h-4 w-full" />
           <Skeleton className="h-3 w-3/4" />
         </div>
       </div>
     </Card>
   );
 }
 
 export function VaultFeedbackCard() {
   const feedback = useVaultFeedback();
 
   if (feedback.loading) {
     return <FeedbackSkeleton />;
   }
 
   if (feedback.error) {
     return null; // Silent fail - don't show broken feedback
   }
 
   const config = FEEDBACK_CONFIG[feedback.type];
   const Icon = config.icon;
 
   return (
     <Card className={cn(
       "p-4 border-2 transition-all duration-500",
       config.borderColor,
       config.bgColor
     )}>
       <div className="flex gap-3">
         {/* Icon */}
         <div className={cn(
           "p-2.5 rounded-lg shrink-0 h-fit",
           config.bgColor
         )}>
           <Icon className={cn("w-5 h-5", config.color)} />
         </div>
 
         {/* Content */}
         <div className="flex-1 min-w-0">
           {/* Header */}
           <div className="flex items-center gap-2 mb-1">
             <MessageSquare className="w-3 h-3 text-muted-foreground" />
             <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
               Vault Feedback
             </span>
             <span className={cn(
               "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
               config.bgColor,
               config.color
             )}>
               {config.label}
             </span>
           </div>
 
           {/* Message */}
           <p className={cn("text-sm font-medium mb-2", config.color)}>
             {feedback.message}
           </p>
 
           {/* Recommended Action */}
           {feedback.action && (
             <div className="flex items-start gap-2 pt-2 border-t border-border/50">
               <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
               <p className="text-xs text-muted-foreground">
                 <span className="font-medium text-foreground">Action: </span>
                 {feedback.action}
               </p>
             </div>
           )}
         </div>
       </div>
     </Card>
   );
 }