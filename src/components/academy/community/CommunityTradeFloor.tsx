import { useState } from "react";
import { RoomChat } from "@/components/academy/RoomChat";
import { ThreadDrawer } from "@/components/academy/community/ThreadDrawer";
import { TradeFloorHeader } from "@/components/academy/community/TradeFloorHeader";
import { SmartReminderBar } from "@/components/academy/community/SmartReminderBar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export function CommunityTradeFloor() {
  const isMobile = useIsMobile();
  const [threadMessage, setThreadMessage] = useState<any>(null);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Center — Feed */}
      <div className="flex-1 flex flex-col min-w-0 max-w-[1000px] mx-auto w-full">
        <TradeFloorHeader />
        <SmartReminderBar />
        <div className="flex-1 overflow-hidden">
          <RoomChat
            key="trade-floor"
            roomSlug="trade-floor"
            canPost={true}
            isAnnouncements={false}
            onThreadOpen={setThreadMessage}
          />
        </div>
      </div>

      {/* Thread Drawer */}
      {threadMessage && (
        <div className={cn(
          "shrink-0 border-l border-white/[0.06] transition-all duration-150 overflow-hidden",
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
