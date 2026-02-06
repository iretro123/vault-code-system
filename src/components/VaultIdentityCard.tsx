import { cn } from "@/lib/utils";
import { useVaultIdentity } from "@/hooks/useVaultIdentity";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Lock, Star, Zap, Crown, TrendingUp } from "lucide-react";

const RANK_ICONS = {
  LOCKED: Lock,
  NOVICE: Shield,
  DEVELOPING: TrendingUp,
  CONSISTENT: Zap,
  PROVEN: Crown,
} as const;

const RANK_COLORS = {
  LOCKED: "text-rose-400",
  NOVICE: "text-amber-400",
  DEVELOPING: "text-muted-foreground",
  CONSISTENT: "text-primary",
  PROVEN: "text-emerald-400",
} as const;

interface VaultIdentityCardProps {
  className?: string;
}

export function VaultIdentityCard({ className }: VaultIdentityCardProps) {
  const identity = useVaultIdentity();

  if (identity.loading) {
    return (
      <div className={cn("vault-card p-5", className)}>
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-12 w-24 mb-2" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (identity.error) {
    return (
      <div className={cn("vault-card p-5", className)}>
        <p className="text-sm text-muted-foreground">{identity.error}</p>
      </div>
    );
  }

  const RankIcon = RANK_ICONS[identity.vaultRank] || Shield;
  const rankColor = RANK_COLORS[identity.vaultRank] || RANK_COLORS.LOCKED;

  return (
    <div className={cn("vault-card p-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RankIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Vault Identity
          </span>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          Level {identity.vaultLevel}
        </span>
      </div>

      {/* Rank Display */}
      <div className="mb-4">
        <h2 className={cn("text-2xl font-bold tracking-tight", rankColor)}>
          {identity.vaultRank}
        </h2>
        <p className="text-sm text-muted-foreground">
          "{identity.vaultTitle}"
        </p>
      </div>

      {/* Score */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-bold text-foreground font-mono">
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
        <Progress value={identity.progressPercent} className="h-2" />
      </div>

      {/* Star indicators for rank */}
      <div className="flex items-center gap-1 mt-4">
        {[1, 2, 3, 4, 5].map((star) => {
          const rankIndex = ["LOCKED", "NOVICE", "DEVELOPING", "CONSISTENT", "PROVEN"].indexOf(
            identity.vaultRank
          );
          const filled = star <= rankIndex + 1;
          return (
            <Star
              key={star}
              className={cn(
                "h-4 w-4 transition-colors",
                filled ? "text-primary fill-primary" : "text-white/20"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
