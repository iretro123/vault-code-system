import { useState, useMemo } from "react";
import './academy-navigation.css';
import vaultVLogo from "@/assets/vault-v-logo.png";
import { useUnreadCounts, formatBadge } from "@/hooks/useUnreadCounts";
import { useLocation } from "react-router-dom";
import {
  Home,
  Rocket,
  BookOpen,
  Radio,
  Settings,
  ChevronLeft,
  Search,
  Gift,
  Mail,
  Bell,
  Users,
  TrendingUp,
  Sparkles,
  Wrench,
  PanelLeft,
  EyeOff,
  CalendarCheck,
  LogOut,
  GraduationCap,
} from "lucide-react";

import { VaultSearchModal } from "@/components/academy/VaultSearchModal";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useIsBasicTier } from "@/hooks/useIsBasicTier";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { ChatAvatar } from "@/lib/chatAvatars";
import { InboxDrawer } from "@/components/academy/InboxDrawer";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { isSharedGuestAccount } from "@/lib/membership";
import { disableGuestMode, isGuestMode } from "@/lib/guestMode";
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
  { icon: Home, label: "Dashboard", path: "/academy/home", pageKey: "dashboard" },
  ...(import.meta.env.DEV && ["localhost", "127.0.0.1"].includes(window.location.hostname) ? [{ icon: Wrench, label: "Trading Setup", path: "/academy/setup" }] : []),
  { icon: BookOpen, label: "Learn", path: "/academy/learn", pageKey: "learn" },
  { icon: TrendingUp, label: "Trade OS", path: "/academy/trade", pageKey: "trade" },
  { icon: Users, label: "Community", path: "/academy/community", pageKey: "community" },
  { icon: Radio, label: "Live", path: "/academy/live", isLive: true, pageKey: "live" },
  
  { icon: CalendarCheck, label: "Schedule 1:1", path: "/academy/support", pageKey: "support" },
  { icon: Settings, label: "Settings", path: "/academy/settings" },
  { icon: Sparkles, label: "Ask Coach", path: "__coach__", isCoach: true },
];

const bootcampNav = { icon: GraduationCap, label: "Bootcamp", path: "/academy/bootcamp", pageKey: "bootcamp" };

interface SidebarProfileShape {
  avatar_url?: string | null;
  profile_completed?: boolean | null;
}

export function AcademySidebar() {
  const [inboxOpen, setInboxOpen] = useState(false);
  
  const [searchOpen, setSearchOpen] = useState(false);

  const handleInboxChange = (open: boolean) => {
    setInboxOpen(open);
    try { localStorage.setItem("va_inbox_open", String(open)); } catch { void 0; }
  };
  const { state, toggleSidebar, setOpenMobile, isMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { inboxUnreadCount, onboarding } = useAcademyData();
  const { isPageEnabled } = useFeatureFlags();
  const { roleName, isOperator } = useAcademyPermissions();
  const { isBasicTier } = useIsBasicTier();
  const isAdmin = roleName === "CEO" || isOperator;
  const userId = profile?.user_id || null;
  const { totalUnread } = useUnreadCounts(null, userId);
  const communityBadge = formatBadge(totalUnread);
  const isGuestUser = isSharedGuestAccount(user, profile) || isGuestMode();
  const isLimitedAccessUser = isBasicTier || isGuestUser;
  const showBasicLogout = isGuestUser || isBasicTier;
  const navItems = isLimitedAccessUser
    ? [
        ...coreNav.filter((n) => n.pageKey === "learn"),
        bootcampNav,
        ...coreNav.filter((n) => n.pageKey === "community" || n.path === "/academy/settings"),
      ]
    : coreNav;

  const displayName = profile?.display_name || "Trader";
  const profileData = profile as SidebarProfileShape | null;
  const avatarUrl = profileData?.avatar_url || null;
  const profileCompleted = profileData?.profile_completed;
  const onboardingComplete = profileCompleted && onboarding?.claimed_role;

  const isActive = (path: string) => location.pathname === path;
  const handleGuestLogout = async () => {
    if (isMobile) setOpenMobile(false);
    disableGuestMode();
    window.dispatchEvent(new Event("guest-mode-changed"));
    await signOut();
    navigate("/welcome", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-white/[0.04]" style={{ background: '#0B0F14' }}>
      <SidebarContent className="academy-sidebar-safe-top">
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
                          className="pointer-events-none absolute inset-0 m-auto h-[28px] w-[28px] object-contain transition-all duration-[180ms] opacity-100 scale-[3] group-hover/toggle:opacity-0 group-hover/toggle:scale-[2.9]"
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
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden" aria-hidden="true">
                            <img src={vaultVLogo} alt="" className="h-9 w-9 max-w-none object-contain scale-[3]" />
                          </span>
                          <span className="text-xl font-medium text-foreground tracking-tight">Vault OS</span>
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

        {!isLimitedAccessUser && (
        <SidebarGroup className="hidden md:block">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <button aria-label="Search Vault"
                  onClick={() => { setSearchOpen(true); if (isMobile) setOpenMobile(false); }}
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
        )}

        <nav aria-label="Academy navigation">
          {[
            {title:"Academy",paths:["/academy/home","/academy/learn","/academy/bootcamp","/academy/live","/academy/community"]},
            {title:"Trading tools",paths:["/academy/setup","/academy/trade"]},
            {title:"Support",paths:["__coach__","/academy/support","/academy/settings"]},
          ].map(group=>{
            const items=group.paths.flatMap(path=>navItems.filter(item=>item.path===path)).filter(item=>!item.pageKey||isPageEnabled(item.pageKey)||isAdmin);
            if(!items.length)return null;
            return <SidebarGroup key={group.title} className="vault-nav-group">
              {!collapsed&&<SidebarGroupLabel className="vault-nav-heading">{group.title}</SidebarGroupLabel>}
              <SidebarGroupContent><SidebarMenu className="gap-1">
                {items.map(item=>{
                  const Icon=item.icon;
                  const active=isActive(item.path);
                  const hidden=item.pageKey&&!isPageEnabled(item.pageKey);
                  return <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label} className="vault-nav-row">
                      {item.path==="__coach__"?<button aria-label={item.label} onClick={()=>{
                        if(isMobile){setOpenMobile(false);setTimeout(()=>window.dispatchEvent(new CustomEvent("toggle-coach-drawer")),150);}
                        else window.dispatchEvent(new CustomEvent("toggle-coach-drawer"));
                      }}><Icon aria-hidden="true"/>{!collapsed&&<span>{item.label}</span>}</button>:
                      <NavLink to={item.path} end={item.path==="/academy/home"} aria-label={item.label} onClick={()=>{if(isMobile)setOpenMobile(false);}} activeClassName="vault-nav-selected">
                        <Icon aria-hidden="true" style={item.path === "/academy/live" ? { color: "#60a5fa" } : undefined}/>
                        {!collapsed&&<span className="flex-1">{item.path==="/academy/live"?"Vault Live":item.label}</span>}
                        {item.pageKey==="community"&&communityBadge&&<span className={collapsed?"vault-nav-badge vault-nav-badge-collapsed":"vault-nav-badge"} aria-label={`${totalUnread} unread messages`}>{communityBadge}</span>}
                        {!collapsed&&hidden&&<EyeOff aria-label="Hidden from members" className="!h-3.5 !w-3.5 opacity-50"/>}
                      </NavLink>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>;
                })}
              </SidebarMenu></SidebarGroupContent>
            </SidebarGroup>;
          })}
        </nav>
      </SidebarContent>

      {/* Bottom Dock */}
      <SidebarFooter className="mt-auto px-2.5 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: '#0B0F14' }}>
        {showBasicLogout && !collapsed && (
          <button
            type="button"
            onClick={handleGuestLogout}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-medium text-[#E6EDF3] transition-colors duration-150 hover:bg-[#131922]"
          >
            <LogOut className="h-4 w-4 shrink-0" style={{ strokeWidth: 1.9 }} />
            Log out
          </button>
        )}

        {/* Share Vault Card */}
        {!isBasicTier && !collapsed && (
          <button
            onClick={() => { if (isMobile) setOpenMobile(false); window.dispatchEvent(new CustomEvent("open-referral-modal")); }}
            className="vault-nav-share group w-full text-left rounded-lg px-3 py-2 mb-1 overflow-hidden"
            style={{ background: '#0F1319' }}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[#B8C3D4] leading-tight">Invite friends</p>
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
                onClick={async () => {
                  if (isMobile) setOpenMobile(false);
                  if (isBasicTier) {
                    await signOut();
                    navigate("/create-account", { replace: true });
                  } else {
                    navigate("/academy/settings");
                  }
                }}
                aria-label={isBasicTier ? "Sign out" : "Profile"}
                className="sidebar-dock-btn relative shrink-0 h-9 w-9 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="h-9 w-9 rounded-full overflow-hidden bg-white/[0.04] border border-white/[0.06]">
                  <ChatAvatar avatarUrl={avatarUrl} userName={displayName} size="h-9 w-9" />
                </div>
                <span className="absolute -bottom-px -right-px h-[10px] w-[10px] rounded-full bg-emerald-500 ring-[2px] ring-[#0B0F14]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{isBasicTier ? "Sign out" : "Profile"}</TooltipContent>
          </Tooltip>

          {/* Direct messages open the messenger; announcements remain separate. */}
          {!isBasicTier && !collapsed && <Tooltip><TooltipTrigger asChild>
            <button aria-label="Direct messages" className="sidebar-dock-btn flex items-center justify-center h-9 w-9 rounded-full bg-white/[0.04] border border-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" onClick={() => {
              handleInboxChange(false);
              if (isMobile) setOpenMobile(false);
              navigate('/academy/community/messages?resume=1');
            }}><Mail className="h-[18px] w-[18px] text-[#9BBEFF]" /></button>
          </TooltipTrigger><TooltipContent side="top" className="text-xs">Direct messages</TooltipContent></Tooltip>}

          {/* Notifications — hidden when collapsed */}
          {!isBasicTier && !collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  data-inbox-trigger
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleInboxChange(!inboxOpen);
                  }}
                  aria-label="Notifications"
                  className="sidebar-dock-btn relative flex items-center justify-center h-9 w-9 rounded-full bg-white/[0.04] border border-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Bell className="h-[18px] w-[18px] text-[#8B949E]" />
                  {inboxUnreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-[16px] min-w-[16px] px-0.5 rounded-full bg-[#3B82F6] text-white text-[9px] font-bold leading-none">
                      {inboxUnreadCount > 99 ? "99+" : inboxUnreadCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Notifications</TooltipContent>
            </Tooltip>
          )}
        </div>

        <InboxDrawer open={inboxOpen} onOpenChange={handleInboxChange} />
        
        <VaultSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
      </SidebarFooter>
    </Sidebar>
  );
}
