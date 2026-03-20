import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface VaultStatusBadgeProps {
  status: string;
  hero?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; glow: string; bg: string; border: string; glowClass: string }> = {
  GREEN: {
    label: "Clear",
    color: "text-emerald-400",
    glow: "shadow-[0_0_20px_hsla(160,84%,39%,0.15)]",
    bg: "bg-emerald-500/[0.06]",
    border: "border-emerald-500/15",
    glowClass: "vault-hero-glow--green",
  },
  YELLOW: {
    label: "Caution",
    color: "text-amber-400",
    glow: "shadow-[0_0_20px_hsla(38,92%,50%,0.15)]",
    bg: "bg-amber-500/[0.06]",
    border: "border-amber-500/15",
    glowClass: "vault-hero-glow--amber",
  },
  RED: {
    label: "Locked",
    color: "text-red-400",
    glow: "shadow-[0_0_20px_hsla(0,72%,51%,0.15)]",
    bg: "bg-red-500/[0.06]",
    border: "border-red-500/15",
    glowClass: "vault-hero-glow--red",
  },
};

export function VaultStatusBadge({ status, hero = false }: VaultStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.GREEN;

  if (hero) {
    return (
      <div className={cn(
        "vault-hero-glow rounded-2xl border p-5 flex items-center justify-center gap-4",
        config.bg, config.border, config.glow, config.glowClass,
      )}
        style={{
          background: `radial-gradient(ellipse 80% 120px at 50% 0%, ${
            status === "GREEN" ? "hsla(160,84%,39%,0.08)" :
            status === "YELLOW" ? "hsla(38,92%,50%,0.08)" :
            "hsla(0,72%,51%,0.08)"
          }, transparent 70%)`,
        }}
      >
        <div className={cn(
          "flex items-center justify-center w-12 h-12 rounded-2xl border",
          config.bg, config.border,
        )}
          style={{
            boxShadow: `0 0 16px ${
              status === "GREEN" ? "hsla(160,84%,39%,0.15)" :
              status === "YELLOW" ? "hsla(38,92%,50%,0.15)" :
              "hsla(0,72%,51%,0.15)"
            }`,
          }}
        >
          <Shield className={cn("h-6 w-6", config.color)} />
        </div>
        <div className="text-center">
          <p className="text-[9px] text-muted-foreground/40 font-semibold uppercase tracking-[0.15em]">Vault Status</p>
          <p className={cn("text-2xl font-bold tracking-tight", config.color)}>{config.label}</p>
        </div>
      </div>
    );
  }

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
