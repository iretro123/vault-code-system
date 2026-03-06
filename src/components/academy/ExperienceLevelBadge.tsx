import { Sprout, Flame, Crown } from "lucide-react";

const LEVELS: Record<string, { label: string; icon: typeof Sprout; className: string }> = {
  beginner: {
    label: "Beginner",
    icon: Sprout,
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  },
  intermediate: {
    label: "Intermediate",
    icon: Flame,
    className: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  },
  advanced: {
    label: "Advanced",
    icon: Crown,
    className: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  },
};

interface Props {
  level: string | null | undefined;
  size?: "sm" | "md";
}

export function ExperienceLevelBadge({ level, size = "sm" }: Props) {
  const config = LEVELS[(level ?? "").toLowerCase()];
  if (!config) return null;

  const Icon = config.icon;
  const isSmall = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium leading-none ${config.className} ${
        isSmall ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"
      }`}
    >
      <Icon className={isSmall ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {config.label}
    </span>
  );
}
