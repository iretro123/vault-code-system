import React, { useState } from "react";
import { useVaultState, RiskModeEnum } from "@/contexts/VaultStateContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const MODES: { value: RiskModeEnum; label: string }[] = [
  { value: "CONSERVATIVE", label: "Conservative" },
  { value: "STANDARD", label: "Standard" },
  { value: "AGGRESSIVE", label: "Aggressive" },
];

export function RiskModeSelector() {
  const { user } = useAuth();
  const { state, refetch } = useVaultState();
  const [updating, setUpdating] = useState(false);

  const handleSelect = async (mode: RiskModeEnum) => {
    if (mode === state.risk_mode || !user || updating) return;
    setUpdating(true);

    try {
      const { error } = await supabase.rpc("update_vault_risk_mode", {
        _user_id: user.id,
        _risk_mode: mode,
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

  return (
    <div className="space-y-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Risk Mode
      </p>

      <div className="grid grid-cols-3 gap-2">
        {MODES.map(({ value, label }) => {
          const isActive = state.risk_mode === value;
          return (
            <button
              key={value}
              type="button"
              disabled={updating}
              onClick={() => handleSelect(value)}
              className={cn(
                "relative px-3 py-2 rounded-lg text-xs font-semibold border bg-card",
                isActive && value === "CONSERVATIVE" &&
                  "border-emerald-500/50 text-emerald-400 shadow-[0_0_8px_-2px_rgba(16,185,129,0.2)]",
                isActive && value === "STANDARD" &&
                  "border-primary/50 text-primary shadow-[0_0_8px_-2px_rgba(59,130,246,0.2)]",
                isActive && value === "AGGRESSIVE" &&
                  "border-rose-500/50 text-rose-400 shadow-[0_0_8px_-2px_rgba(244,63,94,0.2)]",
                !isActive &&
                  "border-border text-muted-foreground hover:shadow-sm"
              )}
            >
              {updating && isActive ? (
                <Loader2 className="h-3 w-3 animate-spin mx-auto" />
              ) : (
                label
              )}
            </button>
          );
        })}
      </div>

      {/* Aggressive warning */}
      {state.risk_mode === "AGGRESSIVE" && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-500/90 leading-tight">
            Aggressive mode increases restriction speed. Vault OS will intervene faster.
          </p>
        </div>
      )}
    </div>
  );
}
