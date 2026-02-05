 import { useState, useEffect } from "react";
 import { cn } from "@/lib/utils";
 import { useVaultProtectionStatus, ProtectionLevel } from "@/hooks/useVaultProtectionStatus";
 import { Card } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Progress } from "@/components/ui/progress";
 import { Skeleton } from "@/components/ui/skeleton";
 import { 
   Shield, 
   ShieldAlert, 
   ShieldOff, 
   Lock,
   AlertTriangle,
   Brain,
   Flame,
   TrendingDown,
   BarChart3,
   Timer,
   CheckCircle2
 } from "lucide-react";
 
 const LEVEL_CONFIG: Record<ProtectionLevel, {
   icon: typeof Shield;
   color: string;
   bgColor: string;
   borderColor: string;
   label: string;
 }> = {
   NONE: {
     icon: CheckCircle2,
     color: "text-primary",
     bgColor: "bg-primary/10",
     borderColor: "border-primary/30",
     label: "All Clear",
   },
   CAUTION: {
     icon: ShieldAlert,
     color: "text-amber-500",
     bgColor: "bg-amber-500/10",
     borderColor: "border-amber-500/30",
     label: "Caution",
   },
   RESTRICTED: {
     icon: ShieldOff,
     color: "text-orange-500",
     bgColor: "bg-orange-500/10",
     borderColor: "border-orange-500/30",
     label: "Restricted",
   },
   LOCKDOWN: {
     icon: Lock,
     color: "text-destructive",
     bgColor: "bg-destructive/10",
     borderColor: "border-destructive/30",
     label: "Lockdown",
   },
 };
 
 const RECOMMENDED_ACTIONS: Record<ProtectionLevel, string> = {
   NONE: "Continue trading with discipline. Monitor your emotional state.",
   CAUTION: "Reduce position sizes to 75% of normal. Take extra time before each trade.",
   RESTRICTED: "Trade only high-conviction setups. Wait 30 minutes between trades.",
   LOCKDOWN: "Stop trading immediately. Take 24 hours to reset your mental state.",
 };
 
 interface VaultProtectionCardProps {
   className?: string;
   compact?: boolean;
 }
 
 export function VaultProtectionCard({ className, compact = false }: VaultProtectionCardProps) {
   const protection = useVaultProtectionStatus();
   const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
 
   // Cooldown timer
   useEffect(() => {
     if (protection.tradeCooldownMinutes > 0) {
       setCooldownRemaining(protection.tradeCooldownMinutes * 60);
       
       const interval = setInterval(() => {
         setCooldownRemaining((prev) => {
           if (prev <= 1) {
             clearInterval(interval);
             protection.refetch();
             return 0;
           }
           return prev - 1;
         });
       }, 1000);
 
       return () => clearInterval(interval);
     }
   }, [protection.tradeCooldownMinutes]);
 
   const formatCooldown = (seconds: number) => {
     const hours = Math.floor(seconds / 3600);
     const minutes = Math.floor((seconds % 3600) / 60);
     const secs = seconds % 60;
     if (hours > 0) {
       return `${hours}h ${minutes}m`;
     }
     return `${minutes}m ${secs}s`;
   };
 
   if (protection.loading) {
     return (
       <Card className={cn("p-4", className)}>
         <Skeleton className="h-6 w-32 mb-3" />
         <Skeleton className="h-10 w-full mb-2" />
         <Skeleton className="h-4 w-3/4" />
       </Card>
     );
   }
 
   if (protection.error) {
     return (
       <Card className={cn("p-4", className)}>
         <p className="text-sm text-muted-foreground">{protection.error}</p>
       </Card>
     );
   }
 
   const config = LEVEL_CONFIG[protection.protectionLevel];
   const LevelIcon = config.icon;
 
   // Compact mode for inline display
   if (compact) {
     if (!protection.protectionActive) return null;
     
     return (
       <div className={cn(
         "flex items-center gap-2 px-3 py-2 rounded-lg border",
         config.bgColor,
         config.borderColor,
         className
       )}>
         <LevelIcon className={cn("h-4 w-4", config.color)} />
         <span className={cn("text-sm font-medium", config.color)}>
           {config.label}
         </span>
         {protection.riskRestrictionFactor < 1 && (
           <span className="text-xs text-muted-foreground">
             ({Math.round(protection.riskRestrictionFactor * 100)}% risk)
           </span>
         )}
       </div>
     );
   }
 
   return (
     <Card className={cn(
       "overflow-hidden border animate-slide-up",
       config.borderColor,
       className
     )}>
       {/* Header */}
       <div className={cn("px-4 py-3 flex items-center justify-between", config.bgColor)}>
         <div className="flex items-center gap-2">
           <LevelIcon className={cn("h-5 w-5", config.color)} />
           <span className="font-semibold">Protection Mode</span>
         </div>
         <Badge 
           variant="outline" 
           className={cn("font-mono", config.color, config.borderColor)}
         >
           {protection.protectionLevel}
         </Badge>
       </div>
 
       <div className="p-4 space-y-4">
         {/* Risk Restriction */}
         <div>
           <div className="flex items-center justify-between mb-2">
             <span className="text-sm text-muted-foreground">Risk Restriction</span>
             <span className={cn("font-mono font-semibold", config.color)}>
               {Math.round(protection.riskRestrictionFactor * 100)}%
             </span>
           </div>
           <Progress 
             value={protection.riskRestrictionFactor * 100} 
             className="h-2"
           />
         </div>
 
         {/* Cooldown Timer */}
         {cooldownRemaining > 0 && (
           <div className={cn(
             "flex items-center gap-3 p-3 rounded-lg",
             config.bgColor
           )}>
             <Timer className={cn("h-5 w-5", config.color)} />
             <div className="flex-1">
               <p className="text-sm font-medium">Trade Cooldown Active</p>
               <p className="text-xs text-muted-foreground">
                 Wait before next trade
               </p>
             </div>
             <span className={cn("font-mono text-lg font-bold", config.color)}>
               {formatCooldown(cooldownRemaining)}
             </span>
           </div>
         )}
 
         {/* Risk Indicators */}
         {protection.protectionActive && (
           <div className="space-y-2">
             <p className="text-xs text-muted-foreground uppercase tracking-wide">
               Detected Risks
             </p>
             <div className="flex flex-wrap gap-2">
               {protection.revengeTradingRisk && (
                 <Badge variant="outline" className="border-destructive/30 text-destructive">
                   <Flame className="h-3 w-3 mr-1" />
                   Revenge Trading
                 </Badge>
               )}
               {protection.emotionalRisk && (
                 <Badge variant="outline" className="border-amber-500/30 text-amber-500">
                   <Brain className="h-3 w-3 mr-1" />
                   Emotional Instability
                 </Badge>
               )}
               {protection.overtradingRisk && (
                 <Badge variant="outline" className="border-orange-500/30 text-orange-500">
                   <BarChart3 className="h-3 w-3 mr-1" />
                   Overtrading
                 </Badge>
               )}
               {protection.disciplineDeteriorationRisk && (
                 <Badge variant="outline" className="border-red-500/30 text-red-500">
                   <TrendingDown className="h-3 w-3 mr-1" />
                   Discipline Drop
                 </Badge>
               )}
             </div>
           </div>
         )}
 
         {/* Protection Reason */}
         {protection.protectionActive && (
           <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
             <div className="flex items-start gap-2">
               <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
               <p className="text-sm text-muted-foreground">
                 {protection.protectionReason}
               </p>
             </div>
           </div>
         )}
 
         {/* Recommended Action */}
         <div className="pt-2 border-t border-border/50">
           <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
             Recommended Action
           </p>
           <p className="text-sm font-medium">
             {RECOMMENDED_ACTIONS[protection.protectionLevel]}
           </p>
         </div>
       </div>
     </Card>
   );
 }