import { useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { useAuth } from "@/hooks/useAuth";
import { Users, Megaphone, Send, BookOpen, ScrollText, CreditCard, UserPlus, ToggleLeft, Loader2 } from "lucide-react";
import { AdminMembersTab } from "@/components/admin/AdminMembersTab";
import { AdminAnnouncementsTab } from "@/components/admin/AdminAnnouncementsTab";
import { AdminBroadcastTab } from "@/components/admin/AdminBroadcastTab";
import { AdminContentTab } from "@/components/admin/AdminContentTab";
import { AdminLogsTab } from "@/components/admin/AdminLogsTab";
import { AdminStripeTab } from "@/components/admin/AdminStripeTab";
import { AdminReferralsTab } from "@/components/admin/AdminReferralsTab";
import { AdminFeatureFlagsTab } from "@/components/admin/AdminFeatureFlagsTab";

const TAB_CONFIG = [
  { value: "members", label: "Members", icon: Users, perm: "manage_users" },
  { value: "announcements", label: "Announcements", icon: Megaphone, perm: "manage_notifications" },
  { value: "broadcast", label: "Broadcast", icon: Send, perm: "manage_notifications" },
  { value: "content", label: "Content", icon: BookOpen, perm: "manage_content" },
  { value: "stripe", label: "Stripe", icon: CreditCard, perm: "view_admin_panel" },
  { value: "referrals", label: "Referrals", icon: UserPlus, perm: "view_admin_panel" },
  { value: "flags", label: "Feature Flags", icon: ToggleLeft, perm: "view_admin_panel" },
  { value: "logs", label: "Logs", icon: ScrollText, perm: "view_admin_panel" },
] as const;

const AdminPanel = () => {
  const { user } = useAuth();
  const { hasPermission, roleName, isOperator, appRoles, loading, resolved } = useAcademyPermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const hasViewAdminPanel = hasPermission("view_admin_panel");
  const hasManageUsers = hasPermission("manage_users");
  const hasManageNotifications = hasPermission("manage_notifications");

  const hasAcademyAdminPermission =
    hasViewAdminPanel || hasManageUsers || hasManageNotifications;

  const canAccess = hasAcademyAdminPermission || roleName === "CEO" || isOperator;

  useEffect(() => {
    if (!user?.id) return;

    const reason = !resolved
      ? "awaiting fresh role resolution"
      : canAccess
        ? hasAcademyAdminPermission
          ? "academy permission granted"
          : roleName === "CEO"
            ? "academy CEO role granted"
            : "operator app role granted"
        : "missing academy admin permission and operator app role";

    console.info("[AdminPanelGuard]", {
      userId: user.id,
      academyRole: roleName,
      appRoles,
      hasViewAdminPanel,
      hasManageUsers,
      hasManageNotifications,
      allow: resolved && canAccess,
      reason,
    });
  }, [
    appRoles,
    canAccess,
    hasAcademyAdminPermission,
    hasManageNotifications,
    hasManageUsers,
    hasViewAdminPanel,
    resolved,
    roleName,
    user?.id,
  ]);

  if ((loading || !resolved) && user?.id) {
    return (
      <AcademyLayout>
        <div className="px-4 md:px-6 py-12 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AcademyLayout>
    );
  }

  if (resolved && !canAccess) {
    return <Navigate to="/academy/home" replace />;
  }

  const visibleTabs = TAB_CONFIG.filter((t) => {
    if (hasPermission(t.perm)) return true;
    if (roleName === "CEO") return true;
    if (isOperator && t.perm === "view_admin_panel") return true;
    return false;
  });

  const requestedTab = searchParams.get("tab");
  const fallbackTab = visibleTabs[0]?.value || "members";
  const activeTab = visibleTabs.some((tab) => tab.value === requestedTab)
    ? (requestedTab as string)
    : fallbackTab;

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <AcademyLayout>
      <PageHeader
        title="Admin Panel"
        subtitle="Manage members, content, and communications"
      />
      <div className="px-4 md:px-6 pb-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="bg-white/[0.03] border border-white/[0.06] p-1 h-auto flex-wrap gap-1">
            {visibleTabs.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="gap-1.5 text-xs data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground px-3 py-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {visibleTabs.some((t) => t.value === "members") && (
            <TabsContent value="members">
              <AdminMembersTab />
            </TabsContent>
          )}
          {visibleTabs.some((t) => t.value === "announcements") && (
            <TabsContent value="announcements">
              <AdminAnnouncementsTab />
            </TabsContent>
          )}
          {visibleTabs.some((t) => t.value === "broadcast") && (
            <TabsContent value="broadcast">
              <AdminBroadcastTab />
            </TabsContent>
          )}
          {visibleTabs.some((t) => t.value === "content") && (
            <TabsContent value="content">
              <AdminContentTab />
            </TabsContent>
          )}
          {visibleTabs.some((t) => t.value === "stripe") && (
            <TabsContent value="stripe">
              <AdminStripeTab />
            </TabsContent>
          )}
          {visibleTabs.some((t) => t.value === "referrals") && (
            <TabsContent value="referrals">
              <AdminReferralsTab />
            </TabsContent>
          )}
          {visibleTabs.some((t) => t.value === "flags") && (
            <TabsContent value="flags">
              <AdminFeatureFlagsTab />
            </TabsContent>
          )}
          {visibleTabs.some((t) => t.value === "logs") && (
            <TabsContent value="logs">
              <AdminLogsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AcademyLayout>
  );
};

export default AdminPanel;
