 import { Card } from "@/components/ui/card";
 import { Progress } from "@/components/ui/progress";
 import { useVaultConsistencyStatus, TrendDirection, ConsistencyLevel } from "@/hooks/useVaultConsistencyStatus";
 import { cn } from "@/lib/utils";
 import { 
   TrendingUp, 
   TrendingDown, 
   Minus, 
   AlertTriangle,
   Activity,
   Brain,
   Gauge,
   ShieldAlert
 } from "lucide-react";
 
 function getTrendIcon(direction: TrendDirection) {
   switch (direction) {
     case "IMPROVING":
       return <TrendingUp className="w-4 h-4 text-status-active" />;
     case "DECLINING":
       return <TrendingDown className="w-4 h-4 text-status-warning" />;
     case "COLLAPSING":
       return <TrendingDown className="w-4 h-4 text-destructive" />;
     default:
       return <Minus className="w-4 h-4 text-muted-foreground" />;
   }
 }
 
 function getTrendColor(direction: TrendDirection) {
   switch (direction) {
     case "IMPROVING":
       return "text-status-active";
     case "DECLINING":
       return "text-status-warning";
     case "COLLAPSING":
       return "text-destructive";
     default:
       return "text-muted-foreground";
   }
 }
 
 function getLevelColor(level: ConsistencyLevel) {
   switch (level) {
     case "EXCELLENT":
       return "bg-status-active/15 text-status-active border-status-active/30";
     case "GOOD":
       return "bg-primary/15 text-primary border-primary/30";
     case "DEVELOPING":
       return "bg-status-warning/15 text-status-warning border-status-warning/30";
     case "UNSTABLE":
       return "bg-orange-500/15 text-orange-500 border-orange-500/30";
     case "CRITICAL":
       return "bg-destructive/15 text-destructive border-destructive/30";
     default:
       return "bg-muted text-muted-foreground border-border";
   }
 }
 
 function getProgressColor(score: number) {
   if (score >= 80) return "bg-status-active";
   if (score >= 65) return "bg-primary";
   if (score >= 50) return "bg-status-warning";
   if (score >= 35) return "bg-orange-500";
   return "bg-destructive";
 }
 
 export function VaultConsistencyCard() {
   const consistency = useVaultConsistencyStatus();
 
   if (consistency.loading) {
     return (
       <Card className="p-4 border-border/50 animate-pulse">
         <div className="flex items-center gap-3">
           <Activity className="w-5 h-5 text-muted-foreground" />
           <span className="text-sm text-muted-foreground">Loading consistency data...</span>
         </div>
       </Card>
     );
   }
 
   if (consistency.error) {
     return (
       <Card className="p-4 border-destructive/30 bg-destructive/5">
         <div className="flex items-center gap-3">
           <AlertTriangle className="w-5 h-5 text-destructive" />
           <span className="text-sm text-destructive">{consistency.error}</span>
         </div>
       </Card>
     );
   }
 
   const progressColorClass = getProgressColor(consistency.consistencyScore);
 
   return (
     <Card className="p-4 border-border/50">
       {/* Header */}
       <div className="flex items-center justify-between mb-4">
         <div className="flex items-center gap-2">
           <Activity className="w-5 h-5 text-primary" />
           <h3 className="font-semibold">Consistency Engine</h3>
         </div>
         <span className={cn(
           "px-2 py-1 text-xs font-medium rounded-full border",
           getLevelColor(consistency.consistencyLevel)
         )}>
           {consistency.consistencyLevel}
         </span>
       </div>
 
       {/* Consistency Score */}
       <div className="mb-4">
         <div className="flex items-center justify-between mb-2">
           <span className="text-sm text-muted-foreground">Consistency Score</span>
           <div className="flex items-center gap-2">
             {getTrendIcon(consistency.trendDirection)}
             <span className={cn("text-sm font-medium", getTrendColor(consistency.trendDirection))}>
               {consistency.trendDirection}
             </span>
           </div>
         </div>
         <div className="flex items-center gap-3">
           <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
             <div 
               className={cn("h-full transition-all duration-500", progressColorClass)}
               style={{ width: `${consistency.consistencyScore}%` }}
             />
           </div>
           <span className="text-xl font-semibold font-mono w-12 text-right">
             {consistency.consistencyScore}
           </span>
         </div>
       </div>
 
       {/* Intervention Warning */}
       {consistency.interventionRequired && (
         <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
           <div className="flex items-center gap-2 text-destructive">
             <ShieldAlert className="w-4 h-4" />
             <span className="text-sm font-medium">Intervention Required</span>
           </div>
           <p className="text-xs text-muted-foreground mt-1">
             Consistency has deteriorated to critical levels. Trading is restricted until recovery.
           </p>
         </div>
       )}
 
       {/* Risk Modifier */}
       {consistency.recommendedRiskModifier < 1.0 && (
         <div className={cn(
           "mb-4 p-3 rounded-lg border",
           consistency.recommendedRiskModifier <= 0.25 
             ? "border-destructive/30 bg-destructive/5" 
             : consistency.recommendedRiskModifier <= 0.5 
               ? "border-orange-500/30 bg-orange-500/5"
               : "border-amber-500/30 bg-amber-500/5"
         )}>
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <Gauge className="w-4 h-4 text-muted-foreground" />
               <span className="text-sm">Risk Modifier Active</span>
             </div>
             <span className={cn(
               "text-sm font-semibold",
               consistency.recommendedRiskModifier <= 0.25 
                 ? "text-destructive" 
                 : consistency.recommendedRiskModifier <= 0.5 
                   ? "text-orange-500"
                   : "text-amber-500"
             )}>
               {Math.round(consistency.recommendedRiskModifier * 100)}%
             </span>
           </div>
         </div>
       )}
 
       {/* Metrics Grid */}
       <div className="grid grid-cols-2 gap-3">
         <div className="p-3 rounded-lg bg-muted/30">
           <div className="flex items-center gap-2 mb-1">
             <Brain className="w-3.5 h-3.5 text-muted-foreground" />
             <span className="text-xs text-muted-foreground">Emotional Stability</span>
           </div>
           <p className="text-lg font-semibold font-mono">
             {consistency.emotionalStability.toFixed(0)}%
           </p>
         </div>
 
         <div className="p-3 rounded-lg bg-muted/30">
           <div className="flex items-center gap-2 mb-1">
             <Activity className="w-3.5 h-3.5 text-muted-foreground" />
             <span className="text-xs text-muted-foreground">Discipline Velocity</span>
           </div>
           <p className={cn(
             "text-lg font-semibold font-mono",
             consistency.disciplineVelocity > 0 
               ? "text-status-active" 
               : consistency.disciplineVelocity < 0 
                 ? "text-destructive" 
                 : "text-foreground"
           )}>
             {consistency.disciplineVelocity > 0 ? "+" : ""}
             {consistency.disciplineVelocity.toFixed(2)}/day
           </p>
         </div>
 
         <div className="p-3 rounded-lg bg-muted/30">
           <div className="flex items-center gap-2 mb-1">
             <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
             <span className="text-xs text-muted-foreground">Risk Velocity</span>
           </div>
           <p className={cn(
             "text-lg font-semibold font-mono",
             consistency.riskVelocity < 0 
               ? "text-status-active" 
               : consistency.riskVelocity > 0 
                 ? "text-status-warning" 
                 : "text-foreground"
           )}>
             {consistency.riskVelocity > 0 ? "+" : ""}
             {consistency.riskVelocity.toFixed(2)}%
           </p>
         </div>
 
         <div className="p-3 rounded-lg bg-muted/30">
           <div className="flex items-center gap-2 mb-1">
             <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
             <span className="text-xs text-muted-foreground">Violation Trend</span>
           </div>
           <p className={cn(
             "text-lg font-semibold font-mono",
             consistency.violationTrend > 0 
               ? "text-status-active" 
               : consistency.violationTrend < 0 
                 ? "text-destructive" 
                 : "text-foreground"
           )}>
             {consistency.violationTrend > 0 ? "↓" : consistency.violationTrend < 0 ? "↑" : "—"}
             {Math.abs(consistency.violationTrend).toFixed(0)}
           </p>
         </div>
       </div>
     </Card>
   );
 }