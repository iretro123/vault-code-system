 import { AppLayout } from "@/components/layout/AppLayout";
 import { PageHeader } from "@/components/layout/PageHeader";
 import { Card } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Lock, BookOpen, Video, FileText, ChevronRight } from "lucide-react";
 import { Link } from "react-router-dom";
 
 const modules = [
   { id: 1, title: "Discipline Foundations", type: "course", lessons: 8 },
   { id: 2, title: "Risk Management Mastery", type: "course", lessons: 6 },
   { id: 3, title: "Psychology of Trading", type: "video", lessons: 12 },
   { id: 4, title: "Building Your Rulebook", type: "workshop", lessons: 4 },
 ];
 
 const Academy = () => {
   // Placeholder for role check - will be replaced with actual auth
   const hasAccess = false;
   
   return (
     <AppLayout>
       <PageHeader 
         title="Academy" 
         subtitle="Master trading discipline"
       />
       
       <div className="px-4 md:px-6 space-y-6 pb-6">
         {!hasAccess && (
           <Card className="p-6 border-primary/20 bg-primary/5">
             <div className="flex items-start gap-4">
               <div className="p-3 rounded-full bg-primary/10">
                 <Lock className="w-6 h-6 text-primary" />
               </div>
               <div className="flex-1">
                 <h3 className="font-semibold mb-1">Academy Locked</h3>
                 <p className="text-sm text-muted-foreground mb-4">
                   Access to educational content requires Vault Access or higher. 
                   Upgrade to unlock all modules.
                 </p>
                 <Link to="/upgrade">
                   <Button variant="default" size="sm" className="gap-2">
                     Upgrade Now
                     <ChevronRight className="w-4 h-4" />
                   </Button>
                 </Link>
               </div>
             </div>
           </Card>
         )}
         
         <div>
           <p className="section-title">Modules</p>
           <div className="space-y-3">
             {modules.map((module) => (
               <Card 
                 key={module.id} 
                 className="p-4 opacity-60 cursor-not-allowed"
               >
                 <div className="flex items-center gap-4">
                   <div className="p-2.5 rounded-lg bg-muted">
                     {module.type === "video" ? (
                       <Video className="w-5 h-5 text-muted-foreground" />
                     ) : module.type === "workshop" ? (
                       <FileText className="w-5 h-5 text-muted-foreground" />
                     ) : (
                       <BookOpen className="w-5 h-5 text-muted-foreground" />
                     )}
                   </div>
                   <div className="flex-1">
                     <h4 className="font-medium">{module.title}</h4>
                     <p className="text-sm text-muted-foreground">
                       {module.lessons} lessons
                     </p>
                   </div>
                   <Lock className="w-4 h-4 text-muted-foreground" />
                 </div>
               </Card>
             ))}
           </div>
         </div>
       </div>
     </AppLayout>
   );
 };
 
 export default Academy;