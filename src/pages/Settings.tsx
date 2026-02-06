import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LogOut, User, Shield, Bell, Loader2 } from "lucide-react";

export default function Settings() {
  const { user, profile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
    }
    // Fetch username and avatar_url since they might not be in the profile type yet
    if (user) {
      supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setUsername((data as any).username || "");
            setAvatarUrl((data as any).avatar_url || "");
          }
        });
    }
  }, [profile, user]);

  const validateUsername = (value: string) => {
    if (!value) {
      setUsernameError("");
      return true;
    }
    if (!/^[a-z0-9_]+$/.test(value)) {
      setUsernameError("Only lowercase letters, numbers, and underscores allowed");
      return false;
    }
    if (value.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return false;
    }
    if (value.length > 30) {
      setUsernameError("Username must be 30 characters or less");
      return false;
    }
    setUsernameError("");
    return true;
  };

  const handleUsernameChange = (value: string) => {
    const lowercased = value.toLowerCase();
    setUsername(lowercased);
    validateUsername(lowercased);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    if (username && !validateUsername(username)) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || null,
          username: username.trim() || null,
          avatar_url: avatarUrl.trim() || null,
        })
        .eq("user_id", user.id);

      if (error) {
        if (error.code === "23505") {
          setUsernameError("This username is already taken");
          toast({
            title: "Username taken",
            description: "Please choose a different username.",
            variant: "destructive",
          });
        } else if (error.code === "23514") {
          setUsernameError("Only lowercase letters, numbers, and underscores allowed");
          toast({
            title: "Invalid username",
            description: "Username can only contain lowercase letters, numbers, and underscores.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="px-4 md:px-6 pt-4">
        <Link to="/cockpit" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Dashboard
        </Link>
      </div>
      <PageHeader title="Settings" subtitle="Manage your account" />

      <div className="px-4 md:px-6 space-y-4 pb-24">
        {/* Profile */}
        <Card className="vault-card p-4">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Profile
            </span>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm text-muted-foreground">
                Display Name
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                className="bg-background border-white/10"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm text-muted-foreground">
                Username
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  @
                </span>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="username"
                  className="bg-background border-white/10 pl-7"
                  maxLength={30}
                />
              </div>
              {usernameError && (
                <p className="text-xs text-destructive">{usernameError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and underscores only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatarUrl" className="text-sm text-muted-foreground">
                Avatar URL
              </Label>
              <Input
                id="avatarUrl"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="bg-background border-white/10"
                type="url"
              />
            </div>

            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-1">{user?.email}</p>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={saving || !!usernameError}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </Button>
          </div>
        </Card>

        {/* Trading Rules */}
        <Card className="vault-card p-4">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Trading Rules
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your risk limits and discipline rules in the Dashboard.
          </p>
        </Card>

        {/* Notifications placeholder */}
        <Card className="vault-card p-4">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Notifications
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Coming soon — alerts for limit warnings and session reviews.
          </p>
        </Card>

        {/* Sign Out */}
        <Button
          className="vault-cta w-full gap-2 h-12"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </AppLayout>
  );
}
