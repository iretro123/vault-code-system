import React, { useState, useMemo } from "react";
import { useVaultState, RiskModeEnum } from "@/contexts/VaultStateContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { resolveViableRiskMode } from "@/lib/vaultConstants";

const MODES: { value: RiskModeEnum; label: string }[] = [
  { value: "CONSERVATIVE", label: "Conservative" },
  { value: "STANDARD", label: "Standard" },
  { value: "AGGRESSIVE", label: "Aggressive" },
];

export function RiskModeSelector() {
  const { user, profile } = useAuth();
  const { state, refetch } = useVaultState();
  const [updating, setUpdating] = useState(false);
  const [overrideMessage, setOverrideMessage] = useState<string | null>(null);

  const inSafeMode = useMemo(() => {
    if (!profile?.initialized_at) return false;
    const safeModeUntil = new Date(profile.initialized_at).getTime() + 24 * 60 * 60 * 1000;
    return Date.now() < safeModeUntil;
  }, [profile?.initialized_at]);

  // Check if Conservative is viable for current balance
  const conservativeViable = useMemo(() => {
    const resolved = resolveViableRiskMode(state.account_balance, "CONSERVATIVE");
    return !resolved.was_overridden;
  }, [state.account_balance]);

  const handleSelect = async (mode: RiskModeEnum) => {
    if (mode === state.risk_mode || !user || updating) return;
    if (inSafeMode && mode === "AGGRESSIVE") return;

    // Resolve viability — Conservative may be auto-overridden to Standard
    const resolved = resolveViableRiskMode(state.account_balance, mode);
    const effectiveMode = resolved.applied_mode;

    if (resolved.was_overridden) {
      setOverrideMessage(resolved.system_message);
    } else {
      setOverrideMessage(null);
    }

    // Don't call RPC if effective mode is already active
    if (effectiveMode === state.risk_mode) return;

    setUpdating(true);

    try {
      const { error } = await supabase.rpc("update_vault_risk_mode", {
        _user_id: user.id,
        _risk_mode: effectiveMode,
      });

      if (error) {
        console.error("Error updating risk mode:", error);
        toast.error("Failed to update risk mode");
      } else {
        refetch();
      }
    } catch (err) {
      console.error("Risk mode update error:", err);
      toast.error("Failed to update risk mode");
    } finally {
      setUpdating(false);
    }
  };

  const renderButton = (value: RiskModeEnum, label: string) => {
    const isActive = state.risk_mode === value;
    const isConservativeBlocked = value === "CONSERVATIVE" && !conservativeViable;
    const isDisabled = updating || (inSafeMode && value === "AGGRESSIVE") || isConservativeBlocked;
    const needsTooltip = (inSafeMode && value === "AGGRESSIVE") || isConservativeBlocked || state.session_paused;

    const btn = (
      <button
        key={value}
        type="button"
        disabled={isDisabled}
        onClick={() => handleSelect(value)}
        className={cn(
          "relative px-3 py-2 rounded-lg text-xs font-semibold border bg-card",
          isActive && value === "CONSERVATIVE" &&
            "border-emerald-500/50 text-emerald-400 shadow-[0_0_8px_-2px_rgba(16,185,129,0.2)]",
          isActive && value === "STANDARD" &&
            "border-amber-500/50 text-amber-400 shadow-[0_0_8px_-2px_rgba(245,158,11,0.2)]",
          isActive && value === "AGGRESSIVE" &&
            "border-rose-500/50 text-rose-400 shadow-[0_0_8px_-2px_rgba(244,63,94,0.2)]",
          !isActive && !isDisabled &&
            "border-border text-muted-foreground hover:shadow-sm",
          isDisabled && !isActive &&
            "border-border text-muted-foreground/40 cursor-not-allowed"
        )}
      >
        {updating && isActive ? (
          <Loader2 className="h-3 w-3 animate-spin mx-auto" />
        ) : (
          label
        )}
      </button>
    );

    if (needsTooltip) {
      let tooltipText = "";
      if (state.session_paused) {
        tooltipText = "Session is paused. Changes apply when session resumes.";
      } else if (isConservativeBlocked) {
        tooltipText = "Not viable for your account size.";
      } else if (inSafeMode && value === "STANDARD") {
        tooltipText = "Available after next daily reset.";
      } else if (inSafeMode && value === "AGGRESSIVE") {
        tooltipText = "Available after next daily reset.";
      }
      return (
        <Tooltip key={value}>
          <TooltipTrigger asChild>{btn}</TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <React.Fragment key={value}>{btn}</React.Fragment>;
  };

  return (
    <TooltipProvider>
      <div className="space-y-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Risk Mode
        </p>

        <div className="grid grid-cols-3 gap-2">
          {MODES.map(({ value, label }) => renderButton(value, label))}
        </div>

        {overrideMessage && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
            <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-tight">
              {overrideMessage}
            </p>
          </div>
        )}

        {state.risk_mode === "AGGRESSIVE" && !overrideMessage && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-500/90 leading-tight">
              Aggressive mode increases restriction speed. Vault OS will intervene faster.
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
