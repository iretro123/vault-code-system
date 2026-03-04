import { useState } from "react";
import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { cn } from "@/lib/utils";
import { CommunityTradeFloor } from "@/components/academy/community/CommunityTradeFloor";
import { CommunityAnnouncements } from "@/components/academy/community/CommunityAnnouncements";
import { CommunityDailySetups } from "@/components/academy/community/CommunityDailySetups";
import { CommunityWins } from "@/components/academy/community/CommunityWins";
import { AdminActionBar } from "@/components/admin/AdminActionBar";

const TABS = [
  { key: "trade-floor", label: "Trade Floor" },
  { key: "announcements", label: "Announcements" },
  { key: "daily-setups", label: "Daily Setups" },
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
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background">
        {/* Floating workspace panel — inset inside dark shell */}
        <div className="flex flex-col flex-1 m-3 rounded-2xl overflow-hidden border border-[hsl(220,18%,28%)] bg-[hsl(220,16%,96%)] shadow-[0_6px_32px_rgba(0,0,0,0.35),0_0_0_1px_rgba(59,130,246,0.08),0_0_12px_rgba(59,130,246,0.04)]">
          {/* Admin bar — only visible to admins */}
          <div className="shrink-0 px-4 pt-2">
            <AdminActionBar
              title="Community Admin"
              permission="moderate_chat"
              actions={[
                { label: "Lock Room", disabled: true },
                { label: "Pin Message", disabled: true },
              ]}
            />
          </div>

          {/* Compact tab navigation */}
          <div className="shrink-0 flex justify-center pt-2.5 pb-1.5 px-4">
            <div className="inline-flex items-center gap-0.5 rounded-lg bg-[hsl(220,14%,90%)] border border-[hsl(220,12%,84%)] p-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={cn(
                    "relative px-5 py-1.5 text-[12px] font-semibold rounded-md transition-all duration-100",
                    activeTab === tab.key
                      ? "text-[hsl(220,15%,18%)] bg-white border border-[hsl(220,10%,80%)] shadow-[0_1px_4px_rgba(0,0,0,0.08),0_0_8px_rgba(59,130,246,0.1)]"
                      : "text-[hsl(220,10%,48%)] hover:text-[hsl(220,10%,28%)] hover:bg-[hsl(220,12%,94%)] border border-transparent"
                  )}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <span className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-6 h-[1.5px] rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content — all tabs stay mounted, toggled via CSS to avoid remount/reload */}
          <div className="flex-1 overflow-hidden relative">
            <div className={cn("absolute inset-0", activeTab === "trade-floor" ? "block" : "hidden")}>
              <CommunityTradeFloor onSwitchTab={handleTabChange} />
            </div>
            <div className={cn("absolute inset-0", activeTab === "announcements" ? "block" : "hidden")}>
              <CommunityAnnouncements />
            </div>
            <div className={cn("absolute inset-0", activeTab === "daily-setups" ? "block" : "hidden")}>
              <CommunityDailySetups />
            </div>
            <div className={cn("absolute inset-0", activeTab === "wins" ? "block" : "hidden")}>
              <CommunityWins />
            </div>
          </div>
        </div>
      </div>
    </AcademyLayout>
  );
};

export default AcademyCommunity;
