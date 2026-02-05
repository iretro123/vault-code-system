 import { AppLayout } from "@/components/layout/AppLayout";
 import { PageHeader } from "@/components/layout/PageHeader";
 import { Card } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Check, Shield, Zap, Brain } from "lucide-react";
 
 const plans = [
   {
     id: "vault-os",
     name: "VAULT OS",
     type: "One-time",
     price: "$297",
     icon: Shield,
     description: "Lifetime access to the core discipline system",
     features: [
       "Rule Vault - Define your trading rules",
       "Trade Log - Fast trade journaling",
       "Discipline Score tracking",
       "Violation detection",
       "Export your data",
     ],
     highlight: false,
   },
   {
     id: "vault-access",
     name: "Vault Access",
     type: "Monthly",
     price: "$47/mo",
     icon: Zap,
     description: "Unlock the Academy and advanced features",
     features: [
       "Everything in VAULT OS",
       "Academy - All educational modules",
       "Weekly accountability check-ins",
       "Progress analytics",
       "Priority support",
     ],
     highlight: true,
   },
   {
     id: "vault-intelligence",
     name: "Vault Intelligence",
     type: "Monthly",
     price: "$97/mo",
     icon: Brain,
     description: "AI-powered discipline insights",
     features: [
       "Everything in Vault Access",
       "AI pattern detection",
       "Personalized discipline coaching",
       "Risk behavior analysis",
       "1-on-1 monthly review call",
     ],
     highlight: false,
   },
 ];
 
 const Upgrade = () => {
   return (
     <AppLayout>
       <PageHeader 
         title="Upgrade" 
         subtitle="Unlock your full potential"
       />
       
       <div className="px-4 md:px-6 space-y-6 pb-6">
         {/* Value Prop */}
         <div className="text-center py-4">
           <p className="text-muted-foreground max-w-sm mx-auto">
             Discipline separates profitable traders from the rest. 
             Choose the level of accountability you need.
           </p>
         </div>
         
         {/* Plans */}
         <div className="space-y-4">
           {plans.map((plan) => (
             <Card 
               key={plan.id}
               className={`p-5 ${plan.highlight ? "border-primary bg-primary/5" : ""}`}
             >
               <div className="flex items-start gap-4 mb-4">
                 <div className={`p-2.5 rounded-lg ${plan.highlight ? "bg-primary/20" : "bg-muted"}`}>
                   <plan.icon className={`w-5 h-5 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`} />
                 </div>
                 <div className="flex-1">
                   <div className="flex items-baseline justify-between">
                     <h3 className="font-semibold">{plan.name}</h3>
                     <span className="text-xs text-muted-foreground">{plan.type}</span>
                   </div>
                   <p className="text-2xl font-bold mt-1">{plan.price}</p>
                 </div>
               </div>
               
               <p className="text-sm text-muted-foreground mb-4">
                 {plan.description}
               </p>
               
               <ul className="space-y-2 mb-5">
                 {plan.features.map((feature, i) => (
                   <li key={i} className="flex items-center gap-2 text-sm">
                     <Check className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`} />
                     <span>{feature}</span>
                   </li>
                 ))}
               </ul>
               
               <Button 
                 className="w-full h-12"
                 variant={plan.highlight ? "default" : "secondary"}
               >
                 Get {plan.name}
               </Button>
             </Card>
           ))}
         </div>
         
         {/* Guarantee */}
         <div className="text-center py-4">
           <p className="text-sm text-muted-foreground">
             30-day money-back guarantee. No questions asked.
           </p>
         </div>
       </div>
     </AppLayout>
   );
 };
 
 export default Upgrade;