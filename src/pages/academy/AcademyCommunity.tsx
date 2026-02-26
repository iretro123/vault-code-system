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
          <div className="shrink-0 flex justify-center pt-2 pb-1 px-4">
            <div className="inline-flex items-center gap-0.5 rounded-lg bg-[hsl(220,12%,91%)] border border-[hsl(220,12%,85%)] p-0.5 shadow-sm">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={cn(
                    "relative px-5 py-1.5 text-[12px] font-semibold rounded-md transition-all duration-100",
                    activeTab === tab.key
                      ? "text-[hsl(220,15%,20%)] bg-white border border-[hsl(220,10%,82%)] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_0_6px_rgba(59,130,246,0.12)]"
                      : "text-[hsl(220,10%,50%)] hover:text-[hsl(220,10%,30%)] border border-transparent"
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

          {/* Tab Content — maximized */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "trade-floor" && <CommunityTradeFloor />}
            {activeTab === "announcements" && <CommunityAnnouncements />}
            {activeTab === "wins" && <CommunityWins />}
          </div>
        </div>
      </div>
    </AcademyLayout>
  );
};

export default AcademyCommunity;
