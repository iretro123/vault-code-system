import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserPreferences {
  user_id: string;
  trading_style: string | null;
  default_market: string;
  session_autopause_minutes: number;
  notifications_enabled: boolean;
  notify_announcements: boolean;
  notify_new_modules: boolean;
  notify_coach_reply: boolean;
  notify_live_events: boolean;
}

const DEFAULTS: Omit<UserPreferences, "user_id"> = {
  trading_style: null,
  default_market: "options",
  session_autopause_minutes: 60,
  notifications_enabled: true,
  notify_announcements: true,
  notify_new_modules: true,
  notify_coach_reply: true,
  notify_live_events: true,
};

export function useUserPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    (async () => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setPrefs(data as UserPreferences);
      } else {
        // Create default row
        const newRow = { user_id: user.id, ...DEFAULTS };
        await supabase.from("user_preferences").insert(newRow);
        setPrefs(newRow as UserPreferences);
      }
      setLoading(false);
    })();
  }, [user]);

  const updatePrefs = useCallback(async (updates: Partial<Omit<UserPreferences, "user_id">>) => {
    if (!user || !prefs) return false;
    const { error } = await supabase
      .from("user_preferences")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (error) return false;
    setPrefs((p) => p ? { ...p, ...updates } : p);
    return true;
  }, [user, prefs]);

  return { prefs, loading, updatePrefs };
}
