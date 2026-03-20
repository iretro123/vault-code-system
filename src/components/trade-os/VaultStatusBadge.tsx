import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface VaultStatusBadgeProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; glow: string; bg: string; border: string }> = {
  GREEN: {
    label: "Clear",
    color: "text-emerald-400",
    glow: "shadow-[0_0_20px_rgba(52,211,153,0.2)]",
    bg: "bg-emerald-500/[0.08]",
    border: "border-emerald-500/20",
  },
  YELLOW: {
    label: "Caution",
    color: "text-amber-400",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]",
    bg: "bg-amber-500/[0.08]",
    border: "border-amber-500/20",
  },
  RED: {
    label: "Locked",
    color: "text-red-400",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.2)]",
    bg: "bg-red-500/[0.08]",
    border: "border-red-500/20",
  },
};

export function VaultStatusBadge({ status }: VaultStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.GREEN;

  return (
    <div className={cn("rounded-xl border p-4 flex items-center gap-3", config.bg, config.border, config.glow)}>
      <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl", config.bg, "border", config.border)}>
        <Shield className={cn("h-5 w-5", config.color)} />
      </div>
      <div>
        <p className="text-[9px] text-muted-foreground/50 font-semibold uppercase tracking-wider">Vault Status</p>
        <p className={cn("text-xl font-bold tracking-tight", config.color)}>{config.label}</p>
      </div>
    </div>
  );
}
