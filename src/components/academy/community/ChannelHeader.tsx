import { getChannelBySlug } from "@/lib/academyChannels";
import { Hash, PanelLeft, PanelRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChannelHeaderProps {
  slug: string;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  leftOpen: boolean;
  rightOpen: boolean;
  memberCount?: number;
}

export function ChannelHeader({ slug, onToggleLeft, onToggleRight, leftOpen, rightOpen, memberCount }: ChannelHeaderProps) {
  const channel = getChannelBySlug(slug);
  if (!channel) return null;

  const Icon = channel.icon;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] shrink-0">
      {/* Left rail toggle */}
      <button
        onClick={onToggleLeft}
        className={cn(
          "p-1.5 rounded-lg transition-colors",
          leftOpen ? "text-white/30 hover:text-white/50" : "text-primary hover:text-primary/80"
        )}
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      {/* Channel info */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <h1 className="text-[15px] font-semibold text-foreground truncate"># {channel.name}</h1>
        <span className="hidden md:block text-xs text-white/30 truncate">{channel.description}</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {memberCount !== undefined && (
          <span className="hidden md:flex items-center gap-1 text-xs text-white/30">
            <Users className="h-3.5 w-3.5" />
            {memberCount}
          </span>
        )}
        <button
          onClick={onToggleRight}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            rightOpen ? "text-white/30 hover:text-white/50" : "text-primary hover:text-primary/80"
          )}
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
