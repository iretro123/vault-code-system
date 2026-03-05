import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LogOut, Mail, KeyRound } from "lucide-react";
import { toast } from "sonner";

export function SettingsSecurity() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleResetPassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Password reset email sent. Check your inbox.");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <Card className="vault-card p-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Security</h3>
        <p className="text-xs text-muted-foreground">Manage your login and access.</p>
      </div>

      <div className="space-y-4">
        {/* Email row */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/20 border border-border/50">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</p>
            <p className="text-sm text-foreground truncate">{user?.email || "—"}</p>
          </div>
        </div>

        <Button variant="outline" onClick={handleResetPassword} className="w-full gap-2 justify-start">
          <KeyRound className="h-4 w-4" />
          Change Password
        </Button>

        <Button variant="outline" onClick={handleSignOut} className="w-full gap-2 justify-start text-destructive hover:text-destructive">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </Card>
  );
}
