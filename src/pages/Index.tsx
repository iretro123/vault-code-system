 import { Link } from "react-router-dom";
 import { AppLayout } from "@/components/layout/AppLayout";
 import { PageHeader } from "@/components/layout/PageHeader";
 import { StatusBadge } from "@/components/ui/StatusBadge";
 import { Button } from "@/components/ui/button";
import { Shield, ChevronRight, CheckCircle2, LogIn, Loader2, Lock, AlertTriangle, Flame, TrendingUp, XCircle, Crosshair } from "lucide-react";
 import { useAuth } from "@/hooks/useAuth";
 import { useVaultStatus, VaultStatus } from "@/hooks/useVaultStatus";
 import { Card } from "@/components/ui/card";
 import { cn } from "@/lib/utils";
import { useState } from "react";
import { PreTradeCheckModal } from "@/components/PreTradeCheckModal";
import { useEffect } from "react";
import { VaultTimeline } from "@/components/VaultTimeline";
 
// Rank configuration
const RANKS = [
  { name: "Undisciplined", min: 0, max: 39, color: "text-status-inactive", bgColor: "bg-status-inactive" },
  { name: "Developing", min: 40, max: 59, color: "text-status-warning", bgColor: "bg-status-warning" },
  { name: "Consistent", min: 60, max: 79, color: "text-primary", bgColor: "bg-primary" },
  { name: "Elite", min: 80, max: 100, color: "text-status-active", bgColor: "bg-status-active" },
] as const;

 // Get rank config from database rank name
 function getRankConfig(rankName: string) {
   return RANKS.find(r => r.name === rankName) || RANKS[0];
}

function getNextRank(score: number) {
  const currentRankIndex = RANKS.findIndex(r => score >= r.min && score <= r.max);
  if (currentRankIndex === RANKS.length - 1) return null; // Already Elite
  return RANKS[currentRankIndex + 1];
}

function getProgressToNextRank(score: number) {
   const currentRank = RANKS.find(r => score >= r.min && score <= r.max) || RANKS[0];
  const nextRank = getNextRank(score);
  if (!nextRank) return 100; // Elite - full progress
  
  const rangeSize = currentRank.max - currentRank.min + 1;
  const positionInRange = score - currentRank.min;
  return Math.round((positionInRange / rangeSize) * 100);
}

// Animated number component for smooth transitions
function AnimatedValue({ 
  value, 
  className 
}: { 
  value: number | string; 
  className?: string;
}) {
  return (
    <span className={cn("transition-all duration-500 ease-out", className)}>
      {value}
    </span>
  );
}

// Extracted component for the central score display
 function DisciplineScoreDisplay({ score, status, rankName }: { score: number; status: "active" | "locked"; rankName: string }) {
   const rank = getRankConfig(rankName);
  const nextRank = getNextRank(score);
  const progressToNext = getProgressToNextRank(score);
  const pointsToNext = nextRank ? nextRank.min - score : 0;

  const getScoreColor = () => {
    return rank.color;
  };

  return (
    <Card className="p-6 text-center border-2 border-primary/20 bg-gradient-to-b from-primary/5 to-transparent relative overflow-hidden group">
      {/* Live indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-active opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-status-active"></span>
        </span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Live</span>
      </div>
      
      {/* Rank Badge - Primary Identity */}
      <div className="mb-4">
        <span className={cn(
          "inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest transition-all",
          rank.bgColor + "/20",
          rank.color
        )}>
          {rank.name}
        </span>
      </div>

      {/* Score Display */}
      <div className="relative inline-flex items-center justify-center mb-4">
        <AnimatedValue 
          value={score} 
          className={cn("text-7xl font-bold font-mono tracking-tight", getScoreColor())} 
        />
        <span className="text-2xl text-muted-foreground font-light ml-1 self-end mb-3">/100</span>
      </div>

      {/* Overall Progress Bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-4 relative">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", rank.bgColor)}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Rank Progress Section */}
      <div className="border-t border-border/50 pt-4 mt-2">
        {nextRank ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className={cn("font-medium uppercase tracking-wide", rank.color)}>
                {rank.name}
              </span>
              <span className="text-muted-foreground">
                {pointsToNext} pts to {nextRank.name}
              </span>
              <span className={cn("font-medium uppercase tracking-wide", nextRank.color)}>
                {nextRank.name}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden relative">
              <div
                className={cn("h-full rounded-full transition-all duration-500", rank.bgColor)}
                style={{ width: `${progressToNext}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-status-active" />
            <span className="text-sm font-medium text-status-active">Maximum rank achieved</span>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="mt-4">
        <StatusBadge status={status === "active" ? "active" : "inactive"} className="text-xs">
          TRADING {status.toUpperCase()}
        </StatusBadge>
      </div>
    </Card>
  );
}

// Extracted component for the Can I Trade indicator
function CanTradeIndicator({ canTrade, reason }: { canTrade: boolean; reason: string }) {
  return (
    <Card className={cn(
      "p-5 border-2 transition-all duration-500",
      canTrade 
        ? "border-status-active/30 bg-status-active/5" 
        : "border-status-inactive/30 bg-status-inactive/5"
    )}>
      <div className="flex items-center gap-4">
        {canTrade ? (
          <div className="p-3 rounded-full bg-status-active/20 shrink-0">
            <CheckCircle2 className="w-7 h-7 text-status-active" />
          </div>
        ) : (
          <div className="p-3 rounded-full bg-status-inactive/20 shrink-0">
            <Lock className="w-7 h-7 text-status-inactive" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Can I Trade?
          </p>
          <AnimatedValue 
            value={canTrade ? "YES" : "NO"}
            className={cn(
              "text-3xl font-bold block",
              canTrade ? "text-status-active" : "text-status-inactive"
            )}
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-3 pl-[68px] transition-opacity duration-300">{reason}</p>
    </Card>
  );
}

// Extracted component for metric cards
function LimitCard({ 
  icon: Icon, 
  label, 
  used, 
  allowed, 
  unit = "", 
  exceeded 
}: { 
  icon: React.ElementType;
  label: string;
  used: number | string;
  allowed: number | string;
  unit?: string;
  exceeded: boolean;
}) {
  return (
    <Card className={cn("p-4 transition-all duration-300", exceeded && "border-status-inactive/50")}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <AnimatedValue 
          value={`${used}${unit}`}
          className={cn(
            "text-2xl font-bold font-mono",
            exceeded ? "text-status-inactive" : "text-foreground"
          )}
        />
        <span className="text-muted-foreground text-sm">/ {allowed}{unit}</span>
      </div>
      {exceeded && (
        <p className="text-xs text-status-inactive mt-1 animate-pulse">Limit reached</p>
      )}
    </Card>
  );
}

// Lock Screen Overlay Component
function LockScreenOverlay({ 
  reason, 
   vault
}: { 
  reason: string;
   vault: VaultStatus;
}) {
  const [timeUntilReset, setTimeUntilReset] = useState("");

  useEffect(() => {
    function updateCountdown() {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeUntilReset(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine specific violation type
  const getViolationType = () => {
     if (vault.tradesRemaining <= 0) return "Max trades exceeded";
     if (vault.dailyLossRemaining <= 0) return "Daily loss limit exceeded";
     if (reason.includes("violation")) return "Rule violation detected";
     if (vault.disciplineScore < 30) return "Discipline score too low";
     return "Trading locked";
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center border-2 border-status-inactive/30 bg-gradient-to-b from-status-inactive/10 to-transparent animate-scale-in">
        {/* Lock Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-status-inactive/20 mb-6">
          <Lock className="w-10 h-10 text-status-inactive" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-status-inactive mb-2">
          Trading Locked
        </h1>
        <p className="text-muted-foreground mb-6">
          Discipline rules violated.
        </p>

        {/* Violation Reason */}
        <Card className="p-4 mb-6 border-status-inactive/30 bg-status-inactive/5">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-status-inactive" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Violation Type
            </span>
          </div>
          <p className="font-semibold text-status-inactive">
            {getViolationType()}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {reason}
          </p>
        </Card>

        {/* Countdown Timer */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Trading resumes in
          </p>
          <div className="font-mono text-4xl font-bold text-foreground tracking-wider">
            {timeUntilReset}
          </div>
          <p className="text-xs text-muted-foreground">
            Resets at midnight local time
          </p>
        </div>

        {/* Action */}
        <div className="mt-8">
          <Link to="/rules">
            <Button variant="outline" className="gap-2">
              <Shield className="w-4 h-4" />
              Review My Rules
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

 const Dashboard = () => {
   const { user, profile, loading: authLoading } = useAuth();
   const vault = useVaultStatus();
  const [preTradeOpen, setPreTradeOpen] = useState(false);
  const isLocked = vault.disciplineStatus === "locked";
   
   if (authLoading || vault.loading) {
     return (
       <AppLayout>
         <div className="flex items-center justify-center min-h-[60vh]">
           <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
         </div>
       </AppLayout>
     );
   }
   
   if (!user) {
     return (
       <AppLayout>
         <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
           <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-6">
             <Shield className="w-8 h-8 text-primary" />
           </div>
           <h1 className="text-2xl font-semibold mb-2">VAULT OS</h1>
           <p className="text-muted-foreground mb-6 max-w-sm">
             The trading discipline operating system. Sign in to access your vault.
           </p>
           <Link to="/auth">
             <Button size="lg" className="h-12 px-8 gap-2">
               <LogIn className="w-4 h-4" />
               Sign In
             </Button>
           </Link>
         </div>
       </AppLayout>
     );
   }
   
   return (
     <AppLayout>
       <PageHeader 
         title="VAULT OS" 
         subtitle={profile?.display_name ? `Welcome, ${profile.display_name}` : "Trading Discipline System"}
       />
       
       <div className="px-4 md:px-6 space-y-6">
        {/* Central Discipline Score */}
        <section className="animate-slide-up">
          <DisciplineScoreDisplay 
            score={vault.disciplineScore} 
            status={vault.disciplineStatus}
            rankName={vault.disciplineRank}
          />
         </section>
         
        {/* Can I Trade Indicator */}
        <section className="animate-slide-up" style={{ animationDelay: "50ms" }}>
          <CanTradeIndicator 
            canTrade={vault.canTrade} 
            reason={vault.reason} 
          />
        </section>

         {/* Today's Limits */}
         <section className="animate-slide-up" style={{ animationDelay: "100ms" }}>
           <p className="section-title">Today's Limits</p>
           <div className="grid grid-cols-2 gap-4">
            <LimitCard
              icon={TrendingUp}
              label="Trades"
              used={vault.tradesToday}
              allowed={vault.maxTradesPerDay}
              exceeded={vault.tradesRemaining <= 0}
            />
            <LimitCard
              icon={AlertTriangle}
              label="Risk Used"
              used={vault.dailyLossUsed.toFixed(1)}
              allowed={vault.maxDailyLoss}
              unit="%"
              exceeded={vault.dailyLossRemaining <= 0}
            />
           </div>
         </section>
         
         {/* Streak & Violations */}
         <section className="animate-slide-up" style={{ animationDelay: "150ms" }}>
           <div className="grid grid-cols-2 gap-4">
             <Card className="p-4">
               <div className="flex items-center gap-2 mb-2">
                 <Flame className={cn(
                   "w-4 h-4",
                   vault.streakDays > 0 ? "text-status-warning" : "text-muted-foreground"
                 )} />
                 <span className="text-xs text-muted-foreground uppercase tracking-wide">Streak</span>
               </div>
               <div className="flex items-baseline gap-1">
                  <AnimatedValue value={vault.streakDays} className="text-2xl font-bold font-mono" />
                 <span className="text-muted-foreground text-sm">days</span>
               </div>
             </Card>
             <Card className={cn(
               "p-4",
               !vault.canTrade && vault.reason.includes("violation") && "border-status-inactive/50"
             )}>
               <div className="flex items-center gap-2 mb-2">
                 <XCircle className="w-4 h-4 text-muted-foreground" />
                 <span className="text-xs text-muted-foreground uppercase tracking-wide">Violations</span>
               </div>
               <div className="flex items-baseline gap-1">
                  <AnimatedValue 
                    value={!vault.canTrade && vault.reason.includes("violation") ? 1 : 0}
                    className={cn(
                      "text-2xl font-bold font-mono",
                     !vault.canTrade && vault.reason.includes("violation") ? "text-status-inactive" : "text-foreground"
                    )}
                  />
                 <span className="text-muted-foreground text-sm">today</span>
               </div>
             </Card>
           </div>
         </section>

         {/* Vault Timeline */}
         <section className="animate-slide-up" style={{ animationDelay: "175ms" }}>
           <p className="section-title">Intelligence Feed</p>
           <VaultTimeline />
         </section>
         
         {/* Primary Action */}
         <section className="pt-2 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              size="lg" 
              className="h-14 text-base font-medium gap-2"
              onClick={() => setPreTradeOpen(true)}
              disabled={isLocked}
            >
              <Crosshair className="w-5 h-5" />
              Pre-Trade Check
            </Button>
            <Link to="/rules" className="contents">
              <Button 
                size="lg" 
                variant="outline"
                className="h-14 text-base font-medium gap-2"
              >
                <Shield className="w-5 h-5" />
                My Rules
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
          </div>
         </section>
       </div>
      
      <PreTradeCheckModal open={preTradeOpen} onOpenChange={setPreTradeOpen} />
      
      {/* Lock Screen Overlay */}
      {isLocked && (
        <LockScreenOverlay
          reason={vault.reason}
          vault={vault}
        />
      )}
     </AppLayout>
   );
 };
 
 export default Dashboard;
