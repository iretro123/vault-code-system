 import { useVaultScore, VaultTier, VaultTrend } from "@/hooks/useVaultScore";
 import { Card } from "@/components/ui/card";
 import { Skeleton } from "@/components/ui/skeleton";
 import { cn } from "@/lib/utils";
 import { 
   TrendingUp, 
   TrendingDown, 
   Minus, 
   Shield,
   Crown,
   Zap,
   Target,
   AlertTriangle,
   Lock
 } from "lucide-react";
 
 // Tier configuration
 const TIER_CONFIG: Record<VaultTier, {
   label: string;
   icon: React.ElementType;
   color: string;
   bgColor: string;
   borderColor: string;
   message: string;
 }> = {
   ELITE: {
     label: "ELITE",
     icon: Crown,
     color: "text-status-active",
     bgColor: "bg-status-active/10",
     borderColor: "border-status-active/30",
     message: "Peak performance. Trading with precision and discipline.",
   },
   STRONG: {
     label: "STRONG",
     icon: Zap,
     color: "text-primary",
     bgColor: "bg-primary/10",
     borderColor: "border-primary/30",
     message: "Solid execution. Stay focused to reach Elite.",
   },
   DEVELOPING: {
     label: "DEVELOPING",
     icon: Target,
     color: "text-status-warning",
     bgColor: "bg-status-warning/10",
     borderColor: "border-status-warning/30",
     message: "Building consistency. Maintain discipline to improve.",
   },
   DANGEROUS: {
     label: "DANGEROUS",
     icon: AlertTriangle,
     color: "text-destructive",
     bgColor: "bg-destructive/10",
     borderColor: "border-destructive/30",
     message: "Warning zone. Review rules and reduce risk exposure.",
   },
   LOCKED: {
     label: "LOCKED",
     icon: Lock,
     color: "text-status-inactive",
     bgColor: "bg-status-inactive/10",
     borderColor: "border-status-inactive/30",
     message: "Trading suspended. Rebuild discipline before proceeding.",
   },
 };
 
 const TREND_CONFIG: Record<VaultTrend, {
   icon: React.ElementType;
   label: string;
   color: string;
 }> = {
   improving: {
     icon: TrendingUp,
     label: "Improving",
     color: "text-status-active",
   },
   stable: {
     icon: Minus,
     label: "Stable",
     color: "text-muted-foreground",
   },
   declining: {
     icon: TrendingDown,
     label: "Declining",
     color: "text-status-inactive",
   },
 };
 
 function ScoreSkeleton() {
   return (
     <Card className="p-6 border-2">
       <div className="flex items-center justify-between mb-4">
         <Skeleton className="h-6 w-32" />
         <Skeleton className="h-6 w-20" />
       </div>
       <div className="flex items-center justify-center mb-4">
         <Skeleton className="h-24 w-32" />
       </div>
       <Skeleton className="h-3 w-full mb-4" />
       <Skeleton className="h-4 w-48 mx-auto" />
     </Card>
   );
 }
 
 export function VaultScoreCard() {
   const vaultScore = useVaultScore();
   
   if (vaultScore.loading) {
     return <ScoreSkeleton />;
   }
 
   if (vaultScore.error) {
     return (
       <Card className="p-6 border-2 border-destructive/30">
         <div className="text-center">
           <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
           <p className="text-sm text-destructive">{vaultScore.error}</p>
         </div>
       </Card>
     );
   }
 
   const tierConfig = TIER_CONFIG[vaultScore.tier];
   const trendConfig = TREND_CONFIG[vaultScore.trend];
   const TierIcon = tierConfig.icon;
   const TrendIcon = trendConfig.icon;
 
   // Calculate score color based on value
   const getScoreColor = () => {
     if (vaultScore.score >= 85) return "text-status-active";
     if (vaultScore.score >= 70) return "text-primary";
     if (vaultScore.score >= 50) return "text-status-warning";
     if (vaultScore.score >= 30) return "text-destructive";
     return "text-status-inactive";
   };
 
   return (
     <Card className={cn(
       "p-6 border-2 transition-all duration-500 relative overflow-hidden",
       tierConfig.borderColor,
       tierConfig.bgColor
     )}>
       {/* Live indicator */}
       <div className="absolute top-3 right-3 flex items-center gap-1.5">
         <span className="relative flex h-2 w-2">
           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
           <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
         </span>
         <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Live</span>
       </div>
 
       {/* Header */}
       <div className="flex items-center gap-2 mb-4">
         <Shield className="w-5 h-5 text-primary" />
         <h2 className="text-sm font-bold uppercase tracking-widest">Vault Score</h2>
       </div>
 
       {/* Tier Badge */}
       <div className="flex justify-center mb-2">
         <div className={cn(
           "inline-flex items-center gap-2 px-4 py-1.5 rounded-full",
           tierConfig.bgColor,
           tierConfig.color
         )}>
           <TierIcon className="w-4 h-4" />
           <span className="text-sm font-bold uppercase tracking-widest">
             {tierConfig.label}
           </span>
         </div>
       </div>
 
       {/* Score Display */}
       <div className="text-center mb-4">
         <div className="relative inline-flex items-baseline justify-center">
           <span className={cn(
             "text-7xl font-bold font-mono tracking-tight transition-all duration-500",
             getScoreColor()
           )}>
             {vaultScore.score}
           </span>
           <span className="text-2xl text-muted-foreground font-light ml-1">/100</span>
         </div>
       </div>
 
       {/* Progress Bar */}
       <div className="h-3 bg-muted rounded-full overflow-hidden mb-4 relative">
         <div
           className={cn(
             "h-full rounded-full transition-all duration-700 ease-out",
             vaultScore.score >= 85 ? "bg-status-active" :
             vaultScore.score >= 70 ? "bg-primary" :
             vaultScore.score >= 50 ? "bg-status-warning" :
             vaultScore.score >= 30 ? "bg-destructive" : "bg-status-inactive"
           )}
           style={{ width: `${vaultScore.score}%` }}
         />
         {/* Tier markers */}
         <div className="absolute inset-0 flex">
           <div className="w-[30%] border-r border-background/50" />
           <div className="w-[20%] border-r border-background/50" />
           <div className="w-[20%] border-r border-background/50" />
           <div className="w-[15%] border-r border-background/50" />
           <div className="w-[15%]" />
         </div>
       </div>
 
       {/* Tier Scale Labels */}
       <div className="flex text-[9px] text-muted-foreground uppercase tracking-wider mb-4 -mx-1">
         <div className="w-[30%] text-center">Locked</div>
         <div className="w-[20%] text-center">Danger</div>
         <div className="w-[20%] text-center">Dev</div>
         <div className="w-[15%] text-center">Strong</div>
         <div className="w-[15%] text-center">Elite</div>
       </div>
 
       {/* Trend Indicator */}
       <div className="flex items-center justify-center gap-2 mb-4">
         <TrendIcon className={cn("w-4 h-4", trendConfig.color)} />
         <span className={cn("text-sm font-medium", trendConfig.color)}>
           {trendConfig.label}
         </span>
         <span className="text-xs text-muted-foreground">(7-day trend)</span>
       </div>
 
       {/* Feedback Message */}
       <p className="text-center text-sm text-muted-foreground">
         {tierConfig.message}
       </p>
 
       {/* Component Breakdown (collapsed by default, could expand) */}
       <div className="mt-4 pt-4 border-t border-border/50">
         <div className="grid grid-cols-5 gap-1 text-center">
           <div>
             <p className="text-[10px] text-muted-foreground uppercase">Disc</p>
             <p className="text-xs font-mono font-medium">{vaultScore.components.discipline.toFixed(0)}</p>
           </div>
           <div>
             <p className="text-[10px] text-muted-foreground uppercase">Adh</p>
             <p className="text-xs font-mono font-medium">{vaultScore.components.adherence.toFixed(0)}</p>
           </div>
           <div>
             <p className="text-[10px] text-muted-foreground uppercase">Viol</p>
             <p className="text-xs font-mono font-medium">{vaultScore.components.violation.toFixed(0)}</p>
           </div>
           <div>
             <p className="text-[10px] text-muted-foreground uppercase">Risk</p>
             <p className="text-xs font-mono font-medium">{vaultScore.components.risk.toFixed(0)}</p>
           </div>
           <div>
             <p className="text-[10px] text-muted-foreground uppercase">Emot</p>
             <p className="text-xs font-mono font-medium">{vaultScore.components.emotion.toFixed(0)}</p>
           </div>
         </div>
       </div>
     </Card>
   );
 }