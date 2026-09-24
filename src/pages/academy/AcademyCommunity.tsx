import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CommunityTradeFloor } from "@/components/academy/community/CommunityTradeFloor";
import { MarketWatch } from "@/components/academy/community/MarketWatch";
import { SpxPulseRoom } from "@/components/academy/community/SpxPulseRoom";
import { RoomChat } from "@/components/academy/RoomChat";
import "./academy-community.css";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { useUnreadCounts, formatBadge } from "@/hooks/useUnreadCounts";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsBasicTier } from "@/hooks/useIsBasicTier";
import { VAULT_OS_MONTHLY_FALLBACK_PRICE, isSharedGuestAccount } from "@/lib/membership";
import { Button } from "@/components/ui/button";
import { ArrowRight, BellRing, LockKeyhole, Radio, ShieldCheck, MessageCircle, MoreHorizontal } from "lucide-react";

const TABS = [
  { key: "trade-floor", label: "Chat", roomSlug: "trade-floor" },
  { key: "daily-setups", label: "Signals", roomSlug: "daily-setups" },
  { key: "pulse", label: "Pulse", roomSlug: null },
  { key: "wins", label: "Wins", roomSlug: "wins-proof" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function isTabKey(value: string | null): value is TabKey {
  return !!value && TABS.some((tab) => tab.key === value);
}

function SignalsUpgradeGate({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden px-3 pb-28 pt-5 md:px-4 md:pt-10">
      <div className="relative mx-auto w-full max-w-[29rem] overflow-hidden rounded-2xl border border-primary/25 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.22),transparent_34%),linear-gradient(145deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] px-4 pb-4 pt-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.38)] md:rounded-[1.55rem] md:px-5 md:pb-5 md:pt-12">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/25 blur-[60px]" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-blue-500/10 blur-[70px]" />
        <div className="relative z-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/30 bg-primary/15 text-primary shadow-[0_0_34px_rgba(59,130,246,0.26)]">
            <LockKeyhole className="h-8 w-8" />
          </div>
          <p className="mt-5 text-[12px] font-black uppercase tracking-[0.24em] text-primary">
            Full Access Signals
          </p>
          <h2 className="mt-3 text-2xl font-black leading-tight tracking-normal text-white md:text-3xl">
            Unlock live trade signals inside Vault OS.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-6 text-slate-300">
            Signals are part of the full member experience. Upgrade to unlock the live setups room, alerts, lessons, tools, and member-only areas.
          </p>

          <div className="mt-5 grid gap-2 text-left">
            {[
              { icon: Radio, title: "Live setups room", copy: "See the Signals tab when full access is active." },
              { icon: BellRing, title: "Member alerts", copy: "Get notified when important updates are posted." },
              { icon: ShieldCheck, title: "Full Vault OS access", copy: "Unlock the paid lessons, tools, live areas, and member sections." },
            ].map(({ icon: Icon, title, copy }) => (
              <div key={title} className="flex gap-3 rounded-2xl border border-white/10 bg-black/18 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-white">{title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-400">{copy}</span>
                </span>
              </div>
            ))}
          </div>

          <Button
            type="button"
            onClick={onUpgrade}
            className="mt-5 h-14 w-full rounded-2xl bg-gradient-to-r from-primary to-blue-600 text-[0.95rem] font-black text-white shadow-[0_16px_34px_rgba(37,99,235,0.34)] hover:from-blue-500 hover:to-primary"
          >
            View Full Access - {VAULT_OS_MONTHLY_FALLBACK_PRICE.replace("/month", "/mo")}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="mt-3 text-[11px] font-medium leading-5 text-slate-500">
            Secure Apple in-app purchase. No web checkout required inside the app.
          </p>
        </div>
      </div>
    </div>
  );
}

const AcademyCommunity = () => {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (typeof window !== "undefined") {
      const queryTab = new URLSearchParams(window.location.search).get("tab");
      if (isTabKey(queryTab)) return queryTab;
    }
    let saved: string | null = null;
    try { saved = localStorage.getItem("vault_community_tab"); } catch { /* Storage is optional. */ }
    return isTabKey(saved) ? saved : "trade-floor";
  });
  const { isCEO, isAdmin, isOperator } = useAcademyPermissions();
  const canPostRestricted = isCEO || isAdmin || isOperator;
  const { session, user, profile, signOut, refetchProfile } = useAuth();
  const { isBasicTier, loading: tierLoading } = useIsBasicTier();
  const userId = session?.user?.id || null;
  const sharedGuest = isSharedGuestAccount(user, profile);
  // Never show the paywall until the role has actually resolved — a stale or
  // still-loading role must not lock a paying member out of Signals.
  const shouldGateSignals = !tierLoading && (isBasicTier || sharedGuest) && !canPostRestricted;

  // Refresh entitlements whenever the Community page opens so role changes
  // (upgrade, whitelist restore) land without a full app reload.
  const refreshedRef = useRef(false);
  useEffect(() => {
    if (!userId || refreshedRef.current) return;
    refreshedRef.current = true;
    void refetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const activeRoomSlug = (activeTab === "daily-setups" || activeTab === "pulse") && (tierLoading || shouldGateSignals)
    ? null : TABS.find((t) => t.key === activeTab)?.roomSlug ?? null;
  const { counts } = useUnreadCounts(activeRoomSlug, userId);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchParams((previous) => { const next = new URLSearchParams(previous); next.set("tab", tab); return next; }, { replace: true });
    try { localStorage.setItem("vault_community_tab", tab); } catch { /* Storage is optional. */ }
  };

  useEffect(() => {
    const queryTab = searchParams.get("tab");
    if (queryTab === "calendar") {
      setActiveTab("trade-floor");
      setSearchParams(previous => { const next = new URLSearchParams(previous); next.set("tab", "trade-floor"); return next; }, { replace: true });
      try { localStorage.setItem("vault_community_tab", "trade-floor"); } catch { /* Storage is optional. */ }
      return;
    }
    if (!isTabKey(queryTab) || queryTab === activeTab) return;
    setActiveTab(queryTab);
    try { localStorage.setItem("vault_community_tab", queryTab); } catch { /* Storage is optional. */ }
  }, [searchParams, activeTab, setSearchParams]);

  const handleSignalsUpgrade = async () => {
    if (sharedGuest) {
      await signOut();
      navigate("/create-account/full?source=signals", { replace: true });
      return;
    }
    navigate("/membership");
  };

  return (
    <>
      <div className="vault-community flex flex-col h-full overflow-hidden bg-background">
        <div className="flex flex-col flex-1 m-2 md:m-3 rounded-2xl overflow-hidden border border-white/[0.05] bg-card shadow-[0_6px_32px_rgba(0,0,0,0.35)]">
          <div className="community-heading">
            <div className="community-title-row flex items-center justify-between gap-3"><h1>Community</h1><button aria-label="Messages" className="community-inbox-button flex items-center gap-2 rounded-xl border border-blue-300/20 bg-blue-400/10 px-3 py-2 text-sm text-blue-200 hover:bg-blue-400/20" onClick={() => navigate('/academy/community/messages?resume=1')}><MessageCircle size={21}/><span>Messages</span></button></div>
            {isMobile ? <details className="community-tools-menu"><summary aria-label="Community tools"><MoreHorizontal size={23}/></summary><div className="community-header-actions"><MarketWatch/><button onClick={() => navigate("/academy/live")}><Radio size={17} /> Classroom <ArrowRight size={15} /></button></div></details> : <div className="community-header-actions"><MarketWatch/><button onClick={() => navigate("/academy/live")}><Radio size={17} /> Classroom <ArrowRight size={15} /></button></div>}
          </div>

          <div className="shrink-0 px-3 md:px-4 pt-1">
            <div className="community-room-tabs flex w-full items-center justify-center gap-0 border-b border-white/[0.06]">
              {TABS.map((tab) => {
                const count = tab.roomSlug ? counts[tab.roomSlug] || 0 : 0;
                const badge = formatBadge(count);
                return (
                  <button
                    key={tab.key}
                    aria-current={activeTab === tab.key ? "page" : undefined}
                    onClick={() => handleTabChange(tab.key)}
                    className={cn(
                      "relative flex-1 md:flex-none whitespace-nowrap px-2 md:px-6 pb-2.5 pt-1.5 text-[12px] md:text-[13px] font-semibold tracking-wide transition-colors duration-150",
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

          <div className="relative flex-1 overflow-hidden">
            <div className={cn("absolute inset-0", activeTab === "trade-floor" ? "block" : "hidden")}>
              <CommunityTradeFloor onSwitchTab={handleTabChange} active={activeTab === "trade-floor"} />
            </div>
            <div className={cn("absolute inset-0", activeTab === "daily-setups" ? "block" : "hidden")}>
              {tierLoading ? <div className="pulse-empty" role="status">Checking your membership…</div> : shouldGateSignals ? (
                <SignalsUpgradeGate onUpgrade={handleSignalsUpgrade} />
              ) : (
                <RoomChat roomSlug="daily-setups" canPost={canPostRestricted} isAnnouncements={false} active={activeTab === "daily-setups"} compact />
              )}
            </div>
            <div className={cn("absolute inset-0", activeTab === "pulse" ? "block" : "hidden")}>
              {tierLoading ? <div className="pulse-empty" role="status">Checking your membership…</div> : shouldGateSignals ? <SignalsUpgradeGate onUpgrade={handleSignalsUpgrade}/> : <SpxPulseRoom active={activeTab === "pulse"}/>}
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

