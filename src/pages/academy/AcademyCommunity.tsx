import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CommunityTradeFloor } from "@/components/academy/community/CommunityTradeFloor";
import { RoomChat } from "@/components/academy/RoomChat";
import { AdminActionBar } from "@/components/admin/AdminActionBar";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { useUnreadCounts, formatBadge } from "@/hooks/useUnreadCounts";
import { useAuth } from "@/hooks/useAuth";

const TABS = [
  { key: "trade-floor", label: "Chat", roomSlug: "trade-floor" },
  { key: "daily-setups", label: "Signals", roomSlug: "daily-setups" },
  { key: "wins", label: "Wins", roomSlug: "wins-proof" },
  { key: "announcements", label: "Announcements", roomSlug: "announcements" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const AcademyCommunity = () => {
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const saved = localStorage.getItem("vault_community_tab");
    return (saved as TabKey) || "trade-floor";
  });
  const { isCEO, isAdmin, isOperator } = useAcademyPermissions();
  const canPostRestricted = isCEO || isAdmin || isOperator;
  const { session } = useAuth();
  const userId = session?.user?.id || null;

  const activeRoomSlug = TABS.find((t) => t.key === activeTab)?.roomSlug || "trade-floor";
  const { counts, markRead } = useUnreadCounts(activeRoomSlug, userId);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    localStorage.setItem("vault_community_tab", tab);
    const slug = TABS.find((t) => t.key === tab)?.roomSlug;
    if (slug) markRead(slug);
  };

  // Mark initial tab as read on mount
  useEffect(() => {
    const slug = TABS.find((t) => t.key === activeTab)?.roomSlug;
    if (slug && userId) markRead(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden bg-background">
        <div className="flex flex-col flex-1 m-3 rounded-2xl overflow-hidden border border-white/[0.05] bg-card shadow-[0_6px_32px_rgba(0,0,0,0.35)]">
          <div className="shrink-0 px-4 pt-1">
            <AdminActionBar
              title="Community Admin"
              permission="moderate_chat"
              actions={[
                { label: "Lock Room", disabled: true },
                { label: "Pin Message", disabled: true },
              ]}
            />
          </div>

          <div className="shrink-0 px-4 pt-1">
            <div className="flex w-full items-center justify-center gap-0 border-b border-white/[0.06]">
              {TABS.map((tab) => {
                const count = counts[tab.roomSlug] || 0;
                const badge = formatBadge(count);
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={cn(
                      "relative flex-1 md:flex-none whitespace-nowrap px-2 md:px-6 pb-2.5 pt-1.5 text-[11px] md:text-[12px] font-semibold tracking-wide transition-colors duration-150",
                      activeTab === tab.key
                        ? "text-foreground after:absolute after:bottom-0 after:inset-x-2 after:h-[2px] after:rounded-full after:bg-primary after:shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                        : "text-muted-foreground hover:text-foreground/80"
                    )}
                  >
                    {tab.label}
                    {badge && activeTab !== tab.key && (
                      <span className="ml-1 inline-flex items-center justify-center min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold leading-none ring-1 ring-red-500/20 align-middle">
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative pb-3">
            <div className={cn("absolute inset-0", activeTab === "trade-floor" ? "block" : "hidden")}>
              <CommunityTradeFloor onSwitchTab={handleTabChange} />
            </div>
            <div className={cn("absolute inset-0", activeTab === "announcements" ? "block" : "hidden")}>
              <RoomChat roomSlug="announcements" canPost={canPostRestricted} isAnnouncements={true} active={activeTab === "announcements"} compact />
            </div>
            <div className={cn("absolute inset-0", activeTab === "daily-setups" ? "block" : "hidden")}>
              <RoomChat roomSlug="daily-setups" canPost={canPostRestricted} isAnnouncements={false} active={activeTab === "daily-setups"} compact />
            </div>
            <div className={cn("absolute inset-0", activeTab === "wins" ? "block" : "hidden")}>
              <RoomChat key="wins-proof" roomSlug="wins-proof" canPost={true} isAnnouncements={false} active={activeTab === "wins"} compact />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AcademyCommunity;
