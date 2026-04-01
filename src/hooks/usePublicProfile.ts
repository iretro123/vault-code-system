import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PublicProfile {
  user_id: string;
  avatar_url: string | null;
  display_name: string | null;
  username: string | null;
  role_level: string;
  academy_experience: string;
  bio: string;
  social_twitter: string | null;
  social_instagram: string | null;
  social_tiktok: string | null;
  social_youtube: string | null;
  created_at: string;
  academy_role_name: string | null;
  lessons_completed: number;
}

const profileCache = new Map<string, PublicProfile>();

export function usePublicProfile(userId: string | null) {
  const [profile, setProfile] = useState<PublicProfile | null>(
    userId ? profileCache.get(userId) ?? null : null
  );
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;

    const cached = profileCache.get(userId);
    if (cached) {
      setProfile(cached);
      return;
    }

    setLoading(true);
    try {
      const [{ data: profileData }, { data: roleData }, { data: lessonData }] =
        await Promise.all([
          supabase.rpc("get_community_profiles", { _user_ids: [userId] }),
          supabase
            .from("academy_user_roles")
            .select("user_id, academy_roles(name)")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("lesson_progress")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("completed", true),
        ]);

      if (profileData && profileData.length > 0) {
        const row = profileData[0] as any;
        const result: PublicProfile = {
          user_id: row.user_id,
          avatar_url: row.avatar_url,
          display_name: row.display_name,
          username: row.username,
          role_level: row.role_level,
          academy_experience: row.academy_experience,
          bio: row.bio || "",
          social_twitter: row.social_twitter,
          social_instagram: row.social_instagram,
          social_tiktok: row.social_tiktok,
          social_youtube: row.social_youtube,
          created_at: row.created_at,
          academy_role_name: (roleData as any)?.academy_roles?.name ?? "Member",
          lessons_completed: lessonData ? (lessonData as any).length ?? 0 : 0,
        };
        profileCache.set(userId, result);
        setProfile(result);
      }
    } catch (err) {
      console.error("usePublicProfile error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading };
}
