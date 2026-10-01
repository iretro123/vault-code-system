import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {isLocalDesignPreview} from '@/integrations/supabase/localPreviewFetch';

export type AlertChannel = "in_app" | "email" | "both";

export interface UserPreferences {
  user_id: string;
  trading_style: string | null;
  default_market: string;
  session_autopause_minutes: number;
  notifications_enabled: boolean;
  notify_announcements: boolean;
  notify_new_modules: boolean;
  notify_coach_reply: boolean;
  notify_chat: boolean;
  notify_pulse: boolean;
  notify_pulse_spy: boolean;
  notify_pulse_qqq: boolean;
  notify_live_events: boolean;
  sounds_enabled: boolean;
  preferred_alert_channel: AlertChannel;
  risk_percent_override: number | null;
}

const DEFAULTS: Omit<UserPreferences, "user_id"> = {
  trading_style: null,
  default_market: "options",
  session_autopause_minutes: 60,
  notifications_enabled: true,
  notify_announcements: true,
  notify_new_modules: true,
  notify_coach_reply: true,
  notify_chat: true,
  notify_pulse: true,
  notify_pulse_spy: true,
  notify_pulse_qqq: false,
  notify_live_events: true,
  sounds_enabled: true,
  preferred_alert_channel: "in_app",
  risk_percent_override: null,
};

export function useUserPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setPrefs(null);
    if (!user) { setLoading(false); return; }
    setLoading(true);

    (async () => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) { setLoading(false); return; }
      if (data) {
        setPrefs({ ...DEFAULTS, ...data } as UserPreferences);
      } else {
        // Create default row
        const newRow = { user_id: user.id, ...DEFAULTS };
        if(!isLocalDesignPreview()) await supabase.from("user_preferences").insert(newRow);
        setPrefs(newRow as UserPreferences);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const updatePrefs = useCallback(async (updates: Partial<Omit<UserPreferences, "user_id">>) => {
    if (!user || !prefs || prefs.user_id !== user.id) return false;
    if(isLocalDesignPreview()){
      setPrefs(p=>p?{...p,...updates}:p);
      return true;
    }
    const { error } = await supabase
      .from("user_preferences")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (error) return false;
    setPrefs((p) => p?.user_id === user.id ? { ...p, ...updates } : p);
    return true;
  }, [user, prefs]);

  return { prefs, loading, updatePrefs };
}
