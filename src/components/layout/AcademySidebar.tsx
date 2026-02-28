import { useState } from "react";
import vaultVLogo from "@/assets/vault-v-logo.png";
import { useLocation } from "react-router-dom";
import {
  Home,
  Rocket,
  BookOpen,
  Radio,
  Settings,
  LayoutGrid,
  ChevronLeft,
  Search,
  Gift,
  Mail,
  Users,
  TrendingUp,
  Sparkles,
  Wrench,
  PanelLeft,
} from "lucide-react";
import { ReferralModal } from "@/components/academy/ReferralModal";
import { VaultSearchModal } from "@/components/academy/VaultSearchModal";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { ChatAvatar } from "@/lib/chatAvatars";
import { InboxDrawer } from "@/components/academy/InboxDrawer";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
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
  { icon: Wrench, label: "Trading Toolkit", path: "/academy/resources" },
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
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { inboxUnreadCount, onboarding } = useAcademyData();

  const displayName = profile?.display_name || "Trader";
  const avatarUrl = (profile as any)?.avatar_url || null;
  const profileCompleted = profile && (profile as any).profile_completed;
  const onboardingComplete = profileCompleted && onboarding?.claimed_role;

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-white/[0.04]" style={{ background: '#0B0F14' }}>
      <SidebarContent>
        {/* Vault V toggle */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {collapsed ? (
                      <button
                        onClick={toggleSidebar}
                        aria-label="Open sidebar"
                        className="group/toggle relative flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-[150ms] hover:bg-white/[0.06] hover:shadow-[0_0_12px_rgba(59,130,246,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <img
                          src={vaultVLogo}
                          alt=""
                          className="absolute inset-0 m-auto h-[20px] w-[20px] object-contain transition-all duration-[180ms] opacity-100 scale-100 group-hover/toggle:opacity-0 group-hover/toggle:scale-[0.98]"
                        />
                        <PanelLeft
                          className="absolute inset-0 m-auto h-[18px] w-[18px] text-muted-foreground transition-all duration-[180ms] opacity-0 scale-[0.98] group-hover/toggle:opacity-100 group-hover/toggle:scale-100"
                        />
                      </button>
                    ) : (
                      <button
                        onClick={toggleSidebar}
                        aria-label="Collapse sidebar"
                        className="flex items-center w-full justify-between px-2 h-11 rounded-xl transition-colors duration-[120ms] hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <span className="flex items-center gap-2">
                          <img src={vaultVLogo} alt="" className="h-[26px] w-[26px] object-contain shrink-0" />
                          <span className="text-sm font-semibold text-foreground tracking-tight">Vault</span>
                        </span>
                        <ChevronLeft className="h-4 w-4 text-muted-foreground transition-transform duration-[120ms]" />
                      </button>
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs flex items-center gap-2">
                    {collapsed ? "Open sidebar" : "Collapse sidebar"}
                    <kbd className="text-[10px] text-muted-foreground/60 bg-white/[0.03] border border-white/[0.04] rounded px-1 py-0.5 font-mono">⌘B</kbd>
                  </TooltipContent>
                </Tooltip>
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
                  className="group/search flex items-center gap-2 w-full rounded-[10px] bg-white/[0.03] border border-white/[0.04] px-2.5 py-2 h-10 transition-colors duration-[120ms] ease-out hover:bg-[#131922] focus-visible:bg-[#131922] focus-visible:border-primary/40 focus-visible:outline-none"
                >
                  <Search className="h-4 w-4 shrink-0 text-[#8B949E] group-focus-visible/search:text-[#E6EDF3] transition-opacity duration-[120ms]" />
                  {!collapsed && (
                    <span className="flex items-center justify-between w-full text-sm text-[#8B949E]">
                      Search
                      <kbd className="ml-auto text-[10px] text-[#8B949E]/60 bg-white/[0.03] border border-white/[0.04] rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
                    </span>
                  )}
                </button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Main nav */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] tracking-[0.08em] uppercase text-[#8B949E]/60">{!collapsed && "Nav"}</SidebarGroupLabel>
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
                      activeClassName="bg-[#151C26] text-primary font-medium border-l-[3px] border-l-primary"
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
                      <div className="mx-2 my-3 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
                      <SidebarMenuButton asChild>
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent("toggle-coach-drawer"))}
                          className="ask-coach-btn flex items-center gap-2 px-3 py-2 w-full rounded-xl text-left transition-colors duration-150 hover:brightness-110 active:scale-[0.98]"
                          style={{
                            background: "#3B82F6",
                            color: "#fff",
                          }}
                        >
                          {/* SVG gradient def for sparkle icon */}
                          <svg width="0" height="0" className="absolute">
                            <defs>
                              <linearGradient id="coach-sparkle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#FDE68A" />
                                <stop offset="50%" stopColor="#FBBF24" />
                                <stop offset="100%" stopColor="#F472B6" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <Icon
                            className="h-4 w-4 shrink-0"
                            style={{
                              strokeWidth: 2.2,
                              fill: "url(#coach-sparkle-grad)",
                              stroke: "url(#coach-sparkle-grad)",
                              filter: "drop-shadow(0 0 3px rgba(251,191,36,0.35)) drop-shadow(0 0 6px rgba(244,114,182,0.2))",
                            }}
                          />
                          {!collapsed && <span className="text-sm font-semibold tracking-[-0.01em]">{label}</span>}
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
                        className={`group/nav relative flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors duration-150 text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#131922]`}
                        activeClassName="!text-[#E6EDF3] !bg-[#151C26] font-medium border-l-[3px] border-l-[#3B82F6]"
                      >
                        <span className="relative flex items-center gap-2.5">
                          <Icon className={`h-4 w-4 shrink-0${isLive ? ' text-[hsl(217,92%,68%)]' : ''}`} style={{ strokeWidth: active ? 2.2 : 1.8 }} />
                          {!collapsed && <span className="text-sm">{label}</span>}
                        </span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Bottom Dock */}
      <SidebarFooter className="mt-auto px-2.5 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: '#0B0F14' }}>
        {/* Share Vault Card */}
        {!collapsed && (
          <button
            onClick={() => setReferralOpen(true)}
            className="group w-full text-left rounded-2xl px-4 py-3.5 mb-1.5 active:scale-[0.98] share-vault-glow"
            style={{ background: '#0F1319' }}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[16px] font-semibold text-[#E6EDF3] leading-tight">Share Vault</p>
                <p className="text-[13px] text-[#8B949E] mt-0.5">Earn rewards for invites</p>
              </div>
              <div className="shrink-0 flex items-center justify-center h-9 w-9 rounded-full bg-white/[0.04] border border-white/[0.04] group-hover:bg-white/[0.06] transition-colors duration-150">
                <Gift className="h-4 w-4 text-[#8B949E]" />
              </div>
            </div>
          </button>
        )}

        {/* Icon Dock */}
        <div className={`flex items-center w-full py-1.5 ${collapsed ? 'justify-center px-0' : 'justify-between px-3'}`}>
          {/* Profile */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate("/academy/settings")}
                aria-label="Profile"
                className="sidebar-dock-btn relative shrink-0 h-9 w-9 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="h-9 w-9 rounded-full overflow-hidden bg-white/[0.04] border border-white/[0.06]">
                  <ChatAvatar avatarUrl={avatarUrl} userName={displayName} size="h-9 w-9" />
                </div>
                <span className="absolute -bottom-px -right-px h-[10px] w-[10px] rounded-full bg-emerald-500 ring-[2px] ring-[#0B0F14]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Profile</TooltipContent>
          </Tooltip>

          {/* Inbox — hidden when collapsed */}
          {!collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  data-inbox-trigger
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleInboxChange(!inboxOpen);
                  }}
                  aria-label="Inbox"
                  className="sidebar-dock-btn relative flex items-center justify-center h-9 w-9 rounded-full bg-white/[0.04] border border-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Mail className="h-[18px] w-[18px] text-[#8B949E]" />
                  {inboxUnreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-[16px] min-w-[16px] px-0.5 rounded-full bg-[#3B82F6] text-white text-[9px] font-bold leading-none">
                      {inboxUnreadCount > 99 ? "99+" : inboxUnreadCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Inbox</TooltipContent>
            </Tooltip>
          )}
        </div>

        <InboxDrawer open={inboxOpen} onOpenChange={handleInboxChange} />
        <ReferralModal open={referralOpen} onOpenChange={setReferralOpen} />
        <VaultSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
      </SidebarFooter>
    </Sidebar>
  );
}
