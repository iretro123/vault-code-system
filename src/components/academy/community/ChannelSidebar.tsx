import { useState } from "react";
import { CHANNELS, type Channel } from "@/lib/academyChannels";
import { cn } from "@/lib/utils";
import { ChevronDown, Search, X } from "lucide-react";

interface ChannelSidebarProps {
  activeSlug: string;
  onSelect: (slug: string) => void;
  unreadMap?: Record<string, number>;
  onClose?: () => void;
}

export function ChannelSidebar({ activeSlug, onSelect, unreadMap = {}, onClose }: ChannelSidebarProps) {
  const [showMore, setShowMore] = useState(false);
  const [search, setSearch] = useState("");

  const mainChannels = CHANNELS.filter((c) => !c.collapsed);
  const moreChannels = CHANNELS.filter((c) => c.collapsed);

  const filterChannels = (list: Channel[]) =>
    search ? list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())) : list;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-foreground tracking-tight">Channels</h2>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-md text-white/40 hover:text-white/70 md:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-white/30 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search channels"
            className="bg-transparent text-xs text-white/80 placeholder:text-white/30 outline-none flex-1"
          />
        </div>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        {filterChannels(mainChannels).map((ch) => (
          <ChannelItem
            key={ch.slug}
            channel={ch}
            active={activeSlug === ch.slug}
            unread={unreadMap[ch.slug] || 0}
            onClick={() => { onSelect(ch.slug); onClose?.(); }}
          />
        ))}

        {/* More section */}
        {moreChannels.length > 0 && (
          <>
            <button
              onClick={() => setShowMore(!showMore)}
              className="flex items-center gap-1.5 w-full px-2.5 py-1.5 mt-2 text-[11px] font-medium text-white/40 hover:text-white/60 transition-colors"
            >
              <ChevronDown className={cn("h-3 w-3 transition-transform", showMore && "rotate-180")} />
              More
            </button>
            {showMore && filterChannels(moreChannels).map((ch) => (
              <ChannelItem
                key={ch.slug}
                channel={ch}
                active={activeSlug === ch.slug}
                unread={unreadMap[ch.slug] || 0}
                onClick={() => { onSelect(ch.slug); onClose?.(); }}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function ChannelItem({ channel, active, unread, onClick }: {
  channel: Channel;
  active: boolean;
  unread: number;
  onClick: () => void;
}) {
  const Icon = channel.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors group",
        active
          ? "bg-white/[0.08] text-foreground"
          : "text-white/50 hover:bg-white/[0.04] hover:text-white/70"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-white/30 group-hover:text-white/50")} />
      <span className="text-[13px] font-medium flex-1 truncate"># {channel.name}</span>
      {unread > 0 && (
        <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}
