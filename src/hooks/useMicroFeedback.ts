import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "vault-micro-feedback-shown-date";

export function useMicroFeedback(): string | null {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);
  const fetched = useRef(false);

  const fetch = useCallback(async () => {
    if (!user || fetched.current) return;

    // Only show once per day
    try {
      const today = new Date().toISOString().slice(0, 10);
      const lastShown = localStorage.getItem(STORAGE_KEY);
      if (lastShown === today) return;
    } catch {}

    fetched.current = true;

    try {
      const { data, error } = await supabase.rpc("get_micro_feedback", {
        _user_id: user.id,
      });

      if (!error && data) {
        setFeedback(data as unknown as string);
        try {
          localStorage.setItem(STORAGE_KEY, new Date().toISOString().slice(0, 10));
        } catch {}
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return feedback;
}
