import { useLocation } from "react-router-dom";
import {
  Home,
  Rocket,
  BookOpen,
  Radio,
  FolderOpen,
  User,
  ShieldCheck,
  LayoutGrid,
  MessageSquare,
  Lock,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { ACADEMY_ROOMS } from "@/lib/academyRooms";
import {
  Sidebar,
  SidebarContent,
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
  { icon: User, label: "Profile", path: "/academy/profile" },
];

export function AcademySidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("operator");

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
                        className={`flex items-center gap-2 px-2 py-1.5 ${isLive ? "text-[hsl(0,72%,60%)] hover:text-[hsl(0,72%,70%)] hover:drop-shadow-[0_0_6px_hsl(0,72%,50%/0.3)]" : ""}`}
                        activeClassName={isLive ? "bg-muted text-[hsl(0,72%,65%)] font-medium drop-shadow-[0_0_6px_hsl(0,72%,50%/0.25)]" : "bg-muted text-primary font-medium"}
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
              {ACADEMY_ROOMS.map(({ slug, name, icon: Icon, readOnly }) => (
                <SidebarMenuItem key={slug}>
                  <SidebarMenuButton asChild isActive={isRoomActive(slug)}>
                    <NavLink
                      to={`/academy/room/${slug}`}
                      end
                      className="flex items-center gap-2 px-2 py-1.5"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <span className="flex items-center gap-1.5 text-sm">
                          {name}
                          {readOnly && <Lock className="h-3 w-3 text-muted-foreground/60" />}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
