 import { NavLink, useLocation } from "react-router-dom";
 import { LayoutDashboard, Shield, BookOpen, GraduationCap, Zap } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 const navItems = [
   { icon: LayoutDashboard, label: "Dashboard", path: "/" },
   { icon: Shield, label: "Rules", path: "/rules" },
   { icon: BookOpen, label: "Log", path: "/log" },
   { icon: GraduationCap, label: "Academy", path: "/academy" },
   { icon: Zap, label: "Upgrade", path: "/upgrade" },
 ];
 
 export function MobileNav() {
   const location = useLocation();
   
   return (
     <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-50 md:hidden">
       <div className="flex items-center justify-around px-2 py-2">
         {navItems.map(({ icon: Icon, label, path }) => {
           const isActive = location.pathname === path;
           return (
             <NavLink
               key={path}
               to={path}
               className={cn(
                 "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
                 isActive 
                   ? "text-primary" 
                   : "text-muted-foreground hover:text-foreground"
               )}
             >
               <Icon className="w-5 h-5" />
               <span className="text-[10px] font-medium">{label}</span>
             </NavLink>
           );
         })}
       </div>
     </nav>
   );
 }