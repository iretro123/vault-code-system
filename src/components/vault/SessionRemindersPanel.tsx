import React from "react";
import { ShieldCheck, AlertTriangle, ShieldOff, Pause } from "lucide-react";
import { useVaultState } from "@/contexts/VaultStateContext";

export function SessionRemindersPanel() {
  const { state } = useVaultState();

  // Session state takes priority over vault status
  if (state.session_paused) {
    return (
      <div className="vault-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Pause className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">Session Paused</h3>
        </div>
        <p className="text-xs text-muted-foreground ml-6">
          Trading is temporarily blocked. Turn session ON to resume.
        </p>
      </div>
    );
  }

  const config = {
    GREEN: {
      icon: ShieldCheck,
      label: "Session Active",
      text: "You are cleared to trade. Limits are enforced.",
      iconClass: "text-emerald-400",
    },
    YELLOW: {
      icon: AlertTriangle,
      label: "Caution",
      text: "Restrictions increased. Trade carefully.",
      iconClass: "text-amber-400",
    },
    RED: {
      icon: ShieldOff,
      label: "Locked",
      text: "Trading locked. This prevented further losses.",
      iconClass: "text-rose-400",
    },
  }[state.vault_status] ?? {
    icon: ShieldCheck,
    label: "Session",
    text: "Loading...",
    iconClass: "text-muted-foreground",
  };

  const Icon = config.icon;

  return (
    <div className="vault-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${config.iconClass}`} />
        <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
      </div>
      <p className="text-xs text-muted-foreground ml-6">{config.text}</p>
    </div>
  );
}
