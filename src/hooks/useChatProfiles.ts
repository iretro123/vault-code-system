import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatProfile {
  user_id: string;
  avatar_url: string | null;
  role_level: string;
  academy_experience: string;
  academy_role_name?: string | null;
}

// ── Global profile cache (survives component remounts) ──
const globalProfileCache = new Map<string, ChatProfile>();
const globalFetchedIds = new Set<string>();
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((l) => l());
}

/**
 * Fetches and caches profile data (avatar_url, role_level, experience)
 * for user IDs seen in chat messages. Cache is global and survives remounts.
 */
export function useChatProfiles() {
  const [, setTick] = useState(0);

  // Subscribe to global cache updates
  useEffect(() => {
    const cb = () => setTick((t) => t + 1);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  const ensureProfiles = useCallback(async (userIds: string[]) => {
    const missing = userIds.filter((id) => !globalFetchedIds.has(id));
    if (missing.length === 0) return;

    // Mark as fetched immediately to avoid duplicate requests
    missing.forEach((id) => globalFetchedIds.add(id));

    // Fetch profiles + roles in parallel
    const [{ data }, { data: roleData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, avatar_url, role_level, academy_experience")
        .in("user_id", missing),
      supabase
        .from("academy_user_roles")
        .select("user_id, academy_roles(name)")
        .in("user_id", missing),
    ]);

    const roleMap = new Map<string, string>();
    if (roleData) {
      for (const r of roleData) {
        roleMap.set(r.user_id, (r as any).academy_roles?.name ?? "Member");
      }
    }

    if (data && data.length > 0) {
      for (const row of data) {
        globalProfileCache.set(row.user_id, {
          ...(row as ChatProfile),
          academy_role_name: roleMap.get(row.user_id) ?? "Member",
        });
      }
      notifyListeners();
    }
  }, []);

  const getProfile = useCallback(
    (userId: string): ChatProfile | undefined => globalProfileCache.get(userId),
    []
  );

  return { ensureProfiles, getProfile };
}
