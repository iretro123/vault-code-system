import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MentionUser {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

// Global cache — fetched once per session
let cachedUsers: MentionUser[] | null = null;
let fetchPromise: Promise<MentionUser[]> | null = null;

async function fetchAllUsers(): Promise<MentionUser[]> {
  if (cachedUsers) return cachedUsers;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url")
      .order("display_name", { ascending: true })
      .limit(500);

    cachedUsers = (data ?? []).map((r: any) => ({
      user_id: r.user_id,
      display_name: r.display_name,
      username: r.username,
      avatar_url: r.avatar_url,
    }));
    return cachedUsers;
  })();

  return fetchPromise;
}

/**
 * Mention autocomplete hook.
 * Detects `@query` at cursor position, returns filtered suggestions.
 * Only activates when `enabled` is true (admin/CEO/operator).
 */
export function useMentionAutocomplete({ enabled, canPingEveryone = true }: { enabled: boolean; canPingEveryone?: boolean }) {
  const [suggestions, setSuggestions] = useState<(MentionUser | { type: "everyone" })[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const usersRef = useRef<MentionUser[]>([]);

  // Preload users when enabled
  useEffect(() => {
    if (enabled) {
      fetchAllUsers().then((u) => { usersRef.current = u; });
    }
  }, [enabled]);

  const updateMentionState = useCallback(
    (text: string, cursorPos: number) => {
      if (!enabled) {
        setSuggestions([]);
        setMentionQuery(null);
        return;
      }

      // Find the last `@` before cursor that's either at start or preceded by whitespace
      const before = text.slice(0, cursorPos);
      const atIdx = before.lastIndexOf("@");
      if (atIdx < 0 || (atIdx > 0 && !/\s/.test(before[atIdx - 1]))) {
        setSuggestions([]);
        setMentionQuery(null);
        setMentionStart(-1);
        return;
      }

      const query = before.slice(atIdx + 1).toLowerCase();
      // If there's a space after the query start, close autocomplete
      if (query.includes(" ") && query.length > 20) {
        setSuggestions([]);
        setMentionQuery(null);
        return;
      }

      setMentionQuery(query);
      setMentionStart(atIdx);

      const results: (MentionUser | { type: "everyone" })[] = [];

      // @everyone always first
      if ("everyone".startsWith(query)) {
        results.push({ type: "everyone" });
      }

      // Filter users
      const users = usersRef.current;
      const filtered = users.filter((u) => {
        const dn = (u.display_name || "").toLowerCase();
        const un = (u.username || "").toLowerCase();
        return dn.includes(query) || un.includes(query);
      });

      results.push(...filtered.slice(0, 8));
      setSuggestions(results);
      setSelectedIndex(0);
    },
    [enabled]
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setMentionQuery(null);
    setMentionStart(-1);
    setSelectedIndex(0);
  }, []);

  return {
    suggestions,
    mentionQuery,
    mentionStart,
    selectedIndex,
    setSelectedIndex,
    updateMentionState,
    clearSuggestions,
  };
}

/**
 * Parse @mentions from a message body and return matched usernames.
 * Returns { mentionedUserIds: string[], hasEveryone: boolean }
 */
export function parseMentions(
  body: string,
  allUsers: MentionUser[]
): { mentionedUserIds: string[]; hasEveryone: boolean } {
  const hasEveryone = /@everyone\b/i.test(body);
  const mentionedUserIds: string[] = [];

  // Match @word patterns
  const mentionRegex = /@(\S+)/g;
  let match;
  while ((match = mentionRegex.exec(body)) !== null) {
    const mentioned = match[1].toLowerCase();
    if (mentioned === "everyone") continue;

    const user = allUsers.find(
      (u) =>
        (u.username || "").toLowerCase() === mentioned ||
        (u.display_name || "").toLowerCase().replace(/\s+/g, "") === mentioned
    );
    if (user) {
      mentionedUserIds.push(user.user_id);
    }
  }

  return { mentionedUserIds: [...new Set(mentionedUserIds)], hasEveryone };
}

/** Get display label for a mention user */
export function getMentionLabel(user: MentionUser): string {
  return user.display_name || user.username || "Unknown";
}

/** Get the insert text for autocomplete selection */
export function getMentionInsertText(user: MentionUser): string {
  // Use username if available, else display_name without spaces
  return user.username || (user.display_name || "").replace(/\s+/g, "");
}
