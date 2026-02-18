import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Home,
  Rocket,
  BookOpen,
  Radio,
  FolderOpen,
  Settings,
  ShieldCheck,
  LayoutGrid,
  Users,
  Lock,
  Inbox,
  Mail,
  Gift,
  Copy,
  Search,
} from "lucide-react";
import { ReferralModal } from "@/components/academy/ReferralModal";
import { VaultSearchModal } from "@/components/academy/VaultSearchModal";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { ACADEMY_ROOMS } from "@/lib/academyRooms";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { ChatAvatar } from "@/lib/chatAvatars";
import { Button } from "@/components/ui/button";
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

const mainNav = [
  { icon: Rocket, label: "Start Here", path: "/academy/start" },
  { icon: Home, label: "Home", path: "/academy/home" },
  { icon: BookOpen, label: "Learn", path: "/academy/learn" },
  { icon: Radio, label: "Live", path: "/academy/live" },
  { icon: FolderOpen, label: "Resources", path: "/academy/resources" },
  { icon: Settings, label: "Settings", path: "/academy/settings" },
];

export function AcademySidebar() {
  const [inboxOpen, setInboxOpen] = useState(() => {
    try { return localStorage.getItem("va_inbox_open") === "true"; } catch { return false; }
  });
  const [referralOpen, setReferralOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Persist inbox panel state
  const handleInboxChange = (open: boolean) => {
    setInboxOpen(open);
    try { localStorage.setItem("va_inbox_open", String(open)); } catch {}
  };
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { hasRole, profile, user } = useAuth();
  const { hasPermission } = useAcademyPermissions();
  const isAdmin = hasRole("operator");
  const showAdminPanel =
    hasPermission("view_admin_panel") ||
    hasPermission("manage_users") ||
    hasPermission("manage_notifications");
  const { inboxUnreadCount, referralStats } = useAcademyData();

  const displayName = profile?.display_name || "Trader";
  const avatarUrl = (profile as any)?.avatar_url || null;

  const isActive = (path: string) => location.pathname === path;
  const isRoomActive = (slug: string) => location.pathname === `/academy/room/${slug}`;

  return (
    <Sidebar collapsible="icon" className="border-r border-white/[0.06]" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}>
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
          <SidebarGroupLabel className="text-[11px] tracking-[0.08em] uppercase opacity-60">{!collapsed && "Academy"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map(({ icon: Icon, label, path }) => {
                const isLive = label === "Live";
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

        {/* Rooms */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] tracking-[0.08em] uppercase opacity-60">{!collapsed && "Rooms"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ACADEMY_ROOMS.map(({ slug, name, icon: Icon, readOnly }) => {
                const isTradingChat = slug === "options-lounge";
                return (
                  <SidebarMenuItem key={slug}>
                    <SidebarMenuButton asChild isActive={isRoomActive(slug)}>
                      <NavLink
                        to={`/academy/room/${slug}`}
                        end
                        className="flex items-center gap-2 px-2 py-1.5"
                        activeClassName="bg-muted text-primary font-medium"
                      >
                        <Icon className={`h-4 w-4 shrink-0${isTradingChat ? " fill-white text-white" : ""}`} />
                        {!collapsed && (
                          <span className="flex items-center gap-1.5 text-sm">
                            {name}
                            {readOnly && <Lock className="h-3 w-3 text-muted-foreground/60" />}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Inbox */}
        {!collapsed && <div className="mx-3 h-px bg-white/[0.06]" />}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] tracking-[0.08em] uppercase opacity-60">{!collapsed && "Inbox"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/academy/my-questions")}>
                  <NavLink
                    to="/academy/my-questions"
                    end
                    className="flex items-center gap-2 px-2 py-1.5"
                    activeClassName="bg-muted text-primary font-medium"
                  >
                    <Inbox className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <span className="flex items-center gap-1.5 text-sm">
                        Inbox: My Questions
                        {inboxUnreadCount > 0 && (
                          <span className="flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[hsl(45,90%,50%)] text-[hsl(45,90%,10%)] text-[10px] font-bold leading-none">
                            {inboxUnreadCount > 9 ? "9+" : inboxUnreadCount}
                          </span>
                        )}
                      </span>
                    )}
                    {collapsed && inboxUnreadCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-[hsl(45,90%,50%)]" />
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin */}
        {(isAdmin || showAdminPanel) && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] tracking-[0.08em] uppercase opacity-60">{!collapsed && "Admin"}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {showAdminPanel && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/academy/admin/panel")}>
                      <NavLink
                        to="/academy/admin/panel"
                        end
                        className="flex items-center gap-2 px-2 py-1.5"
                        activeClassName="bg-muted text-primary font-medium"
                      >
                        <ShieldCheck className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="text-sm">Admin Panel</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {isAdmin && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/academy/admin")}>
                        <NavLink
                          to="/academy/admin"
                          end
                          className="flex items-center gap-2 px-2 py-1.5"
                          activeClassName="bg-muted text-primary font-medium"
                        >
                          <ShieldCheck className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="text-sm">Legacy Admin</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/academy/admin/users")}>
                        <NavLink
                          to="/academy/admin/users"
                          end
                          className="flex items-center gap-2 px-2 py-1.5"
                          activeClassName="bg-muted text-primary font-medium"
                        >
                          <Users className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="text-sm">User Export</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Bottom Dock — pinned footer */}
      <SidebarFooter className="mt-auto border-t border-white/[0.06] p-2.5 space-y-1.5" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.15) 100%)' }}>
        {/* Share Vault Card */}
        {!collapsed && (
          <button
            onClick={() => setReferralOpen(true)}
            className="group w-full text-left rounded-2xl bg-white/[0.05] border border-white/[0.08] px-4 py-3.5 transition-colors duration-[120ms] hover:bg-white/[0.07] hover:border-white/[0.12] active:scale-[0.98]"
            style={{ boxShadow: '0 12px 30px rgba(0,0,0,0.35)' }}
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

        {/* User Identity (not clickable) */}
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 select-none pointer-events-none bg-white/[0.02] border border-white/[0.05] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
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
          className="relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground w-full text-left transition-colors bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.10] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
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
