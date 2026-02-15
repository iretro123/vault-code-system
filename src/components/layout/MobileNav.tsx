import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, FileText, Settings, LayoutGrid, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const baseNavItems = [
  { icon: LayoutGrid, label: "Mode", path: "/hub" },
  { icon: BookOpen, label: "Academy", path: "/academy" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const adminNavItems = [
  { icon: Shield, label: "Vault OS", path: "/cockpit" },
  { icon: FileText, label: "Reports", path: "/reports" },
];

export function MobileNav() {
  const location = useLocation();
  const { hasRole } = useAuth();

  const isAdmin = hasRole("operator");
  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/10 z-50 md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                "relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors min-w-[64px]",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
              {isActive && (
                <div className="absolute -bottom-1 w-6 h-0.5 bg-primary rounded-full" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
