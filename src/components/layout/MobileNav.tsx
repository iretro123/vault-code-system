import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, Menu, Home, MessageSquare, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { useLiveNow } from "@/hooks/useLiveNow";

export function MobileNav() {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();
  const { liveSession } = useLiveNow();
  const joinLiveUrl = liveSession?.join_url || "";
  const navItems = [
    { icon: Menu, label: "Menu", path: "__menu__" },
    { icon: Home, label: "Home", path: "/academy/home" },
    { icon: MessageSquare, label: "Chat", path: "/academy/community" },
    ...(joinLiveUrl ? [{ icon: Radio, label: "Join Live", href: joinLiveUrl, liveDot: true }] : []),
    { icon: BookOpen, label: "Learn", path: "/academy/learn" },
  ];

  const renderItem = ({
    icon: Icon,
    label,
    path,
    href,
    liveDot,
  }: {
    icon: typeof Menu;
    label: string;
    path: string;
    href?: string;
    liveDot?: boolean;
  }) => {
    const isMenu = path === "__menu__";
    const isActive = !isMenu && location.pathname.startsWith(path);

    if (isMenu) {
      return (
        <button
          key={label}
          onClick={() => setOpenMobile(true)}
          className={cn(
            "relative flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-colors min-w-[52px] text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="w-[22px] h-[22px]" />
          <span className="text-[11px] font-medium">{label}</span>
        </button>
      );
    }

    const content = (
      <div
        className={cn(
          "relative flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-colors min-w-[52px]",
          isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <div className="relative">
          <Icon className="w-[22px] h-[22px]" />
          {liveDot && (
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
          )}
        </div>
        <span className="text-[11px] font-medium">{label}</span>
        {isActive && (
          <div className="absolute -bottom-1 w-6 h-0.5 bg-primary rounded-full" />
        )}
      </div>
    );

    if (href) {
      return (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center"
        >
          {content}
        </a>
      );
    }

    return (
      <NavLink
        key={path}
        to={path}
        className="flex items-center justify-center"
      >
        {content}
      </NavLink>
    );
  };

  const gridClass =
    navItems.length >= 5
      ? "grid-cols-5 max-w-[380px]"
      : "grid-cols-4 max-w-[344px]";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/10 z-50 md:hidden pb-[env(safe-area-inset-bottom,0px)]">
      <div className={cn("grid items-center px-2 py-2 w-full mx-auto", gridClass)}>
        {navItems.map((item) => renderItem({
          icon: item.icon,
          label: item.label,
          path: item.path || item.href || "__link__",
          href: (item as any).href,
          liveDot: (item as any).liveDot,
        }))}
      </div>
    </nav>
  );
}
