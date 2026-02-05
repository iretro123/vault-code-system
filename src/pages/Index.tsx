 import { Link } from "react-router-dom";
 import { AppLayout } from "@/components/layout/AppLayout";
 import { PageHeader } from "@/components/layout/PageHeader";
 import { StatusBadge } from "@/components/ui/StatusBadge";
 import { MetricCard } from "@/components/ui/MetricCard";
 import { Button } from "@/components/ui/button";
 import { Shield, ChevronRight, CheckCircle2, XCircle, LogIn, Loader2 } from "lucide-react";
 import { useAuth } from "@/hooks/useAuth";
 import { useTradeLog } from "@/hooks/useTradeLog";
 
 const Dashboard = () => {
   const { user, profile, loading: authLoading } = useAuth();
   const { weekStats, loading: tradeLoading } = useTradeLog();
   
   const disciplineStatus = profile?.discipline_status ?? "inactive";
   const disciplineScore = profile?.discipline_score ?? 0;
   const canTradeToday = disciplineStatus === "active" && weekStats.violations === 0;
   
   if (authLoading) {
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
         {/* Status Section */}
         <section className="animate-slide-up">
           <p className="section-title">System Status</p>
           <div className="flex items-center gap-3">
             <StatusBadge status={disciplineStatus === "active" ? "active" : "inactive"}>
               Discipline {disciplineStatus}
             </StatusBadge>
           </div>
         </section>
         
         {/* Metrics Grid */}
         <section className="grid grid-cols-2 gap-4">
           <MetricCard 
             label="Discipline Score"
             value={disciplineScore}
             subtext="out of 100"
             variant="highlight"
           />
           <div className="metric-card animate-slide-up">
             <p className="section-title mb-2">Can I Trade?</p>
             <div className="flex items-center gap-2">
               {canTradeToday ? (
                 <>
                   <CheckCircle2 className="w-7 h-7 text-status-active" />
                   <span className="text-2xl font-semibold text-status-active">Yes</span>
                 </>
               ) : (
                 <>
                   <XCircle className="w-7 h-7 text-status-inactive" />
                   <span className="text-2xl font-semibold text-status-inactive">No</span>
                 </>
               )}
             </div>
             <p className="text-sm text-muted-foreground mt-1">
               {canTradeToday ? "Rules satisfied" : "Review rules first"}
             </p>
           </div>
         </section>
         
         {/* Primary Action */}
         <section className="pt-4">
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
         
         {/* Quick Stats */}
         <section className="pt-2">
           <p className="section-title">This Week</p>
           <div className="grid grid-cols-3 gap-3">
             <div className="metric-card text-center">
               <p className="text-2xl font-semibold">{tradeLoading ? "—" : weekStats.tradesCount}</p>
               <p className="text-xs text-muted-foreground mt-1">Trades</p>
             </div>
             <div className="metric-card text-center">
               <p className="text-2xl font-semibold">—</p>
               <p className="text-xs text-muted-foreground mt-1">Win Rate</p>
             </div>
             <div className="metric-card text-center">
               <p className="text-2xl font-semibold text-status-inactive">{tradeLoading ? "—" : weekStats.violations}</p>
               <p className="text-xs text-muted-foreground mt-1">Violations</p>
             </div>
           </div>
         </section>
       </div>
     </AppLayout>
   );
 };
 
 export default Dashboard;
