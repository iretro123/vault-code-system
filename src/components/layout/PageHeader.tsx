 import { ReactNode } from "react";
 import { useAuth } from "@/hooks/useAuth";
 import { Button } from "@/components/ui/button";
 import { LogOut, User } from "lucide-react";
 import { Link } from "react-router-dom";
 
 interface PageHeaderProps {
   title: string;
   subtitle?: string;
   action?: ReactNode;
 }
 
 export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
   const { user, signOut } = useAuth();
   
   return (
     <header className="px-4 pt-6 pb-4 md:px-6 md:pt-8">
       <div className="flex items-start justify-between gap-4">
         <div>
           <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
           {subtitle && (
             <p className="text-muted-foreground mt-1 text-sm md:text-base">{subtitle}</p>
           )}
         </div>
         <div className="flex items-center gap-2">
           {action}
           {user ? (
             <Button 
               variant="ghost" 
               size="icon" 
               onClick={signOut}
               className="text-muted-foreground hover:text-foreground"
             >
               <LogOut className="w-5 h-5" />
             </Button>
           ) : (
             <Link to="/auth">
               <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                 <User className="w-5 h-5" />
               </Button>
             </Link>
           )}
         </div>
       </div>
     </header>
   );
 }