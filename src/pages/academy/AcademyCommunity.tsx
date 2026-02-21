import { useState } from "react";
import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { cn } from "@/lib/utils";
import { CommunityTradeFloor } from "@/components/academy/community/CommunityTradeFloor";
import { CommunityAnnouncements } from "@/components/academy/community/CommunityAnnouncements";
import { CommunityWins } from "@/components/academy/community/CommunityWins";

const TABS = [
  { key: "trade-floor", label: "Trade Floor" },
  { key: "announcements", label: "Announcements" },
  { key: "wins", label: "Wins & Proof" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const AcademyCommunity = () => {
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const saved = localStorage.getItem("vault_community_tab");
    return (saved as TabKey) || "trade-floor";
  });

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    localStorage.setItem("vault_community_tab", tab);
  };

  return (
    <AcademyLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        {/* Tab Navigation — Premium segmented control */}
        <div className="shrink-0 flex justify-center pt-5 pb-3 px-4">
          <div className="inline-flex items-center gap-0.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-1.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  "relative px-8 py-3 text-[16px] font-semibold rounded-xl transition-all duration-100 tracking-[-0.01em]",
                  activeTab === tab.key
                    ? "text-foreground bg-white/[0.07] shadow-[0_2px_12px_rgba(0,0,0,0.25)]"
                    : "text-white/25 hover:text-white/45"
                )}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-full bg-primary/70 shadow-[0_0_10px_3px_hsl(217_91%_60%/0.25)]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "trade-floor" && <CommunityTradeFloor />}
          {activeTab === "announcements" && <CommunityAnnouncements />}
          {activeTab === "wins" && <CommunityWins />}
        </div>
      </div>
    </AcademyLayout>
  );
};

export default AcademyCommunity;
