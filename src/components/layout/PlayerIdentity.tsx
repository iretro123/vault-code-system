import { useAuth } from "@/hooks/useAuth";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { AcademyRoleBadge } from "@/components/academy/AcademyRoleBadge";
import { ExperienceLevelBadge } from "@/components/academy/ExperienceLevelBadge";
import { Button } from "@/components/ui/button";
import { ChatAvatar } from "@/lib/chatAvatars";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, HelpCircle, LayoutGrid, ShieldCheck, Eye, PanelTop } from "lucide-react";
import { useAdminMode } from "@/contexts/AdminModeContext";
import { Switch } from "@/components/ui/switch";
import { Link, useNavigate } from "react-router-dom";

export function PlayerIdentity() {
  const { user, profile, loading, signOut } = useAuth();
  const { roleName, isOperator } = useAcademyPermissions();
  const { canToggle, adminModeOn, previewAsMember, toggleAdminMode, togglePreviewAsMember } = useAdminMode();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!user) {
    return (
      <Link to="/auth">
        <Button variant="outline" size="sm" className="h-9">
          Sign in
        </Button>
      </Link>
    );
  }

  const displayName = profile?.display_name || "Trader";
  const email = user.email || "";
  const username = (profile as any)?.username || email.split("@")[0];
  const avatarUrl = (profile as any)?.avatar_url || null;
  const canOpenAdminPanel = roleName === "CEO" || isOperator;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <ChatAvatar avatarUrl={avatarUrl} userName={displayName} size="h-8 w-8" />
          <div className="hidden sm:flex flex-col items-start">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground leading-tight">
                {displayName}
              </span>
              <AcademyRoleBadge roleName={roleName} />
            </div>
            <span className="text-xs text-muted-foreground leading-tight">
              @{username}
            </span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 bg-popover border-border z-50">
        <div className="px-3 py-2.5">
          <p className="text-sm font-medium text-foreground">{displayName}</p>
          <p className="text-xs text-muted-foreground">@{username}</p>
        </div>
        <DropdownMenuSeparator />
        {canToggle && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary/70" />
                <span className="text-sm font-medium">Admin Mode</span>
              </div>
              <Switch checked={adminModeOn} onCheckedChange={toggleAdminMode} className="h-5 w-9" thumbClassName="h-4 w-4 data-[state=checked]:translate-x-4" />
            </div>
            {adminModeOn && (
              <div className="px-3 pb-1 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Preview as Member</span>
                </div>
                <Switch checked={previewAsMember} onCheckedChange={togglePreviewAsMember} className="h-4 w-7" thumbClassName="h-3 w-3 data-[state=checked]:translate-x-3" />
              </div>
            )}
          </>
        )}
        <DropdownMenuSeparator />
        {canOpenAdminPanel && (
          <DropdownMenuItem asChild>
            <Link to="/academy/admin/panel?tab=stripe" className="flex items-center gap-2 cursor-pointer">
              <PanelTop className="h-4 w-4" />
              Admin Panel (temp)
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/academy/settings" className="flex items-center gap-2 cursor-pointer">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/academy/my-questions" className="flex items-center gap-2 cursor-pointer">
            <HelpCircle className="h-4 w-4" />
            Help
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
