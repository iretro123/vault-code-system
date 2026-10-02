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
      try {
        const read = () => supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle();
        const { data, error } = await read();
        if (cancelled || error) return;
        if (data) {
          setPrefs({ ...DEFAULTS, ...data } as UserPreferences);
          return;
        }
        const newRow = { user_id: user.id, ...DEFAULTS };
        if (isLocalDesignPreview()) {
          setPrefs(newRow);
          return;
        }
        const created = await supabase.from("user_preferences").insert(newRow).select("*").single();
        if (cancelled) return;
        if (!created.error && created.data) {
          setPrefs({ ...DEFAULTS, ...created.data } as UserPreferences);
        } else if (created.error?.code === "23505") {
          // Another mounted consumer may have created it. Read its values; never overwrite them.
          const existing = await read();
          if (!cancelled && !existing.error && existing.data) setPrefs({ ...DEFAULTS, ...existing.data } as UserPreferences);
        }
      } catch {
        // A failed load must not look like persisted default preferences.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const updatePrefs = useCallback(async (updates: Partial<Omit<UserPreferences, "user_id">>) => {
    if (!user || !prefs || prefs.user_id !== user.id) return false;
    if(isLocalDesignPreview()){
      setPrefs(p=>p?{...p,...updates}:p);
      return true;
    }
    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .select("*")
        .single();
      if (error || !data || data.user_id !== user.id) return false;
      setPrefs((p) => p?.user_id === user.id ? { ...DEFAULTS, ...data } as UserPreferences : p);
      return true;
    } catch {
      return false;
    }
  }, [user, prefs]);

  return { prefs, loading, updatePrefs };
}
