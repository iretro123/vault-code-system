import { useState } from "react";
import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AcademyProfileForm } from "@/components/academy/AcademyProfileForm";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAcademyRole } from "@/hooks/useAcademyRole";
import { SendNotificationModal } from "@/components/academy/SendNotificationModal";

const AcademySettings = () => {
  const { signOut } = useAuth();
  const { isAdmin } = useAcademyRole();
  const [motivationOpen, setMotivationOpen] = useState(false);

  return (
    <AcademyLayout>
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />
      <div className="px-4 md:px-6 pb-6 max-w-lg">
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className={`grid w-full ${isAdmin ? "grid-cols-3" : "grid-cols-2"}`}>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
          </TabsList>

          <TabsContent value="profile">
            <AcademyProfileForm />
          </TabsContent>

          <TabsContent value="account" className="space-y-4">
            <Button
              variant="outline"
              className="w-full gap-2 h-12 border-border text-muted-foreground hover:text-foreground"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Admin Actions</h3>
                <Button
                  variant="outline"
                  className="w-full gap-2 h-12 border-border text-muted-foreground hover:text-foreground"
                  onClick={() => setMotivationOpen(true)}
                >
                  <Sparkles className="h-4 w-4" />
                  Send Motivation
                </Button>
                <SendNotificationModal
                  open={motivationOpen}
                  onClose={() => setMotivationOpen(false)}
                  defaultType="motivation"
                  defaultTitle=""
                />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AcademyLayout>
  );
};

export default AcademySettings;
