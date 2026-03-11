import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, Settings, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

const navItems = [
  { icon: BookOpen, label: "Academy", path: "/academy" },
  { icon: Settings, label: "Settings", path: "/academy/settings" },
];

export function MobileNav() {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/10 z-50 md:hidden pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center justify-around px-2 py-2">
        <button
          onClick={() => setOpenMobile(true)}
          className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors min-w-[64px] text-muted-foreground hover:text-foreground"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname.startsWith(path);
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
