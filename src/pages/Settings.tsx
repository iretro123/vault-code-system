import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useVaultState } from "@/contexts/VaultStateContext";
import { useTradingRules } from "@/hooks/useTradingRules";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LogOut, User, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { RiskModeSelector } from "@/components/vault/RiskModeSelector";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { user, profile, signOut } = useAuth();
  const { state: vaultState, refetch: refetchVault } = useVaultState();
  const { rules, loading: rulesLoading } = useTradingRules();

  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [accountBalance, setAccountBalance] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Danger zone
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
    }
    if (vaultState.account_balance > 0) {
      setAccountBalance(vaultState.account_balance.toString());
    }
    // Default timezone to browser timezone
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [profile, vaultState.account_balance]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);

    try {
      // Update display name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() || null })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Update account balance if changed
      const newBalance = parseFloat(accountBalance);
      if (!isNaN(newBalance) && newBalance > 0 && newBalance !== vaultState.account_balance) {
        const { error: balanceError } = await supabase.rpc("set_account_balance", {
          _user_id: user.id,
          _balance: newBalance,
        });
        if (balanceError) throw balanceError;
        refetchVault();
      }

      toast({
        title: "Settings saved",
        description: "Your changes have been applied.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResetVault = async () => {
    if (!user || resetConfirm !== "RESET VAULT") return;
    setResetting(true);

    try {
      // Delete trade entries
      const { error: tradesError } = await supabase
        .from("trade_entries")
        .delete()
        .eq("user_id", user.id);
      if (tradesError) throw tradesError;

      // Delete trade intents
      const { error: intentsError } = await supabase
        .from("trade_intents")
        .delete()
        .eq("user_id", user.id);
      if (intentsError) throw intentsError;

      // Delete vault events
      const { error: eventsError } = await supabase
        .from("vault_events")
        .delete()
        .eq("user_id", user.id);
      if (eventsError) throw eventsError;

      // Delete vault daily checklists
      const { error: checklistError } = await supabase
        .from("vault_daily_checklist")
        .delete()
        .eq("user_id", user.id);
      if (checklistError) throw checklistError;

      // Delete vault focus sessions
      const { error: focusError } = await supabase
        .from("vault_focus_sessions")
        .delete()
        .eq("user_id", user.id);
      if (focusError) throw focusError;

      // Reset vault state (re-initialize via RPC with current balance)
      const currentBalance = vaultState.account_balance;
      const { error: stateError } = await supabase
        .from("vault_state")
        .delete()
        .eq("user_id", user.id);
      if (stateError) throw stateError;

      // Re-create vault state with preserved balance
      if (currentBalance > 0) {
        await supabase.rpc("set_account_balance", {
          _user_id: user.id,
          _balance: currentBalance,
        });
      }

      refetchVault();
      setResetConfirm("");

      toast({
        title: "Vault OS Reset",
        description: "Trade logs and vault state have been cleared. Your profile and balance are preserved.",
      });
    } catch (error) {
      console.error("Error resetting vault:", error);
      toast({
        title: "Reset failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <AppLayout>
      <div className="px-4 md:px-6 pt-4">
        <Link to="/cockpit" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Dashboard
        </Link>
      </div>
      <PageHeader title="Settings" subtitle="Manage your account and vault" />

      <div className="px-4 md:px-6 space-y-4 pb-24 max-w-xl mx-auto">
        {/* ─── Profile ─── */}
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
                className="bg-background border-border"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-sm text-muted-foreground">
                Timezone
              </Label>
              <Input
                id="timezone"
                value={timezone}
                readOnly
                className="bg-background border-border text-muted-foreground cursor-default"
              />
              <p className="text-[11px] text-muted-foreground">
                Detected from your browser. Cannot be changed manually.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountBalance" className="text-sm text-muted-foreground">
                Account Balance
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <Input
                  id="accountBalance"
                  type="number"
                  min="0"
                  step="100"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(e.target.value)}
                  placeholder="50000"
                  className="bg-background border-border pl-7 font-mono"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Updates daily loss limits and max contracts.
              </p>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full"
            >
              {savingProfile ? (
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

        {/* ─── Vault Controls ─── */}
        <Card className="vault-card p-4">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Vault Controls
            </span>
          </div>

          <div className="space-y-4">
            {/* Risk Mode */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Change takes effect on next vault recalculation.
              </p>
              <RiskModeSelector />
            </div>

            {/* Default Trading Style */}
            <div className="pt-3 border-t border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
                Default Trading Style
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(["intraday", "multi_day"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={async () => {
                      if (!user) return;
                      await supabase
                        .from("profiles")
                        .update({ default_trading_style: s })
                        .eq("user_id", user.id);
                      toast({ title: "Trading style updated", description: `Set to ${s === "intraday" ? "Intraday" : "Multi-day"}.` });
                    }}
                    className={cn(
                      "px-3 py-2.5 rounded-lg text-sm font-medium border transition-all",
                      profile?.default_trading_style === s
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "bg-muted/10 border-border text-muted-foreground hover:bg-muted/20"
                    )}
                  >
                    {s === "intraday" ? "Intraday" : "Multi-day"}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Sets initial enforcement bias. Vault adapts automatically.
              </p>
            </div>

            {/* Read-only Vault Rules */}
            <div className="pt-3 border-t border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
                Vault Rules (read-only)
              </p>

              {rulesLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 bg-muted/20 rounded w-2/3" />
                  <div className="h-4 bg-muted/20 rounded w-1/2" />
                </div>
              ) : rules ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-lg bg-muted/10 border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Max Risk/Trade</p>
                    <p className="text-sm font-mono font-semibold text-foreground">{rules.max_risk_per_trade}%</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/10 border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Max Daily Loss</p>
                    <p className="text-sm font-mono font-semibold text-foreground">{rules.max_daily_loss}%</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/10 border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Max Trades/Day</p>
                    <p className="text-sm font-mono font-semibold text-foreground">{rules.max_trades_per_day}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/10 border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Sessions</p>
                    <p className="text-sm font-mono font-semibold text-foreground capitalize">
                      {rules.allowed_sessions.join(", ")}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No rules configured yet.</p>
              )}
            </div>
          </div>
        </Card>

        {/* ─── Danger Zone ─── */}
        <Card className="vault-card p-4 border-rose-500/20">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            <span className="text-xs font-medium text-rose-500 uppercase tracking-wide">
              Danger Zone
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Reset Vault OS</p>
              <p className="text-xs text-muted-foreground">
                Clears all trade logs, intents, and vault state. Your profile and account balance are preserved. This action cannot be undone.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resetConfirm" className="text-xs text-muted-foreground">
                Type <span className="font-mono font-semibold text-rose-400">RESET VAULT</span> to confirm
              </Label>
              <Input
                id="resetConfirm"
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                placeholder="RESET VAULT"
                className="bg-background border-border font-mono"
                autoComplete="off"
              />
            </div>

            <Button
              variant="outline"
              onClick={handleResetVault}
              disabled={resetConfirm !== "RESET VAULT" || resetting}
              className="w-full border-rose-500/40 text-rose-500 hover:bg-rose-500/10 disabled:border-border disabled:text-muted-foreground"
            >
              {resetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Vault OS"
              )}
            </Button>
          </div>
        </Card>

        {/* Sign Out */}
        <Button
          variant="outline"
          className="w-full gap-2 h-12 border-border text-muted-foreground hover:text-foreground"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </AppLayout>
  );
}
