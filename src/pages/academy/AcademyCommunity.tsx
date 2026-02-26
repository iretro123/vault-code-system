import { useState } from "react";
import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { cn } from "@/lib/utils";
import { CommunityTradeFloor } from "@/components/academy/community/CommunityTradeFloor";
import { CommunityAnnouncements } from "@/components/academy/community/CommunityAnnouncements";
import { CommunityWins } from "@/components/academy/community/CommunityWins";
import { AdminActionBar } from "@/components/admin/AdminActionBar";

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
        <div className="shrink-0 px-4 pt-3">
          <AdminActionBar
            title="Community Admin"
            permission="moderate_chat"
            actions={[
              { label: "Lock Room", disabled: true },
              { label: "Pin Message", disabled: true },
            ]}
          />
        </div>
        <div className="shrink-0 flex justify-center pt-4 pb-2 px-4">
          <div className="inline-flex items-center gap-0.5 rounded-xl bg-[hsl(215,25%,8%)] border border-[hsl(217,40%,18%)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_2px_8px_rgba(0,0,0,0.3)]">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  "relative px-6 py-2 text-[13px] font-semibold rounded-lg transition-all duration-100 tracking-[-0.01em]",
                  activeTab === tab.key
                    ? "text-white bg-[hsl(217,40%,16%)] shadow-[0_1px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] border border-[hsl(217,50%,22%)]"
                    : "text-white/30 hover:text-white/55 hover:bg-white/[0.03]"
                )}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-primary/60 shadow-[0_0_8px_2px_hsl(217_91%_60%/0.3)]" />
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
