import { useState } from "react";
import { RoomChat } from "@/components/academy/RoomChat";
import { ThreadDrawer } from "@/components/academy/community/ThreadDrawer";
import { TradeFloorHero } from "@/components/academy/community/TradeFloorHero";
import { CockpitPanel } from "@/components/academy/community/CockpitPanel";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface CommunityTradeFloorProps {
  onSwitchTab?: (tab: string) => void;
}

export function CommunityTradeFloor({ onSwitchTab }: CommunityTradeFloorProps) {
  const isMobile = useIsMobile();
  const [threadMessage, setThreadMessage] = useState<any>(null);

  return (
    <div className="flex h-full overflow-hidden bg-[hsl(220,15%,93%)]">
      {/* Primary Feed */}
      <div className="flex-1 flex flex-col min-w-0">
        <TradeFloorHero />
        {/* Focus reminder — pinned at top of feed */}
        <div className="shrink-0 flex items-center gap-2 px-5 py-1.5 bg-[hsl(220,16%,96%)] border-b border-[hsl(220,12%,88%)]">
          <span className="text-[10px] text-[hsl(220,10%,48%)] uppercase tracking-wider font-bold bg-[hsl(220,14%,91%)] px-2 py-0.5 rounded">Focus</span>
          <p className="text-[12px] text-[hsl(220,10%,44%)] font-medium">Wait for confirmation before entering.</p>
        </div>
        <div className="flex-1 overflow-hidden">
          <RoomChat
            key="trade-floor"
            roomSlug="trade-floor"
            canPost={true}
            isAnnouncements={false}
            onThreadOpen={setThreadMessage}
            onSwitchTab={onSwitchTab}
          />
        </div>
      </div>

      {/* Cockpit Panel — structured right rail */}
      {!isMobile && (
        <div className="w-[280px] shrink-0 border-l border-[hsl(220,12%,84%)] hidden lg:flex flex-col bg-[hsl(220,14%,89%)]">
          <CockpitPanel />
        </div>
      )}

      {/* Thread Drawer */}
      {threadMessage && (
        <div className={cn(
          "shrink-0 border-l border-white/[0.05] overflow-hidden",
          isMobile
            ? "absolute inset-y-0 right-0 z-30 w-80 bg-background shadow-2xl"
            : "w-80"
        )}>
          <ThreadDrawer
            parentMessage={threadMessage}
            onClose={() => setThreadMessage(null)}
          />
        </div>
      )}

      {/* Mobile backdrop */}
      {isMobile && threadMessage && (
        <div
          className="fixed inset-0 z-20 bg-black/50"
          onClick={() => setThreadMessage(null)}
        />
      )}
    </div>
  );
}
