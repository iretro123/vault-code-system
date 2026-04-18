import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Announcement {
  id: string;
  author_id: string;
  title: string;
  body: string;
  link: string | null;
  image_url: string | null;
  delivery_mode: string;
  segment: string;
  is_pinned: boolean;
  replies_locked: boolean;
  created_at: string;
  updated_at: string;
}

export function useAcademyAnnouncements() {
  const { user, profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const userSegment = (() => {
    const exp = profile?.academy_experience ?? "newbie";
    if (exp === "veteran" || exp === "advanced" || exp === "professional") return "advanced";
    if (exp === "active" || exp === "intermediate") return "intermediate";
    return "beginner";
  })();

  const fetchAnnouncements = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("academy_announcements")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    const all = (data ?? []) as Announcement[];

    // Client-side segment filtering for members
    const filtered = all.filter((a) => {
      if (a.segment === "all") return true;
      return a.segment === userSegment;
    });

    setAnnouncements(filtered);
    setLoading(false);
  }, [user, userSegment]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  return { announcements, loading, refetch: fetchAnnouncements };
}
