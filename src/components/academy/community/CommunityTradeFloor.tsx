import { useState } from "react";
import { RoomChat } from "@/components/academy/RoomChat";
import { ThreadDrawer } from "@/components/academy/community/ThreadDrawer";
import { TradeFloorHero } from "@/components/academy/community/TradeFloorHero";
import { CockpitPanel } from "@/components/academy/community/CockpitPanel";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface CommunityTradeFloorProps {
  onSwitchTab?: (tab: string) => void;
  active?: boolean;
}

interface ThreadMessage {
  id: string;
  room_slug: string;
  user_id: string;
  user_name: string;
  body: string;
  created_at: string;
  reply_count: number;
}

export function CommunityTradeFloor({ onSwitchTab, active = true }: CommunityTradeFloorProps) {
  const isMobile = useIsMobile();
  const [threadMessage, setThreadMessage] = useState<ThreadMessage | null>(null);

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Primary Feed */}
      <div className="flex-1 flex flex-col min-w-0">
        <TradeFloorHero />
        <div className="flex-1 overflow-hidden">
          <RoomChat
            key="trade-floor"
            roomSlug="trade-floor"
            canPost={true}
            isAnnouncements={false}
            onThreadOpen={setThreadMessage}
            onSwitchTab={onSwitchTab}
            active={active}
          />
        </div>
      </div>

      {/* Cockpit Panel — structured right rail */}
      {!isMobile && (
        <div className="w-[280px] shrink-0 border-l border-white/[0.05] hidden lg:flex flex-col bg-card">
          <CockpitPanel onSwitchTab={onSwitchTab} />
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
