import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { useAuth } from "@/hooks/useAuth";
import { Users, Megaphone, Send, BookOpen, ScrollText, CreditCard, UserPlus, ToggleLeft, Loader2, MessageSquare, ShieldCheck, Activity, LockKeyhole } from "lucide-react";
import { AdminMembersTab } from "@/components/admin/AdminMembersTab";
import { AdminAnnouncementsTab } from "@/components/admin/AdminAnnouncementsTab";
import { AdminBroadcastTab } from "@/components/admin/AdminBroadcastTab";
import { AdminContentTab } from "@/components/admin/AdminContentTab";
import { AdminLogsTab } from "@/components/admin/AdminLogsTab";
import { AdminStripeTab } from "@/components/admin/AdminStripeTab";
import { AdminReferralsTab } from "@/components/admin/AdminReferralsTab";
import { AdminFeatureFlagsTab } from "@/components/admin/AdminFeatureFlagsTab";
import { AdminDMsTab } from "@/components/admin/AdminDMsTab";
import "./admin-panel.css";

const TAB_CONFIG = [
  { value: "members", label: "Members", detail: "Access, roles and accounts", icon: Users, perm: "manage_users" },
  { value: "dms", label: "DMs", detail: "Member conversations", icon: MessageSquare, perm: "manage_notifications" },
  { value: "announcements", label: "Announcements", detail: "In-app updates", icon: Megaphone, perm: "manage_notifications" },
  { value: "broadcast", label: "Broadcast", detail: "Push, SMS and email", icon: Send, perm: "manage_notifications" },
  { value: "content", label: "Content", detail: "Academy library", icon: BookOpen, perm: "manage_content" },
  { value: "stripe", label: "Stripe", detail: "Billing and access", icon: CreditCard, perm: "view_admin_panel" },
  { value: "referrals", label: "Referrals", detail: "Invites and rewards", icon: UserPlus, perm: "view_admin_panel" },
  { value: "flags", label: "Feature Flags", detail: "Release controls", icon: ToggleLeft, perm: "view_admin_panel" },
  { value: "logs", label: "Logs", detail: "Security audit trail", icon: ScrollText, perm: "view_admin_panel" },
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
      <>
        <div className="px-4 md:px-6 py-12 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </>
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

  const activeConfig = visibleTabs.find((tab) => tab.value === activeTab) || visibleTabs[0];

  return (
    <main className="vault-admin-shell">
      <section className="vault-admin-hero" aria-labelledby="vault-admin-title">
        <div className="vault-admin-hero-copy">
          <div className="vault-admin-kicker"><ShieldCheck aria-hidden="true" /> Secure operations</div>
          <h1 id="vault-admin-title">Vault Command</h1>
          <p>Run the Academy, communicate with members, and monitor access from one focused workspace.</p>
        </div>
        <div className="vault-admin-status" aria-label="Admin workspace status">
          <div><span className="vault-admin-status-dot" /><strong>Systems live</strong></div>
          <div><LockKeyhole aria-hidden="true" /><span>{roleName || (isOperator ? "Operator" : "Admin")} access</span></div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="vault-admin-workspace">
        <div className="vault-admin-nav-wrap">
          <TabsList className="vault-admin-nav" aria-label="Admin tools">
            {visibleTabs.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="vault-admin-nav-item"
              >
                <span className="vault-admin-nav-icon"><Icon aria-hidden="true" /></span>
                <span>{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <section className="vault-admin-stage">
          <header className="vault-admin-section-header">
            <div>
              <span className="vault-admin-section-label"><Activity aria-hidden="true" /> Control module</span>
              <h2>{activeConfig?.label}</h2>
              <p>{activeConfig?.detail}</p>
            </div>
            <span className="vault-admin-secure-pill"><LockKeyhole aria-hidden="true" /> Admin only</span>
          </header>

          {visibleTabs.some((t) => t.value === "members") && (
            <TabsContent value="members" className="vault-admin-panel-content">
              <AdminMembersTab />
            </TabsContent>
          )}
          {visibleTabs.some((t) => t.value === "dms") && (
            <TabsContent value="dms" className="vault-admin-panel-content">
              <AdminDMsTab />
            </TabsContent>
          )}
          {visibleTabs.some((t) => t.value === "announcements") && (
            <TabsContent value="announcements" className="vault-admin-panel-content">
              <AdminAnnouncementsTab />
            </TabsContent>
          )}
          {visibleTabs.some((t) => t.value === "broadcast") && (
            <TabsContent value="broadcast" className="vault-admin-panel-content">
              <AdminBroadcastTab />
            </TabsContent>
          )}
          {visibleTabs.some((t) => t.value === "content") && (
            <TabsContent value="content" className="vault-admin-panel-content">
              <AdminContentTab />
            </TabsContent>
          )}
          {visibleTabs.some((t) => t.value === "stripe") && (
            <TabsContent value="stripe" className="vault-admin-panel-content">
              <AdminStripeTab />
            </TabsContent>
          )}
          {visibleTabs.some((t) => t.value === "referrals") && (
            <TabsContent value="referrals" className="vault-admin-panel-content">
              <AdminReferralsTab />
            </TabsContent>
          )}
          {visibleTabs.some((t) => t.value === "flags") && (
            <TabsContent value="flags" className="vault-admin-panel-content">
              <AdminFeatureFlagsTab />
            </TabsContent>
          )}
          {visibleTabs.some((t) => t.value === "logs") && (
            <TabsContent value="logs" className="vault-admin-panel-content">
              <AdminLogsTab />
            </TabsContent>
          )}
        </section>
      </Tabs>
    </main>
  );
};

export default AdminPanel;
