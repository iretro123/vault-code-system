import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingState {
  claimed_role: boolean;
  first_lesson_completed: boolean;
  intro_posted: boolean;
}

export interface InboxItem {
  id: string;
  user_id: string | null;
  type: string;
  title: string;
  body: string;
  link: string | null;
  created_at: string;
  read_at: string | null;
  pinned: boolean;
  sender_id: string | null;
  sender_name: string | null;
  sender_avatar: string | null;
  sender_role: string | null;
}

interface ReferralStats {
  total_signed_up: number;
  total_paid: number;
  current_streak_weeks: number;
  last_referral_at: string | null;
}

interface AcademyData {
  onboarding: OnboardingState | null;
  notificationUnreadCount: number;
  hydrated: boolean;
  refetchOnboarding: () => Promise<void>;
  refetchNotifications: () => Promise<void>;
  // Inbox
  inboxItems: InboxItem[];
  inboxLoading: boolean;
  inboxUnreadCount: number;
  refetchInbox: () => Promise<void>;
  markInboxRead: (itemId: string) => Promise<void>;
  markAllInboxRead: () => Promise<void>;
  dismissInboxItem: (itemId: string) => Promise<void>;
  // Referral
  referralStats: ReferralStats;
  referralLoading: boolean;
  refetchReferrals: () => Promise<void>;
}

const defaultOnboarding: OnboardingState = {
  claimed_role: false,
  first_lesson_completed: false,
  intro_posted: false,
};

const defaultReferralStats: ReferralStats = {
  total_signed_up: 0,
  total_paid: 0,
  current_streak_weeks: 0,
  last_referral_at: null,
};

const AcademyDataContext = createContext<AcademyData>({
  onboarding: null,
  notificationUnreadCount: 0,
  hydrated: false,
  refetchOnboarding: async () => {},
  refetchNotifications: async () => {},
  inboxItems: [],
  inboxLoading: false,
  inboxUnreadCount: 0,
  refetchInbox: async () => {},
  markInboxRead: async () => {},
  markAllInboxRead: async () => {},
  dismissInboxItem: async () => {},
  referralStats: defaultReferralStats,
  referralLoading: true,
  refetchReferrals: async () => {},
});

// localStorage cache helpers
const CACHE_KEY_INBOX = "va_cache_inbox";
const CACHE_KEY_REFERRAL = "va_cache_referral";
const CACHE_KEY_ONBOARDING = "va_cache_onboarding";

function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function writeCache(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function AcademyDataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  // Seed from cache to prevent flash
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(() => readCache(CACHE_KEY_ONBOARDING, null));
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const [inboxItems, setInboxItems] = useState<InboxItem[]>(() => readCache(CACHE_KEY_INBOX, []));
  const [inboxLoading, setInboxLoading] = useState(false);

  const [referralStats, setReferralStats] = useState<ReferralStats>(() => readCache(CACHE_KEY_REFERRAL, defaultReferralStats));
  const [referralLoading, setReferralLoading] = useState(true);

  const fetchOnboarding = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("onboarding_state")
      .select("claimed_role, first_lesson_completed, intro_posted")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    const result = data ? (data as OnboardingState) : defaultOnboarding;
    setOnboarding(result);
    writeCache(CACHE_KEY_ONBOARDING, result);
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data: notifs } = await supabase
      .from("academy_notifications" as any)
      .select("id")
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .limit(50);

    if (!notifs || notifs.length === 0) {
      setNotificationUnreadCount(0);
      return;
    }

    const { data: reads } = await supabase
      .from("academy_notification_reads" as any)
      .select("notification_id")
      .eq("user_id", user.id);

    const readSet = new Set((reads || []).map((r: any) => r.notification_id));
    const unread = (notifs as any[]).filter((n) => !readSet.has(n.id)).length;
    setNotificationUnreadCount(unread);
  }, [user]);

  const fetchInbox = useCallback(async () => {
    if (!user) return;
    setInboxLoading(true);

    // Fetch inbox items and user's dismissals in parallel
    const [{ data }, { data: dismissals }] = await Promise.all([
      supabase
        .from("inbox_items" as any)
        .select("*")
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("inbox_dismissals" as any)
        .select("inbox_item_id")
        .eq("user_id", user.id),
    ]);

    const dismissedSet = new Set((dismissals as any[] || []).map((d: any) => d.inbox_item_id));

    const filtered = (data as any[] || []).filter((d: any) => !dismissedSet.has(d.id));

    // Collect unique sender_ids to batch-fetch profiles + roles
    const senderIds = [...new Set(filtered.map((d: any) => d.sender_id).filter(Boolean))] as string[];

    let senderMap: Record<string, { name: string | null; avatar: string | null; role: string | null }> = {};

    if (senderIds.length > 0) {
      const [{ data: profiles }, { data: userRoles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", senderIds),
        supabase
          .from("academy_user_roles" as any)
          .select("user_id, role_id, academy_roles(name)")
          .in("user_id", senderIds),
      ]);

      for (const p of (profiles as any[] || [])) {
        senderMap[p.user_id] = { name: p.display_name, avatar: p.avatar_url, role: null };
      }

      for (const ur of (userRoles as any[] || [])) {
        const roleName = ur.academy_roles?.name;
        if (roleName && senderMap[ur.user_id]) {
          // Keep highest priority role (CEO > Admin > Coach)
          const current = senderMap[ur.user_id].role;
          if (!current || roleName === "CEO" || (roleName === "Admin" && current !== "CEO") || (roleName === "Coach" && !current)) {
            senderMap[ur.user_id].role = roleName;
          }
        }
      }
    }

    const mapped: InboxItem[] = filtered.map((d: any) => {
      const sender = d.sender_id ? senderMap[d.sender_id] : null;
      return {
        id: d.id,
        user_id: d.user_id,
        type: d.type,
        title: d.title,
        body: d.body,
        link: d.link,
        created_at: d.created_at,
        read_at: d.read_at,
        pinned: d.pinned ?? false,
        sender_id: d.sender_id ?? null,
        sender_name: sender?.name ?? null,
        sender_avatar: sender?.avatar ?? null,
        sender_role: sender?.role ?? null,
      };
    });
    setInboxItems(mapped);
    writeCache(CACHE_KEY_INBOX, mapped);
    setInboxLoading(false);
  }, [user]);

  const markInboxRead = useCallback(async (itemId: string) => {
    if (!user) return;
    const item = inboxItems.find((i) => i.id === itemId);
    if (item && item.user_id === user.id) {
      // Personal item — update directly (RLS allows)
      await supabase
        .from("inbox_items" as any)
        .update({ read_at: new Date().toISOString() } as any)
        .eq("id", itemId);
    }
    // For broadcast items, we skip the update (RLS blocks it) — read state is visual only
    setInboxItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, read_at: new Date().toISOString() } : i))
    );
  }, [user, inboxItems]);

  const markAllInboxRead = useCallback(async () => {
    if (!user) return;
    const unread = inboxItems.filter((i) => !i.read_at);
    if (unread.length === 0) return;

    const userItems = unread.filter((i) => i.user_id === user.id);
    if (userItems.length > 0) {
      await supabase
        .from("inbox_items" as any)
        .update({ read_at: new Date().toISOString() } as any)
        .eq("user_id", user.id)
        .is("read_at", null);
    }

    setInboxItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at || new Date().toISOString() })));
  }, [user, inboxItems]);

  const dismissInboxItem = useCallback(async (itemId: string) => {
    if (!user) return;
    const item = inboxItems.find((i) => i.id === itemId);

    if (item && item.user_id === null) {
      // Broadcast item — can't delete shared row, insert dismissal record instead
      await supabase
        .from("inbox_dismissals" as any)
        .upsert({ user_id: user.id, inbox_item_id: itemId, dismissed_at: new Date().toISOString() } as any, { onConflict: "user_id,inbox_item_id" });
    } else {
      // Personal item — hard delete (RLS allows)
      await supabase
        .from("inbox_items" as any)
        .delete()
        .eq("id", itemId);
    }

    // Remove from local state + cache immediately
    setInboxItems((prev) => {
      const next = prev.filter((i) => i.id !== itemId);
      writeCache(CACHE_KEY_INBOX, next);
      return next;
    });
  }, [user, inboxItems]);

  const fetchReferrals = useCallback(async () => {
    if (!user) {
      setReferralLoading(false);
      return;
    }

    const { data } = await supabase
      .from("referral_stats" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      const stats = {
        total_signed_up: (data as any).total_signed_up ?? 0,
        total_paid: (data as any).total_paid ?? 0,
        current_streak_weeks: (data as any).current_streak_weeks ?? 0,
        last_referral_at: (data as any).last_referral_at ?? null,
      };
      setReferralStats(stats);
      writeCache(CACHE_KEY_REFERRAL, stats);
    }
    setReferralLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setOnboarding(null);
      setNotificationUnreadCount(0);
      setInboxItems([]);
      setReferralStats(defaultReferralStats);
      setHydrated(true);
      return;
    }

    let cancelled = false;

    Promise.all([
      fetchOnboarding(),
      fetchNotifications(),
      fetchInbox(),
      fetchReferrals(),
    ]).then(() => {
      if (!cancelled) setHydrated(true);
    });

    return () => { cancelled = true; };
  }, [user, authLoading, fetchOnboarding, fetchNotifications, fetchInbox, fetchReferrals]);

  // Realtime: auto-refresh inbox when new items arrive for this user
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`inbox-rt-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "inbox_items",
          filter: `user_id=eq.${user.id}`,
        },
        () => { fetchInbox(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchInbox]);

  return (
    <AcademyDataContext.Provider
      value={{
        onboarding,
        notificationUnreadCount,
        hydrated,
        refetchOnboarding: fetchOnboarding,
        refetchNotifications: fetchNotifications,
        inboxItems,
        inboxLoading,
        inboxUnreadCount: inboxItems.filter((i) => !i.read_at).length,
        refetchInbox: fetchInbox,
        markInboxRead,
        markAllInboxRead,
        dismissInboxItem,
        referralStats,
        referralLoading,
        refetchReferrals: fetchReferrals,
      }}
    >
      {children}
    </AcademyDataContext.Provider>
  );
}

export function useAcademyData() {
  return useContext(AcademyDataContext);
}
