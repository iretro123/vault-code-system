import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { Users, Megaphone, Send, BookOpen, ScrollText, CreditCard } from "lucide-react";
import { AdminMembersTab } from "@/components/admin/AdminMembersTab";
import { AdminAnnouncementsTab } from "@/components/admin/AdminAnnouncementsTab";
import { AdminBroadcastTab } from "@/components/admin/AdminBroadcastTab";
import { AdminContentTab } from "@/components/admin/AdminContentTab";
import { AdminLogsTab } from "@/components/admin/AdminLogsTab";
import { AdminStripeTab } from "@/components/admin/AdminStripeTab";

const TAB_CONFIG = [
  { value: "members", label: "Members", icon: Users, perm: "manage_users" },
  { value: "announcements", label: "Announcements", icon: Megaphone, perm: "manage_notifications" },
  { value: "broadcast", label: "Broadcast", icon: Send, perm: "manage_notifications" },
  { value: "content", label: "Content", icon: BookOpen, perm: "manage_content" },
  { value: "logs", label: "Logs", icon: ScrollText, perm: "view_admin_panel" },
] as const;

const AdminPanel = () => {
  const { hasPermission, loading } = useAcademyPermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const canAccess =
    hasPermission("view_admin_panel") ||
    hasPermission("manage_users") ||
    hasPermission("manage_notifications");

  if (!loading && !canAccess) {
    return <Navigate to="/academy/home" replace />;
  }

  // Filter tabs to only those the user has permission for
  const visibleTabs = TAB_CONFIG.filter((t) => hasPermission(t.perm));
  const activeTab = searchParams.get("tab") || visibleTabs[0]?.value || "members";

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

          {hasPermission("manage_users") && (
            <TabsContent value="members">
              <AdminMembersTab />
            </TabsContent>
          )}
          {hasPermission("manage_notifications") && (
            <TabsContent value="announcements">
              <AdminAnnouncementsTab />
            </TabsContent>
          )}
          {hasPermission("manage_notifications") && (
            <TabsContent value="broadcast">
              <AdminBroadcastTab />
            </TabsContent>
          )}
          {hasPermission("manage_content") && (
            <TabsContent value="content">
              <AdminContentTab />
            </TabsContent>
          )}
          {hasPermission("view_admin_panel") && (
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
