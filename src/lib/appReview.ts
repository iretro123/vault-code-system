import type { User } from "@supabase/supabase-js";

type ReviewProfile = {
  email?: string | null;
  username?: string | null;
  display_name?: string | null;
};

export function isAppReviewAccount(user?: User | null, profile?: ReviewProfile | null) {
  const candidates = [
    user?.email,
    user?.user_metadata?.email,
    user?.user_metadata?.username,
    profile?.email,
    profile?.username,
    profile?.display_name,
  ];

  return candidates.some((value) => typeof value === "string" && value.toLowerCase().includes("appreview"));
}
