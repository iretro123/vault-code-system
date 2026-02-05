 import { Card } from "@/components/ui/card";
 import { useVaultMistakeAnalysis, MistakeAnalysis } from "@/hooks/useVaultMistakeAnalysis";
 import { AlertTriangle, AlertCircle, Info, CheckCircle2, TrendingDown, Brain, Clock, Crosshair, Flame } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { Skeleton } from "@/components/ui/skeleton";
 
 const SEVERITY_CONFIG = {
   critical: {
     color: "text-status-inactive",
     bgColor: "bg-status-inactive/10",
     borderColor: "border-status-inactive/30",
     icon: AlertTriangle,
     label: "CRITICAL",
   },
   high: {
     color: "text-status-warning",
     bgColor: "bg-status-warning/10",
     borderColor: "border-status-warning/30",
     icon: AlertCircle,
     label: "HIGH",
   },
   medium: {
     color: "text-primary",
     bgColor: "bg-primary/10",
     borderColor: "border-primary/30",
     icon: Info,
     label: "MEDIUM",
   },
   low: {
     color: "text-muted-foreground",
     bgColor: "bg-muted",
     borderColor: "border-border",
     icon: CheckCircle2,
     label: "LOW",
   },
 } as const;
 
 const MISTAKE_ICONS: Record<string, React.ElementType> = {
   violation_rate: AlertTriangle,
   emotional_instability: Brain,
   overtrading: Clock,
   high_risk_trading: TrendingDown,
   revenge_trading: Flame,
   no_rules: AlertCircle,
   no_data: Info,
   clean_record: CheckCircle2,
 };
 
 function MistakeItem({ mistake }: { mistake: MistakeAnalysis }) {
   const config = SEVERITY_CONFIG[mistake.severity];
   const Icon = MISTAKE_ICONS[mistake.mistakeType] || AlertCircle;
 
   return (
     <div className={cn(
       "p-4 rounded-lg border-2 transition-all",
       config.bgColor,
       config.borderColor
     )}>
       {/* Header */}
       <div className="flex items-start gap-3 mb-3">
         <div className={cn("p-2 rounded-full shrink-0", config.bgColor)}>
           <Icon className={cn("w-4 h-4", config.color)} />
         </div>
         <div className="flex-1 min-w-0">
           <div className="flex items-center gap-2 mb-1">
             <span className={cn(
               "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
               config.bgColor,
               config.color
             )}>
               {config.label}
             </span>
             <span className="text-xs text-muted-foreground">
               Impact: {mistake.impactScore}%
             </span>
           </div>
           <p className={cn("text-sm font-medium", config.color)}>
             {mistake.description}
           </p>
         </div>
       </div>
 
       {/* Recommended Fix */}
       <div className="pl-11">
         <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">
           Recommended Action
         </p>
         <p className="text-sm text-foreground">
           {mistake.recommendedFix}
         </p>
       </div>
     </div>
   );
 }
 
 export function VaultMistakeCard() {
   const { mistakes, loading } = useVaultMistakeAnalysis();
 
   if (loading) {
     return (
       <Card className="p-5">
         <div className="flex items-center gap-2 mb-4">
           <Skeleton className="h-5 w-5 rounded" />
           <Skeleton className="h-4 w-40" />
         </div>
         <div className="space-y-3">
           <Skeleton className="h-28 w-full" />
           <Skeleton className="h-28 w-full" />
           <Skeleton className="h-28 w-full" />
         </div>
       </Card>
     );
   }
 
   // Get top 3 mistakes
   const topMistakes = mistakes.slice(0, 3);
   
   // Check if clean record or no data
   const isClean = topMistakes.length === 1 && 
     (topMistakes[0].mistakeType === "clean_record" || topMistakes[0].mistakeType === "no_data");
 
   if (isClean) {
     return (
       <Card className="p-5 border-2 border-status-active/20 bg-status-active/5">
         <div className="flex items-center gap-3 mb-3">
           <div className="p-2 rounded-full bg-status-active/20">
             <CheckCircle2 className="w-5 h-5 text-status-active" />
           </div>
           <div>
             <h3 className="font-semibold text-status-active">No Mistakes Detected</h3>
             <p className="text-xs text-muted-foreground">
               {topMistakes[0].description}
             </p>
           </div>
         </div>
         <p className="text-sm text-muted-foreground pl-12">
           {topMistakes[0].recommendedFix}
         </p>
       </Card>
     );
   }
 
   return (
     <Card className="p-5">
       {/* Header */}
       <div className="flex items-center gap-2 mb-4">
         <Crosshair className="w-5 h-5 text-primary" />
         <h3 className="font-semibold">Mistake Analysis</h3>
         <span className="text-xs text-muted-foreground ml-auto">Last 30 days</span>
       </div>
 
       {/* Mistake List */}
       <div className="space-y-3">
         {topMistakes.map((mistake, index) => (
           <MistakeItem key={`${mistake.mistakeType}-${index}`} mistake={mistake} />
         ))}
       </div>
 
       {mistakes.length > 3 && (
         <p className="text-xs text-muted-foreground text-center mt-4">
           +{mistakes.length - 3} more patterns detected
         </p>
       )}
     </Card>
   );
 }