 import { Link } from "react-router-dom";
 import { AppLayout } from "@/components/layout/AppLayout";
 import { PageHeader } from "@/components/layout/PageHeader";
 import { Card } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { useAuth } from "@/hooks/useAuth";
 import { Brain, Lock, Sparkles, TrendingUp, Target, MessageSquare, ChevronRight, Loader2 } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 // Feature preview cards for locked state
 const FEATURES = [
   {
     icon: Brain,
     title: "Behavior Analysis",
     description: "AI identifies patterns in your trading decisions and emotional triggers.",
   },
   {
     icon: Target,
     title: "Discipline Coaching",
     description: "Personalized recommendations to improve your trading discipline.",
   },
   {
     icon: TrendingUp,
     title: "Performance Insights",
     description: "Deep analysis of your rule adherence and score progression.",
   },
   {
     icon: MessageSquare,
     title: "AI Coach Chat",
     description: "Interactive coaching sessions with your personal AI discipline coach.",
   },
 ];
 
 function LockedContent() {
   return (
     <div className="flex flex-col items-center text-center px-4">
       {/* Lock Icon */}
       <div className="relative mb-6">
         <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20">
           <Brain className="w-10 h-10 text-primary" />
         </div>
         <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-background border border-border">
           <Lock className="w-4 h-4 text-muted-foreground" />
         </div>
       </div>
 
       {/* Title & Description */}
       <h2 className="text-xl font-semibold mb-2">Vault Intelligence</h2>
       <p className="text-muted-foreground max-w-sm mb-8">
         Vault Intelligence analyzes your trading behavior and provides AI discipline coaching.
       </p>
 
       {/* Feature Preview Grid */}
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mb-8">
         {FEATURES.map((feature) => (
           <Card
             key={feature.title}
             className="p-4 text-left opacity-60 relative overflow-hidden"
           >
             <div className="absolute inset-0 bg-gradient-to-br from-transparent to-muted/50" />
             <div className="relative">
               <feature.icon className="w-5 h-5 text-muted-foreground mb-2" />
               <p className="font-medium text-sm mb-1">{feature.title}</p>
               <p className="text-xs text-muted-foreground">{feature.description}</p>
             </div>
           </Card>
         ))}
       </div>
 
       {/* Upgrade CTA */}
       <Card className="p-6 w-full max-w-sm border-2 border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
         <div className="flex items-center gap-2 mb-3">
           <Sparkles className="w-5 h-5 text-primary" />
           <span className="font-semibold">Unlock Vault Intelligence</span>
         </div>
         <p className="text-sm text-muted-foreground mb-4">
           Get AI-powered discipline coaching, behavior analysis, and personalized insights.
         </p>
         <Link to="/upgrade">
           <Button className="w-full h-12 gap-2">
             Upgrade Now
             <ChevronRight className="w-4 h-4" />
           </Button>
         </Link>
       </Card>
     </div>
   );
 }
 
 function UnlockedContent() {
   return (
     <div className="px-4 space-y-6">
       {/* Coming Soon Placeholder */}
       <Card className="p-8 text-center border-2 border-primary/20">
         <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
           <Brain className="w-8 h-8 text-primary" />
         </div>
         <h2 className="text-xl font-semibold mb-2">Vault Intelligence Active</h2>
         <p className="text-muted-foreground max-w-md mx-auto">
           Your AI discipline coach is being prepared. Advanced behavior analysis and personalized coaching coming soon.
         </p>
       </Card>
 
       {/* Feature Cards */}
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         {FEATURES.map((feature) => (
           <Card key={feature.title} className="p-5">
             <div className="flex items-start gap-3">
               <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                 <feature.icon className="w-5 h-5 text-primary" />
               </div>
               <div>
                 <p className="font-medium mb-1">{feature.title}</p>
                 <p className="text-sm text-muted-foreground">{feature.description}</p>
               </div>
             </div>
           </Card>
         ))}
       </div>
     </div>
   );
 }
 
 const VaultIntelligence = () => {
   const { user, loading, hasMinRole } = useAuth();
   const hasAccess = hasMinRole("vault_intelligence");
 
   if (loading) {
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
             <Brain className="w-8 h-8 text-primary" />
           </div>
           <h1 className="text-2xl font-semibold mb-2">Vault Intelligence</h1>
           <p className="text-muted-foreground mb-6 max-w-sm">
             Sign in to access AI-powered discipline coaching.
           </p>
           <Link to="/auth">
             <Button size="lg" className="h-12 px-8">
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
         title="Vault Intelligence"
         subtitle={hasAccess ? "AI Discipline Coaching" : "Premium Feature"}
       />
       
       <div className="py-6">
         {hasAccess ? <UnlockedContent /> : <LockedContent />}
       </div>
     </AppLayout>
   );
 };
 
 export default VaultIntelligence;