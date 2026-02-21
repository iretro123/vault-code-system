import { useState, useEffect, useRef, useCallback } from "react";
import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { ChannelSidebar } from "@/components/academy/community/ChannelSidebar";
import { ChannelHeader } from "@/components/academy/community/ChannelHeader";
import { RightRail } from "@/components/academy/community/RightRail";
import { ThreadDrawer } from "@/components/academy/community/ThreadDrawer";
import { RoomChat } from "@/components/academy/RoomChat";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const AcademyCommunity = () => {
  const isMobile = useIsMobile();

  // Persist channel selection
  const [activeChannel, setActiveChannel] = useState(() =>
    localStorage.getItem("vault_active_channel") || "trade-floor"
  );
  const [leftOpen, setLeftOpen] = useState(!isMobile);
  const [rightOpen, setRightOpen] = useState(false);
  const [threadMessage, setThreadMessage] = useState<any>(null);

  useEffect(() => {
    localStorage.setItem("vault_active_channel", activeChannel);
  }, [activeChannel]);

  // On mobile, close sidebars when channel changes
  const handleChannelSelect = (slug: string) => {
    setActiveChannel(slug);
    if (isMobile) {
      setLeftOpen(false);
      setRightOpen(false);
    }
    setThreadMessage(null);
  };

  return (
    <AcademyLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* LEFT RAIL — Channel sidebar */}
        <div
          className={cn(
            "shrink-0 border-r border-white/[0.06] bg-white/[0.02] transition-all duration-150 overflow-hidden",
            leftOpen ? "w-56" : "w-0",
            isMobile && leftOpen && "absolute inset-y-0 left-0 z-30 w-64 bg-background shadow-2xl"
          )}
        >
          <ChannelSidebar
            activeSlug={activeChannel}
            onSelect={handleChannelSelect}
            onClose={isMobile ? () => setLeftOpen(false) : undefined}
          />
        </div>

        {/* CENTER — Channel header + message feed + composer */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChannelHeader
            slug={activeChannel}
            onToggleLeft={() => setLeftOpen(!leftOpen)}
            onToggleRight={() => setRightOpen(!rightOpen)}
            leftOpen={leftOpen}
            rightOpen={rightOpen}
          />

          <div className="flex-1 overflow-hidden px-0">
            <RoomChat
              key={activeChannel}
              roomSlug={activeChannel}
              canPost={true}
              isAnnouncements={false}
              onThreadOpen={setThreadMessage}
            />
          </div>
        </div>

        {/* THREAD DRAWER — overlays right rail when open */}
        {threadMessage && (
          <div className={cn(
            "shrink-0 border-l border-white/[0.06] transition-all duration-150 overflow-hidden",
            isMobile ? "absolute inset-y-0 right-0 z-30 w-80 bg-background shadow-2xl" : "w-80"
          )}>
            <ThreadDrawer
              parentMessage={threadMessage}
              onClose={() => setThreadMessage(null)}
            />
          </div>
        )}

        {/* RIGHT RAIL — Details panel (hidden when thread is open) */}
        {!threadMessage && (
          <div
            className={cn(
              "shrink-0 border-l border-white/[0.06] bg-white/[0.02] transition-all duration-150 overflow-hidden",
              rightOpen ? (isMobile ? "absolute inset-y-0 right-0 z-30 w-72 bg-background shadow-2xl" : "w-64") : "w-0"
            )}
          >
            <RightRail
              slug={activeChannel}
              onClose={() => setRightOpen(false)}
            />
          </div>
        )}

        {/* Backdrop for mobile overlays */}
        {isMobile && (leftOpen || rightOpen || threadMessage) && (
          <div
            className="fixed inset-0 z-20 bg-black/50"
            onClick={() => {
              setLeftOpen(false);
              setRightOpen(false);
              setThreadMessage(null);
            }}
          />
        )}
      </div>
    </AcademyLayout>
  );
};

export default AcademyCommunity;
