import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingState {
  claimed_role: boolean;
  first_lesson_completed: boolean;
  intro_posted: boolean;
}

interface AcademyData {
  onboarding: OnboardingState | null;
  notificationUnreadCount: number;
  hydrated: boolean;
  refetchOnboarding: () => Promise<void>;
  refetchNotifications: () => Promise<void>;
}

const defaultOnboarding: OnboardingState = {
  claimed_role: false,
  first_lesson_completed: false,
  intro_posted: false,
};

const AcademyDataContext = createContext<AcademyData>({
  onboarding: null,
  notificationUnreadCount: 0,
  hydrated: false,
  refetchOnboarding: async () => {},
  refetchNotifications: async () => {},
});

export function AcademyDataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const fetchOnboarding = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("onboarding_state")
      .select("claimed_role, first_lesson_completed, intro_posted")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    setOnboarding(data ? (data as OnboardingState) : defaultOnboarding);
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    // Count unread: notifications not in reads table
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

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setOnboarding(null);
      setNotificationUnreadCount(0);
      setHydrated(true);
      return;
    }

    let cancelled = false;

    Promise.all([fetchOnboarding(), fetchNotifications()]).then(() => {
      if (!cancelled) setHydrated(true);
    });

    return () => { cancelled = true; };
  }, [user, authLoading, fetchOnboarding, fetchNotifications]);

  return (
    <AcademyDataContext.Provider
      value={{
        onboarding,
        notificationUnreadCount,
        hydrated,
        refetchOnboarding: fetchOnboarding,
        refetchNotifications: fetchNotifications,
      }}
    >
      {children}
    </AcademyDataContext.Provider>
  );
}

export function useAcademyData() {
  return useContext(AcademyDataContext);
}
