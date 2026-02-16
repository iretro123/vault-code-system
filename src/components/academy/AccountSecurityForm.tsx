import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Status = "idle" | "loading" | "success" | "error";

export function AccountSecurityForm() {
  const { user } = useAuth();

  // Change email
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailStatus, setEmailStatus] = useState<Status>("idle");
  const [emailMsg, setEmailMsg] = useState("");

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<Status>("idle");
  const [pwMsg, setPwMsg] = useState("");

  const handleChangeEmail = async () => {
    if (!user?.email || !newEmail.trim() || !emailPassword) return;
    setEmailStatus("loading");
    setEmailMsg("");

    // Re-authenticate with current password
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: emailPassword,
    });
    if (authErr) {
      setEmailStatus("error");
      setEmailMsg("Incorrect password. Please try again.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) {
      setEmailStatus("error");
      setEmailMsg(error.message);
    } else {
      setEmailStatus("success");
      setEmailMsg("Confirmation email sent to your new address. Check your inbox to complete the change.");
      setNewEmail("");
      setEmailPassword("");
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email || !currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      setPwStatus("error");
      setPwMsg("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPwStatus("error");
      setPwMsg("Password must be at least 8 characters.");
      return;
    }
    setPwStatus("loading");
    setPwMsg("");

    // Re-authenticate
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (authErr) {
      setPwStatus("error");
      setPwMsg("Current password is incorrect.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwStatus("error");
      setPwMsg(error.message);
    } else {
      setPwStatus("success");
      setPwMsg("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="space-y-5">
      {/* Change Email */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Change Email</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Current: <span className="text-foreground">{user?.email || "—"}</span>
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">New Email</Label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setEmailStatus("idle"); }}
              placeholder="newemail@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Current Password</Label>
            <Input
              type="password"
              value={emailPassword}
              onChange={(e) => { setEmailPassword(e.target.value); setEmailStatus("idle"); }}
              placeholder="••••••••"
            />
          </div>
          {emailMsg && (
            <div className={`flex items-start gap-1.5 text-xs ${emailStatus === "success" ? "text-emerald-500" : "text-destructive"}`}>
              {emailStatus === "success" ? <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />}
              <span>{emailMsg}</span>
            </div>
          )}
          <Button
            size="sm"
            onClick={handleChangeEmail}
            disabled={emailStatus === "loading" || !newEmail.trim() || !emailPassword}
            className="gap-1.5"
          >
            {emailStatus === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Update Email
          </Button>
        </div>
      </Card>

      {/* Change Password */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Current Password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setPwStatus("idle"); }}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPwStatus("idle"); }}
              placeholder="••••••••"
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPwStatus("idle"); }}
              placeholder="••••••••"
              minLength={8}
            />
          </div>
          {pwMsg && (
            <div className={`flex items-start gap-1.5 text-xs ${pwStatus === "success" ? "text-emerald-500" : "text-destructive"}`}>
              {pwStatus === "success" ? <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />}
              <span>{pwMsg}</span>
            </div>
          )}
          <Button
            size="sm"
            onClick={handleChangePassword}
            disabled={pwStatus === "loading" || !currentPassword || !newPassword || !confirmPassword}
            className="gap-1.5"
          >
            {pwStatus === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Update Password
          </Button>
        </div>
      </Card>
    </div>
  );
}
