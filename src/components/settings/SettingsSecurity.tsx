import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LogOut, Mail, KeyRound, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function SettingsSecurity() {
  const { user, signOut, refetchProfile } = useAuth();
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);

  const handleResetPassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.functions.invoke("ghl-password-reset", {
      body: { email: user.email, origin: window.location.origin },
    });
    if (error) { toast.error("Failed to send reset link."); return; }
    toast.success("Password reset link sent via email and text.");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleResetTradeOS = async () => {
    if (!user) return;
    setResetting(true);
    try {
      // Reset onboarding flag
      await supabase
        .from("profiles")
        .update({ onboarding_completed: false } as any)
        .eq("user_id", user.id);

      // Delete trader_dna
      await (supabase.from("trader_dna" as any) as any)
        .delete()
        .eq("user_id", user.id);

      // Delete vault_state so it gets re-created on next load
      await supabase
        .from("vault_state")
        .delete()
        .eq("user_id", user.id);

      // Delete vault_events for clean slate
      await supabase
        .from("vault_events")
        .delete()
        .eq("user_id", user.id);

      await refetchProfile();
      toast.success("Trade OS reset. Redirecting to onboarding…");
      navigate("/academy/trade");
    } catch {
      toast.error("Reset failed. Try again.");
    } finally {
      setResetting(false);
    }
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

      {/* Reset Trade OS Section */}
      <div className="pt-3 border-t border-border/40">
        <h3 className="text-sm font-semibold text-foreground mb-1">Trade OS</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Reset your entire Trade OS system to start fresh with onboarding.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full gap-2 justify-start text-destructive hover:text-destructive"
              disabled={resetting}
            >
              {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Reset Trade OS
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Trade OS?</AlertDialogTitle>
              <AlertDialogDescription>
                This will erase your vault state, trader DNA, and risk settings. You'll go through the onboarding flow again from scratch. Your trade history and journal entries are preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetTradeOS}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, Reset Everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}
