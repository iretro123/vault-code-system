 import { cn } from "@/lib/utils";
 import { useVaultIdentity } from "@/hooks/useVaultIdentity";
 import { Progress } from "@/components/ui/progress";
 import { Skeleton } from "@/components/ui/skeleton";
 import { Shield, Lock, Star, Zap, Crown, TrendingUp } from "lucide-react";
 
 const RANK_ICONS = {
   LOCKED: Lock,
   NOVICE: Shield,
   DEVELOPING: TrendingUp,
   STRONG: Zap,
   ELITE: Crown,
 } as const;
 
 const RANK_STYLES = {
   LOCKED: "from-destructive/20 to-destructive/5 border-destructive/30",
   NOVICE: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
   DEVELOPING: "from-muted/30 to-muted/10 border-muted-foreground/30",
   STRONG: "from-primary/20 to-primary/5 border-primary/30",
   ELITE: "from-accent/20 to-accent/5 border-accent/30",
 } as const;
 
 const PROGRESS_STYLES = {
   LOCKED: "bg-destructive",
   NOVICE: "bg-amber-500",
   DEVELOPING: "bg-muted-foreground",
   STRONG: "bg-primary",
   ELITE: "bg-accent",
 } as const;
 
 interface VaultIdentityCardProps {
   className?: string;
 }
 
 export function VaultIdentityCard({ className }: VaultIdentityCardProps) {
   const identity = useVaultIdentity();
 
   if (identity.loading) {
     return (
       <div className={cn("metric-card", className)}>
         <Skeleton className="h-6 w-32 mb-4" />
         <Skeleton className="h-12 w-24 mb-2" />
         <Skeleton className="h-4 w-full" />
       </div>
     );
   }
 
   if (identity.error) {
     return (
       <div className={cn("metric-card", className)}>
         <p className="text-sm text-muted-foreground">{identity.error}</p>
       </div>
     );
   }
 
   const RankIcon = RANK_ICONS[identity.vaultRank] || Shield;
   const rankStyle = RANK_STYLES[identity.vaultRank] || RANK_STYLES.LOCKED;
   const progressStyle = PROGRESS_STYLES[identity.vaultRank] || PROGRESS_STYLES.LOCKED;
 
   return (
     <div
       className={cn(
         "relative overflow-hidden rounded-xl border p-6 bg-gradient-to-br animate-slide-up",
         rankStyle,
         className
       )}
     >
       {/* Background glow effect */}
       <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-current to-transparent opacity-10 blur-2xl" />
       
       <div className="relative z-10">
         {/* Header */}
         <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-2">
             <RankIcon className="h-5 w-5 text-foreground/80" />
             <span className="section-title">VAULT IDENTITY</span>
           </div>
           <span className="text-xs font-medium text-muted-foreground">
             Level {identity.vaultLevel}
           </span>
         </div>
 
         {/* Rank Display */}
         <div className="mb-4">
           <h2 className="text-3xl font-bold tracking-tight text-foreground">
             {identity.vaultRank}
           </h2>
           <p className="text-lg text-muted-foreground font-medium">
             "{identity.vaultTitle}"
           </p>
         </div>
 
         {/* Score */}
         <div className="flex items-baseline gap-2 mb-4">
           <span className="text-4xl font-bold text-foreground">
             {identity.vaultScore}
           </span>
           <span className="text-sm text-muted-foreground">/ 100</span>
         </div>
 
         {/* Progress to next rank */}
         <div className="space-y-2">
           <div className="flex items-center justify-between text-xs">
             <span className="text-muted-foreground">Progress to {identity.nextRank}</span>
             <span className="font-medium text-foreground">
               {Math.round(identity.progressPercent)}%
             </span>
           </div>
           <div className="relative h-2 w-full overflow-hidden rounded-full bg-background/50">
             <div
               className={cn("h-full transition-all duration-500 rounded-full", progressStyle)}
               style={{ width: `${identity.progressPercent}%` }}
             />
           </div>
         </div>
 
         {/* Star indicators for rank */}
         <div className="flex items-center gap-1 mt-4">
           {[1, 2, 3, 4, 5].map((star) => {
             const rankIndex = ["LOCKED", "NOVICE", "DEVELOPING", "STRONG", "ELITE"].indexOf(
               identity.vaultRank
             );
             const filled = star <= rankIndex + 1;
             return (
               <Star
                 key={star}
                 className={cn(
                   "h-4 w-4 transition-colors",
                   filled ? "text-foreground fill-foreground" : "text-muted-foreground/30"
                 )}
               />
             );
           })}
         </div>
       </div>
     </div>
   );
 }