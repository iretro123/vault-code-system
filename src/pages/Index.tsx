 import { Link } from "react-router-dom";
 import { AppLayout } from "@/components/layout/AppLayout";
 import { PageHeader } from "@/components/layout/PageHeader";
 import { StatusBadge } from "@/components/ui/StatusBadge";
 import { Button } from "@/components/ui/button";
import { Shield, ChevronRight, CheckCircle2, LogIn, Loader2, Lock, AlertTriangle, Flame, TrendingUp, XCircle } from "lucide-react";
 import { useAuth } from "@/hooks/useAuth";
 import { useDiscipline } from "@/hooks/useDiscipline";
 import { Card } from "@/components/ui/card";
 import { cn } from "@/lib/utils";
 
// Extracted component for the central score display
function DisciplineScoreDisplay({ score, status }: { score: number; status: "active" | "locked" }) {
  const getScoreColor = () => {
    if (score >= 70) return "text-status-active";
    if (score >= 40) return "text-status-warning";
    return "text-status-inactive";
  };

  const getProgressColor = () => {
    if (score >= 70) return "bg-status-active";
    if (score >= 40) return "bg-status-warning";
    return "bg-status-inactive";
  };

  return (
    <Card className="p-6 text-center border-2 border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
        Discipline Score
      </p>
      <div className="relative inline-flex items-center justify-center mb-4">
        <span className={cn("text-7xl font-bold font-mono tracking-tight", getScoreColor())}>
          {score}
        </span>
        <span className="text-2xl text-muted-foreground font-light ml-1 self-end mb-3">/100</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", getProgressColor())}
          style={{ width: `${score}%` }}
        />
      </div>
      <StatusBadge status={status === "active" ? "active" : "inactive"} className="text-sm">
        {status.toUpperCase()}
      </StatusBadge>
    </Card>
  );
}

// Extracted component for the Can I Trade indicator
function CanTradeIndicator({ canTrade, reason }: { canTrade: boolean; reason: string }) {
  return (
    <Card className={cn(
      "p-5 border-2 transition-colors",
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
          <p className={cn(
            "text-3xl font-bold",
            canTrade ? "text-status-active" : "text-status-inactive"
          )}>
            {canTrade ? "YES" : "NO"}
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-3 pl-[68px]">{reason}</p>
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
    <Card className={cn("p-4", exceeded && "border-status-inactive/50")}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn(
          "text-2xl font-bold font-mono",
          exceeded ? "text-status-inactive" : "text-foreground"
        )}>
          {used}{unit}
        </span>
        <span className="text-muted-foreground text-sm">/ {allowed}{unit}</span>
      </div>
      {exceeded && (
        <p className="text-xs text-status-inactive mt-1">Limit reached</p>
      )}
    </Card>
  );
}

 const Dashboard = () => {
   const { user, profile, loading: authLoading } = useAuth();
   const discipline = useDiscipline();
   
   if (authLoading || discipline.loading) {
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
            score={discipline.disciplineScore} 
            status={discipline.disciplineStatus} 
          />
         </section>
         
        {/* Can I Trade Indicator */}
        <section className="animate-slide-up" style={{ animationDelay: "50ms" }}>
          <CanTradeIndicator 
            canTrade={discipline.canTrade} 
            reason={discipline.canTradeReason} 
          />
        </section>

         {/* Today's Limits */}
         <section className="animate-slide-up" style={{ animationDelay: "100ms" }}>
           <p className="section-title">Today's Limits</p>
           <div className="grid grid-cols-2 gap-4">
            <LimitCard
              icon={TrendingUp}
              label="Trades"
              used={discipline.todayTradesUsed}
              allowed={discipline.todayTradesAllowed}
              exceeded={discipline.hasExceededMaxTrades}
            />
            <LimitCard
              icon={AlertTriangle}
              label="Risk Used"
              used={discipline.todayLossUsed.toFixed(1)}
              allowed={discipline.todayLossAllowed}
              unit="%"
              exceeded={discipline.hasExceededDailyLoss}
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
                   discipline.disciplineStreak > 0 ? "text-status-warning" : "text-muted-foreground"
                 )} />
                 <span className="text-xs text-muted-foreground uppercase tracking-wide">Streak</span>
               </div>
               <div className="flex items-baseline gap-1">
                 <span className="text-2xl font-bold font-mono">{discipline.disciplineStreak}</span>
                 <span className="text-muted-foreground text-sm">days</span>
               </div>
             </Card>
             <Card className={cn(
               "p-4",
               discipline.todayViolations > 0 && "border-status-inactive/50"
             )}>
               <div className="flex items-center gap-2 mb-2">
                 <XCircle className="w-4 h-4 text-muted-foreground" />
                 <span className="text-xs text-muted-foreground uppercase tracking-wide">Violations</span>
               </div>
               <div className="flex items-baseline gap-1">
                 <span className={cn(
                   "text-2xl font-bold font-mono",
                   discipline.todayViolations > 0 ? "text-status-inactive" : "text-foreground"
                 )}>
                   {discipline.todayViolations}
                 </span>
                 <span className="text-muted-foreground text-sm">today</span>
               </div>
             </Card>
           </div>
         </section>
         
         {/* Primary Action */}
         <section className="pt-2 animate-slide-up" style={{ animationDelay: "200ms" }}>
           <Link to="/rules">
             <Button 
               size="lg" 
               className="w-full h-14 text-base font-medium gap-2"
             >
               <Shield className="w-5 h-5" />
               Set My Trading Rules
               <ChevronRight className="w-4 h-4 ml-auto" />
             </Button>
           </Link>
         </section>
       </div>
     </AppLayout>
   );
 };
 
 export default Dashboard;
