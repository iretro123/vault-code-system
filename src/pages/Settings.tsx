import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User, Shield, Bell } from "lucide-react";

export default function Settings() {
  const { user, profile, signOut } = useAuth();

  return (
    <AppLayout>
      <PageHeader title="Settings" subtitle="Manage your account" />

      <div className="px-4 md:px-6 space-y-4 pb-24">
        {/* Profile */}
        <Card className="vault-card p-4">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Profile
            </span>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-foreground">
              {profile?.display_name || "Trader"}
            </p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </Card>

        {/* Trading Rules */}
        <Card className="vault-card p-4">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Trading Rules
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage your risk limits and discipline rules in the Cockpit.
          </p>
        </Card>

        {/* Notifications placeholder */}
        <Card className="vault-card p-4">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Notifications
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Coming soon — alerts for limit warnings and session reviews.
          </p>
        </Card>

        {/* Sign Out */}
        <Button
          variant="outline"
          className="vault-cta w-full gap-2"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </AppLayout>
  );
}
