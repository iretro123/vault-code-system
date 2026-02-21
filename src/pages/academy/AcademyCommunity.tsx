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
        {/* Tab Navigation — iOS segmented control */}
        <div className="shrink-0 flex justify-center py-5 px-4">
          <div className="inline-flex items-center gap-1.5 rounded-2xl bg-white/[0.05] border border-white/[0.08] p-1.5 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  "relative px-7 py-3 text-base font-semibold rounded-xl transition-all duration-200 tracking-[-0.01em]",
                  activeTab === tab.key
                    ? "text-foreground bg-white/[0.10] shadow-[0_2px_12px_rgba(0,0,0,0.2)]"
                    : "text-white/35 hover:text-white/55"
                )}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-10 h-[2.5px] rounded-full bg-primary shadow-[0_0_12px_3px_hsl(217_91%_60%/0.35)]" />
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
