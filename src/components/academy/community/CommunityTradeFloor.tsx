import { useState } from "react";
import { RoomChat } from "@/components/academy/RoomChat";
import { ThreadDrawer } from "@/components/academy/community/ThreadDrawer";
import { TradeFloorHero } from "@/components/academy/community/TradeFloorHero";
import { CockpitPanel } from "@/components/academy/community/CockpitPanel";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export function CommunityTradeFloor() {
  const isMobile = useIsMobile();
  const [threadMessage, setThreadMessage] = useState<any>(null);

  return (
    <div className="flex h-full overflow-hidden bg-[hsl(220,10%,90%)]">
      {/* Primary Feed — 70% */}
      <div className="flex-1 flex flex-col min-w-0">
        <TradeFloorHero />
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

      {/* Cockpit Panel — 30%, fixed, no scroll */}
      {!isMobile && (
        <div className="w-[280px] shrink-0 border-l border-[hsl(220,10%,82%)] hidden lg:flex flex-col bg-[hsl(220,10%,95%)]">
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
