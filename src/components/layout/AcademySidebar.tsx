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
  MessageSquare,
  Lock,
  Inbox,
  Mail,
  Gift,
  Copy,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { ACADEMY_ROOMS } from "@/lib/academyRooms";
import { useUnreadAnswers } from "@/hooks/useUnreadAnswers";
import { ChatAvatar } from "@/lib/chatAvatars";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
  const [inboxOpen, setInboxOpen] = useState(false);
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { hasRole, profile } = useAuth();
  const isAdmin = hasRole("operator");
  const { unreadCount: unreadAnswers } = useUnreadAnswers();

  const displayName = profile?.display_name || "Trader";
  const avatarUrl = (profile as any)?.avatar_url || null;

  const isActive = (path: string) => location.pathname === path;
  const isRoomActive = (slug: string) => location.pathname === `/academy/room/${slug}`;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
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

        {/* Main nav */}
        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed && "Academy"}</SidebarGroupLabel>
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
          <SidebarGroupLabel>{!collapsed && "Rooms"}</SidebarGroupLabel>
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
          <SidebarGroupLabel>{!collapsed && "Inbox"}</SidebarGroupLabel>
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
                        {unreadAnswers > 0 && (
                          <span className="flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[hsl(45,90%,50%)] text-[hsl(45,90%,10%)] text-[10px] font-bold leading-none">
                            {unreadAnswers > 9 ? "9+" : unreadAnswers}
                          </span>
                        )}
                      </span>
                    )}
                    {collapsed && unreadAnswers > 0 && (
                      <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-[hsl(45,90%,50%)]" />
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>{!collapsed && "Admin"}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/academy/admin")}>
                    <NavLink
                      to="/academy/admin"
                      end
                      className="flex items-center gap-2 px-2 py-1.5"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm">Admin</span>}
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Utility Footer */}
      <SidebarFooter className="sticky bottom-0 border-t border-border/40 bg-sidebar backdrop-blur-md p-3 space-y-3">
        {/* User Chip */}
        <div className="flex items-center gap-2.5 select-none pointer-events-none">
          <div className="relative shrink-0">
            <ChatAvatar avatarUrl={avatarUrl} userName={displayName} size="h-8 w-8" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-sidebar" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate leading-tight">{displayName}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Vault Academy Member</p>
            </div>
          )}
        </div>

        {/* Inbox Button */}
        <button
          onClick={() => setInboxOpen(true)}
          className="relative flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors w-full text-left"
        >
          <Mail className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <span className="flex items-center gap-1.5">
              Inbox
              {unreadAnswers > 0 && (
                <span className="flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[hsl(45,90%,50%)] text-[hsl(45,90%,10%)] text-[10px] font-bold leading-none">
                  {unreadAnswers > 9 ? "9+" : unreadAnswers}
                </span>
              )}
            </span>
          )}
          {collapsed && unreadAnswers > 0 && (
            <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-[hsl(45,90%,50%)]" />
          )}
        </button>
        <InboxDrawer open={inboxOpen} onOpenChange={setInboxOpen} />

        {/* Refer a Trader Card */}
        {!collapsed && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-semibold text-foreground">Refer a Trader</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Share the Vault with a fellow trader.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin + "/auth");
                toast.success("Referral link copied!");
              }}
            >
              <Copy className="h-3 w-3" />
              Copy Link
            </Button>
          </div>
        )}
        {collapsed && (
          <button
            className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            onClick={() => {
              navigator.clipboard.writeText(window.location.origin + "/auth");
              toast.success("Referral link copied!");
            }}
          >
            <Gift className="h-4 w-4" />
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
