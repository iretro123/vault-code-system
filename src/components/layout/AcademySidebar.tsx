import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Home,
  Rocket,
  BookOpen,
  Radio,
  Settings,
  LayoutGrid,
  Search,
  Gift,
  Mail,
  Users,
  TrendingUp,
  Sparkles,
  Wrench,
} from "lucide-react";
import { ReferralModal } from "@/components/academy/ReferralModal";
import { VaultSearchModal } from "@/components/academy/VaultSearchModal";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { ChatAvatar } from "@/lib/chatAvatars";
import { InboxDrawer } from "@/components/academy/InboxDrawer";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const coreNav = [
  { icon: Home, label: "Dashboard", path: "/academy/home" },
  { icon: BookOpen, label: "Learn", path: "/academy/learn" },
  { icon: TrendingUp, label: "Trade", path: "/academy/trade" },
  { icon: Users, label: "Community", path: "/academy/community" },
  { icon: Radio, label: "Live", path: "/academy/live", isLive: true },
  { icon: Wrench, label: "Toolkit", path: "/academy/resources" },
  { icon: Settings, label: "Settings", path: "/academy/settings" },
  { icon: Sparkles, label: "Ask Coach", path: "__coach__", isCoach: true },
];

export function AcademySidebar() {
  const [inboxOpen, setInboxOpen] = useState(() => {
    try { return localStorage.getItem("va_inbox_open") === "true"; } catch { return false; }
  });
  const [referralOpen, setReferralOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const handleInboxChange = (open: boolean) => {
    setInboxOpen(open);
    try { localStorage.setItem("va_inbox_open", String(open)); } catch {}
  };
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile } = useAuth();
  const { inboxUnreadCount, onboarding } = useAcademyData();

  const displayName = profile?.display_name || "Trader";
  const avatarUrl = (profile as any)?.avatar_url || null;
  const profileCompleted = profile && (profile as any).profile_completed;
  const onboardingComplete = profileCompleted && onboarding?.claimed_role;

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.03)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}>
      <SidebarContent>
        {/* Hub link */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/hub"
                    className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <LayoutGrid className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="text-sm">Mode Select</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Search */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="group/search flex items-center gap-2 w-full rounded-[10px] bg-[rgba(255,255,255,0.035)] border border-white/[0.08] backdrop-blur-[6px] px-2.5 py-2 h-10 transition-all duration-[120ms] ease-out hover:bg-white/[0.06] hover:border-white/[0.12] focus-visible:bg-white/[0.08] focus-visible:border-[rgba(59,130,246,0.55)] focus-visible:shadow-[0_0_0_2px_rgba(59,130,246,0.12)] focus-visible:outline-none"
                >
                  <Search className="h-4 w-4 shrink-0 text-white/60 group-focus-visible/search:text-white/90 transition-opacity duration-[120ms]" />
                  {!collapsed && (
                    <span className="flex items-center justify-between w-full text-sm text-white/[0.45]">
                      Search
                      <kbd className="ml-auto text-[10px] text-white/[0.30] bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
                    </span>
                  )}
                </button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Main nav */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] tracking-[0.08em] uppercase opacity-60">{!collapsed && "Nav"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Start — only shown until onboarding complete */}
              {!onboardingComplete && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/academy/start")}>
                    <NavLink
                      to="/academy/start"
                      end
                      className="flex items-center gap-2 px-2 py-1.5 text-primary/80 hover:text-primary"
                      activeClassName="bg-primary/10 text-primary font-medium border border-primary/20"
                    >
                      <Rocket className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm font-medium">Start</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {coreNav.map(({ icon: Icon, label, path, isLive, isCoach }) => {
                if (isCoach) {
                  return (
                    <SidebarMenuItem key={path} className="mt-0">
                      <div className="mx-2 my-3 h-px bg-white/[0.10]" />
                      <SidebarMenuButton asChild>
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent("toggle-coach-drawer"))}
                          className="flex items-center gap-2 px-2 py-1.5 w-full rounded-lg text-left transition-colors"
                          style={{
                            background: "linear-gradient(135deg, hsl(217,91%,60%) 0%, hsl(217,80%,55%) 100%)",
                            color: "#fff",
                          }}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="text-sm font-semibold">{label}</span>}
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                const active = isActive(path);
                return (
                  <SidebarMenuItem key={path}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink
                        to={path}
                        end
                        className={`flex items-center gap-2 px-2 py-1.5 ${isLive ? "text-[hsl(200,80%,65%)] hover:text-[hsl(200,80%,75%)] hover:drop-shadow-[0_0_6px_hsl(200,80%,55%/0.3)]" : ""}`}
                        activeClassName={isLive ? "bg-muted text-[hsl(200,80%,70%)] font-medium drop-shadow-[0_0_6px_hsl(200,80%,55%/0.25)]" : "bg-muted text-primary font-medium"}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="text-sm">{label}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Bottom Dock — pinned footer (untouched) */}
      <SidebarFooter className="mt-auto border-t border-white/[0.06] p-2.5 space-y-1.5" style={{ background: 'rgba(10,10,14,0.55)' }}>
        {/* Share Vault Card */}
        {!collapsed && (
          <button
            onClick={() => setReferralOpen(true)}
            className="group w-full text-left rounded-2xl border border-white/[0.08] px-4 py-3.5 transition-colors duration-[120ms] hover:bg-[rgba(20,20,24,0.7)] hover:border-white/[0.12] active:scale-[0.98]"
            style={{ background: 'rgba(20,20,24,0.55)', boxShadow: '0 12px 30px rgba(0,0,0,0.35)' }}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[16px] font-semibold text-white/90 leading-tight">Share Vault</p>
                <p className="text-[13px] text-white/[0.57] mt-0.5">Earn rewards for invites</p>
              </div>
              <div className="shrink-0 flex items-center justify-center h-9 w-9 rounded-full bg-white/[0.06] border border-white/[0.08] group-hover:bg-white/[0.10] transition-colors duration-[120ms]">
                <Gift className="h-4 w-4 text-white/80" />
              </div>
            </div>
          </button>
        )}

        {/* User Identity */}
        <div className="flex items-center gap-2.5 rounded-2xl px-3 py-2 select-none pointer-events-none border border-white/[0.08]" style={{ background: 'rgba(20,20,24,0.55)', boxShadow: '0 12px 30px rgba(0,0,0,0.35)' }}>
          <div className="relative shrink-0">
            <ChatAvatar avatarUrl={avatarUrl} userName={displayName} size="h-7 w-7" />
            <span className="absolute -bottom-px -right-px h-2 w-2 rounded-full bg-emerald-500 ring-[1.5px] ring-[hsl(220,20%,6%)]" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate leading-tight">{displayName}</p>
              <p className="text-[11px] text-muted-foreground/60 leading-tight">Vault Academy Member</p>
            </div>
          )}
        </div>

        {/* Inbox */}
        <button
          data-inbox-trigger
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleInboxChange(!inboxOpen);
          }}
          className="relative flex items-center gap-2.5 rounded-2xl px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground w-full text-left transition-colors duration-[120ms] border border-white/[0.08] hover:bg-[rgba(20,20,24,0.7)] hover:border-white/[0.12]"
          style={{ background: 'rgba(20,20,24,0.55)', boxShadow: '0 12px 30px rgba(0,0,0,0.35)' }}
        >
          <Mail className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <span className="flex items-center gap-1.5 font-medium">
              Inbox
              {inboxUnreadCount > 0 && (
                <span className="flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full bg-[hsl(45,90%,50%)] text-[hsl(45,90%,10%)] text-[10px] font-bold leading-none">
                  {inboxUnreadCount > 9 ? "9+" : inboxUnreadCount}
                </span>
              )}
            </span>
          )}
          {collapsed && inboxUnreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-[hsl(45,90%,50%)]" />
          )}
        </button>

        <InboxDrawer open={inboxOpen} onOpenChange={handleInboxChange} />
        <ReferralModal open={referralOpen} onOpenChange={setReferralOpen} />
        <VaultSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
      </SidebarFooter>
    </Sidebar>
  );
}
