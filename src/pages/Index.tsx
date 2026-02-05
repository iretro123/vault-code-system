 import { Link } from "react-router-dom";
 import { AppLayout } from "@/components/layout/AppLayout";
 import { PageHeader } from "@/components/layout/PageHeader";
 import { StatusBadge } from "@/components/ui/StatusBadge";
 import { MetricCard } from "@/components/ui/MetricCard";
 import { Button } from "@/components/ui/button";
 import { Shield, ChevronRight, CheckCircle2, XCircle, LogIn, Loader2, Lock, AlertTriangle, Flame, TrendingUp } from "lucide-react";
 import { useAuth } from "@/hooks/useAuth";
 import { useDiscipline } from "@/hooks/useDiscipline";
 import { Card } from "@/components/ui/card";
 import { cn } from "@/lib/utils";
 
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
         {/* Main Status Card */}
         <Card className={cn(
           "p-5 border-2 animate-slide-up",
           discipline.canTrade ? "border-status-active/30 bg-status-active/5" : "border-status-inactive/30 bg-status-inactive/5"
         )}>
           <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
               {discipline.canTrade ? (
                 <div className="p-2.5 rounded-full bg-status-active/20">
                   <CheckCircle2 className="w-6 h-6 text-status-active" />
                 </div>
               ) : (
                 <div className="p-2.5 rounded-full bg-status-inactive/20">
                   <Lock className="w-6 h-6 text-status-inactive" />
                 </div>
               )}
               <div>
                 <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Can I Trade?</p>
                 <p className={cn(
                   "text-2xl font-bold",
                   discipline.canTrade ? "text-status-active" : "text-status-inactive"
                 )}>
                   {discipline.canTrade ? "YES" : "NO"}
                 </p>
               </div>
             </div>
             <StatusBadge status={discipline.disciplineStatus === "active" ? "active" : "inactive"}>
               {discipline.disciplineStatus}
             </StatusBadge>
           </div>
           <p className="text-sm text-muted-foreground">{discipline.canTradeReason}</p>
         </Card>
         
         {/* Discipline Score */}
         <section className="animate-slide-up" style={{ animationDelay: "50ms" }}>
           <p className="section-title">Discipline Score</p>
           <Card className="p-5">
             <div className="flex items-center justify-between mb-3">
               <span className="text-4xl font-bold text-primary font-mono">{discipline.disciplineScore}</span>
               <span className="text-muted-foreground text-sm">/ 100</span>
             </div>
             {/* Progress bar */}
             <div className="h-2 bg-muted rounded-full overflow-hidden">
               <div 
                 className={cn(
                   "h-full rounded-full transition-all duration-500",
                   discipline.disciplineScore >= 70 ? "bg-status-active" :
                   discipline.disciplineScore >= 40 ? "bg-status-warning" :
                   "bg-status-inactive"
                 )}
                 style={{ width: `${discipline.disciplineScore}%` }}
               />
             </div>
             <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
               <span>Compliance: {discipline.complianceRate}%</span>
               <span>Avg Emotion: {discipline.avgEmotionalState.toFixed(1)}/5</span>
             </div>
           </Card>
         </section>
         
         {/* Today's Limits */}
         <section className="animate-slide-up" style={{ animationDelay: "100ms" }}>
           <p className="section-title">Today's Limits</p>
           <div className="grid grid-cols-2 gap-4">
             {/* Trades Used */}
             <Card className={cn(
               "p-4",
               discipline.hasExceededMaxTrades && "border-status-inactive/50"
             )}>
               <div className="flex items-center gap-2 mb-2">
                 <TrendingUp className="w-4 h-4 text-muted-foreground" />
                 <span className="text-xs text-muted-foreground uppercase tracking-wide">Trades</span>
               </div>
               <div className="flex items-baseline gap-1">
                 <span className={cn(
                   "text-2xl font-bold font-mono",
                   discipline.hasExceededMaxTrades ? "text-status-inactive" : "text-foreground"
                 )}>
                   {discipline.todayTradesUsed}
                 </span>
                 <span className="text-muted-foreground text-sm">/ {discipline.todayTradesAllowed}</span>
               </div>
               {discipline.hasExceededMaxTrades && (
                 <p className="text-xs text-status-inactive mt-1">Limit reached</p>
               )}
             </Card>
             
             {/* Daily Loss */}
             <Card className={cn(
               "p-4",
               discipline.hasExceededDailyLoss && "border-status-inactive/50"
             )}>
               <div className="flex items-center gap-2 mb-2">
                 <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                 <span className="text-xs text-muted-foreground uppercase tracking-wide">Risk Used</span>
               </div>
               <div className="flex items-baseline gap-1">
                 <span className={cn(
                   "text-2xl font-bold font-mono",
                   discipline.hasExceededDailyLoss ? "text-status-inactive" : "text-foreground"
                 )}>
                   {discipline.todayLossUsed.toFixed(1)}%
                 </span>
                 <span className="text-muted-foreground text-sm">/ {discipline.todayLossAllowed}%</span>
               </div>
               {discipline.hasExceededDailyLoss && (
                 <p className="text-xs text-status-inactive mt-1">Limit reached</p>
               )}
             </Card>
           </div>
         </section>
         
         {/* Streak & Violations */}
         <section className="animate-slide-up" style={{ animationDelay: "150ms" }}>
           <div className="grid grid-cols-2 gap-4">
             {/* Discipline Streak */}
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
             
             {/* Today's Violations */}
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
