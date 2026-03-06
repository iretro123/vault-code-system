import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a short random ID for default usernames
 */
function generateShortId(): string {
  return Math.random().toString(36).substring(2, 8);
}

/**
 * Detects the user's timezone, falling back to America/New_York
 */
function detectTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || "America/New_York";
  } catch {
    return "America/New_York";
  }
}

/**
 * Ensures a profile exists for the authenticated user.
 * Creates one with defaults if it doesn't exist.
 */
export async function ensureProfile(
  userId: string,
  email?: string | null,
  opts?: { phone_number?: string; username?: string; display_name?: string },
): Promise<void> {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error checking profile:", fetchError);
      return;
    }

    if (existing) return;

    const emailPrefix = email?.split("@")[0] || null;
    const defaultDisplayName = emailPrefix || "Trader";
    const chosenUsername = opts?.username || `trader_${generateShortId()}`;
    const detectedTz = detectTimezone();

    const { error: insertError } = await supabase.from("profiles").insert({
      user_id: userId,
      email: email || null,
      display_name: defaultDisplayName,
      username: chosenUsername,
      discipline_status: "inactive",
      discipline_score: 0,
      timezone: detectedTz,
      phone_number: opts?.phone_number || null,
    });

    if (insertError) {
      if (insertError.code === "23505" && insertError.message.includes("username")) {
        const retryUsername = `trader_${generateShortId()}`;
        await supabase.from("profiles").insert({
          user_id: userId,
          email: email || null,
          display_name: defaultDisplayName,
          username: retryUsername,
          discipline_status: "inactive",
          discipline_score: 0,
          timezone: detectedTz,
          phone_number: opts?.phone_number || null,
        });
      } else {
        console.error("Error creating profile:", insertError);
      }
    }
  } catch (error) {
    console.error("ensureProfile error:", error);
  }
}
