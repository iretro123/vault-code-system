 import { Card } from "@/components/ui/card";
 import { Progress } from "@/components/ui/progress";
 import { useVaultLevel } from "@/hooks/useVaultLevel";
 import { Star, TrendingUp, Zap } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { Skeleton } from "@/components/ui/skeleton";
 
 const RANK_COLORS = {
   Novice: {
     text: "text-muted-foreground",
     bg: "bg-muted",
     border: "border-muted-foreground/30",
     glow: "shadow-none",
   },
   Developing: {
     text: "text-status-warning",
     bg: "bg-status-warning",
     border: "border-status-warning/30",
     glow: "shadow-status-warning/20",
   },
   Consistent: {
     text: "text-primary",
     bg: "bg-primary",
     border: "border-primary/30",
     glow: "shadow-primary/20",
   },
   Elite: {
     text: "text-status-active",
     bg: "bg-status-active",
     border: "border-status-active/30",
     glow: "shadow-status-active/30",
   },
 } as const;
 
 export function VaultLevelCard() {
   const level = useVaultLevel();
   const rankColors = RANK_COLORS[level.rank as keyof typeof RANK_COLORS] || RANK_COLORS.Novice;
 
   if (level.loading) {
     return (
       <Card className="p-5">
         <div className="flex items-center gap-4 mb-4">
           <Skeleton className="h-14 w-14 rounded-full" />
           <div className="flex-1 space-y-2">
             <Skeleton className="h-4 w-24" />
             <Skeleton className="h-6 w-32" />
           </div>
           <Skeleton className="h-8 w-20" />
         </div>
         <Skeleton className="h-3 w-full mb-2" />
         <Skeleton className="h-3 w-48" />
       </Card>
     );
   }
 
    return (
      <Card className={cn(
        "vault-card p-5 border-2 transition-all duration-500",
        rankColors.border,
        level.rank === "Elite" && "shadow-lg " + rankColors.glow
      )}>
       {/* Header */}
       <div className="flex items-center gap-4 mb-4">
         {/* Level Badge */}
         <div className={cn(
           "relative flex items-center justify-center w-14 h-14 rounded-full border-2",
           rankColors.border,
           rankColors.bg + "/10"
         )}>
           <span className={cn("text-2xl font-bold font-mono", rankColors.text)}>
             {level.level}
           </span>
           {level.rank === "Elite" && (
             <Star className="absolute -top-1 -right-1 w-5 h-5 text-status-active fill-status-active" />
           )}
         </div>
         
         {/* Title & Rank */}
         <div className="flex-1 min-w-0">
           <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
             Vault Level
           </p>
           <p className={cn("text-lg font-bold truncate", rankColors.text)}>
             {level.title}
           </p>
         </div>
         
         {/* XP Display */}
         <div className="text-right shrink-0">
           <div className="flex items-center gap-1">
             <Zap className="w-4 h-4 text-status-warning" />
             <span className="text-lg font-bold font-mono text-foreground">
               {level.xp.toLocaleString()}
             </span>
           </div>
           <p className="text-xs text-muted-foreground">XP</p>
         </div>
       </div>
 
       {/* Progress Bar */}
       <div className="space-y-2">
         <Progress 
           value={level.progressPercent} 
           className="h-2.5 bg-muted"
         />
         <div className="flex items-center justify-between text-xs">
           <span className="text-muted-foreground">
             {level.xpToNextLevel.toLocaleString()} XP to next level
           </span>
           <div className="flex items-center gap-1 text-muted-foreground">
             <TrendingUp className="w-3 h-3" />
             <span className={rankColors.text}>{level.nextTitle}</span>
           </div>
         </div>
       </div>
     </Card>
   );
 }