import { Crown, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AcademyRoleName } from "@/hooks/useAcademyPermissions";

const ROLE_BADGE_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  cls: string;
  iconCls?: string;
}> = {
  CEO: {
    label: "CEO",
    icon: Crown,
    cls: "bg-purple-500/20 text-purple-600 border-purple-500/30",
    iconCls: "text-yellow-500",
  },
  Admin: {
    label: "Admin",
    icon: Shield,
    cls: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  Coach: {
    label: "Coach",
    icon: Zap,
    cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
};

interface AcademyRoleBadgeProps {
  roleName?: string | null;
  className?: string;
}

export function AcademyRoleBadge({ roleName, className }: AcademyRoleBadgeProps) {
  if (!roleName || roleName === "Member") return null;
  const cfg = ROLE_BADGE_CONFIG[roleName];
  if (!cfg) return null;
  const Icon = cfg.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] leading-none px-1.5 py-0.5 rounded font-medium border",
        cfg.cls,
        className
      )}
    >
      <Icon className={cn("h-2.5 w-2.5", cfg.iconCls)} />
      {cfg.label}
    </span>
  );
}
