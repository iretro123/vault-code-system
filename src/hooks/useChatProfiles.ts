import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatProfile {
  user_id: string;
  avatar_url: string | null;
  role_level: string;
  academy_experience: string;
}

/**
 * Fetches and caches profile data (avatar_url, role_level, experience)
 * for user IDs seen in chat messages.
 */
export function useChatProfiles() {
  const [profiles, setProfiles] = useState<Map<string, ChatProfile>>(new Map());
  const fetchedRef = useRef<Set<string>>(new Set());

  const ensureProfiles = useCallback(async (userIds: string[]) => {
    const missing = userIds.filter((id) => !fetchedRef.current.has(id));
    if (missing.length === 0) return;

    // Mark as fetched immediately to avoid duplicate requests
    missing.forEach((id) => fetchedRef.current.add(id));

    const { data } = await supabase
      .from("profiles")
      .select("user_id, avatar_url, role_level, academy_experience")
      .in("user_id", missing);

    if (data && data.length > 0) {
      setProfiles((prev) => {
        const next = new Map(prev);
        for (const row of data) {
          next.set(row.user_id, row as ChatProfile);
        }
        return next;
      });
    }
  }, []);

  const getProfile = useCallback(
    (userId: string): ChatProfile | undefined => profiles.get(userId),
    [profiles]
  );

  return { ensureProfiles, getProfile };
}
