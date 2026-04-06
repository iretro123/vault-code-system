import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, PenLine, Trophy, Video } from "lucide-react";

interface TickerItem {
  id: string;
  text: string;
  type: "call" | "journal" | "lesson" | "win";
  userId: string;
}

const CACHE_KEY = "va_activity_ticker_v3";
const CACHE_TTL = 60_000; // 1 min cache
const REFRESH_INTERVAL = 75_000; // 75s background refresh

function readCache(): TickerItem[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: TickerItem[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick up to 5 unique users, preferring variety across activity types */
function mixActivities(items: TickerItem[]): TickerItem[] {
  const types: TickerItem["type"][] = ["call", "journal", "lesson", "win"];
  const buckets = new Map<string, TickerItem[]>();
  for (const t of types) buckets.set(t, []);
  for (const item of items) {
    buckets.get(item.type)?.push(item);
  }

  const result: TickerItem[] = [];
  const usedUsers = new Set<string>();

  // Round-robin across types to ensure mix
  let added = true;
  while (result.length < 5 && added) {
    added = false;
    for (const t of shuffle(types)) {
      if (result.length >= 5) break;
      const bucket = buckets.get(t)!;
      const idx = bucket.findIndex((b) => !usedUsers.has(b.userId));
      if (idx !== -1) {
        const pick = bucket.splice(idx, 1)[0];
        usedUsers.add(pick.userId);
        result.push(pick);
        added = true;
      }
    }
  }

  return shuffle(result);
}

const icon = (type: TickerItem["type"]) => {
  switch (type) {
    case "call":
      return (
        <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 shrink-0">
          <Video className="h-3 w-3 text-emerald-400" />
        </span>
      );
    case "journal":
      return (
        <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15 shrink-0">
          <PenLine className="h-3 w-3 text-amber-400" />
        </span>
      );
    case "lesson":
      return (
        <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/15 shrink-0">
          <BookOpen className="h-3 w-3 text-blue-400" />
        </span>
      );
    case "win":
      return (
        <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500/15 shrink-0">
          <Trophy className="h-3 w-3 text-yellow-400" />
        </span>
      );
  }
};

export function ActivityTicker() {
  const [items, setItems] = useState<TickerItem[]>(() => readCache() ?? []);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const fetchActivity = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const { data: activities } = await supabase.rpc("get_recent_activity");
      if (!activities || activities.length === 0 || !mountedRef.current) return;

      const allUserIds = new Set<string>();
      for (const a of activities) {
        if ((a as any).user_id) allUserIds.add((a as any).user_id);
      }
      if (allUserIds.size === 0) return;

      const { data: profiles } = await supabase.rpc("get_community_profiles", {
        _user_ids: Array.from(allUserIds),
      });

      const nameMap = new Map<string, string>();
      if (profiles) {
        for (const p of profiles) {
          const first = ((p as any).display_name || "A student").split(" ")[0];
          nameMap.set((p as any).user_id, first);
        }
      }

      const getName = (uid: string) => nameMap.get(uid) || "A student";

      const allItems: TickerItem[] = [];
      for (const a of activities) {
        const r = a as any;
        const name = getName(r.user_id);
        switch (r.activity_type) {
          case "call":
            allItems.push({ id: r.activity_id, text: `${name} joined a live call`, type: "call", userId: r.user_id });
            break;
          case "journal":
            allItems.push({ id: r.activity_id, text: `${name} journaled a trade`, type: "journal", userId: r.user_id });
            break;
          case "lesson":
            allItems.push({ id: r.activity_id, text: `${name} watched a lesson`, type: "lesson", userId: r.user_id });
            break;
          case "win":
            allItems.push({ id: r.activity_id, text: `${name} posted a win`, type: "win", userId: r.user_id });
            break;
        }
      }

      if (allItems.length === 0 || !mountedRef.current) return;

      const final = mixActivities(allItems);
      if (final.length > 0) {
        setItems(final);
        writeCache(final);
      }
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  // Initial load: show cache immediately, then fetch fresh
  useEffect(() => {
    mountedRef.current = true;
    fetchActivity();
    return () => { mountedRef.current = false; };
  }, [fetchActivity]);

  // Background refresh interval
  useEffect(() => {
    const interval = setInterval(fetchActivity, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  // Refresh on tab visibility
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchActivity();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchActivity]);

  if (items.length === 0) return null;

  const duration = items.length * 8;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] px-0 py-3"
      style={{
        background:
          "radial-gradient(ellipse at top, rgba(59,130,246,0.08), transparent 70%), hsl(222,20%,10%)",
        boxShadow: "0 0 20px rgba(59,130,246,0.05), 0 10px 30px rgba(0,0,0,0.4)",
        maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
      }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />

      <div
        className="flex items-center gap-8 whitespace-nowrap"
        style={{
          animation: `ticker-scroll ${duration}s linear infinite`,
          width: "max-content",
        }}
      >
        {[...items, ...items].map((item, i) => (
          <div key={`${item.id}-${i}`} className="flex items-center gap-2 px-2">
            {icon(item.type)}
            <span className="text-xs font-medium text-white/70">{item.text}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
