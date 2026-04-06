import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, PenLine, Video } from "lucide-react";

interface TickerItem {
  id: string;
  text: string;
  type: "call" | "journal" | "lesson";
}

const CACHE_KEY = "va_activity_ticker";
const CACHE_TTL = 5 * 60_000;

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

export function ActivityTicker() {
  const [items, setItems] = useState<TickerItem[]>(() => readCache() ?? []);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const cached = readCache();
    if (cached && cached.length > 0) {
      setItems(cached);
      return;
    }

    const since = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();

    const fetchAll = async () => {
      const [attendanceRes, journalRes, lessonsRes] = await Promise.all([
        supabase
          .from("live_session_attendance")
          .select("id, user_id, clicked_at")
          .gte("clicked_at", since)
          .order("clicked_at", { ascending: false })
          .limit(10),
        supabase
          .from("journal_entries")
          .select("id, user_id, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("lesson_progress")
          .select("id, user_id, completed_at")
          .eq("completed", true)
          .gte("completed_at", since)
          .order("completed_at", { ascending: false })
          .limit(10),
      ]);

      // Collect unique user_ids to fetch display names
      const allUserIds = new Set<string>();
      (attendanceRes.data ?? []).forEach((r: any) => allUserIds.add(r.user_id));
      (journalRes.data ?? []).forEach((r: any) => allUserIds.add(r.user_id));
      (lessonsRes.data ?? []).forEach((r: any) => allUserIds.add(r.user_id));

      if (allUserIds.size === 0) return;

      // Batch fetch display names from profiles
      const { data: profiles } = await supabase
        .rpc("get_community_profiles", { _user_ids: Array.from(allUserIds) });

      const nameMap = new Map<string, string>();
      if (profiles) {
        for (const p of profiles) {
          const first = ((p as any).display_name || "A student").split(" ")[0];
          nameMap.set((p as any).user_id, first);
        }
      }

      const getName = (uid: string) => nameMap.get(uid) || "A student";

      const result: TickerItem[] = [];

      (attendanceRes.data ?? []).forEach((r: any) => {
        result.push({ id: `c-${r.id}`, text: `${getName(r.user_id)} joined a live call`, type: "call" });
      });

      (journalRes.data ?? []).forEach((r: any) => {
        result.push({ id: `j-${r.id}`, text: `${getName(r.user_id)} journaled a trade`, type: "journal" });
      });

      (lessonsRes.data ?? []).forEach((r: any) => {
        result.push({ id: `l-${r.id}`, text: `${getName(r.user_id)} watched a lesson`, type: "lesson" });
      });

      if (result.length === 0) return;

      const shuffled = shuffle(result).slice(0, 3);
      setItems(shuffled);
      writeCache(shuffled);
    };

    fetchAll();
  }, []);

  // Auto-rotate every 5s
  useEffect(() => {
    if (items.length < 2) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [items.length]);

  const displayItems = useMemo(() => items.slice(0, 3), [items]);

  if (displayItems.length === 0) return null;

  const icon = (type: TickerItem["type"]) => {
    switch (type) {
      case "call":
        return (
          <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/15">
            <Video className="h-3.5 w-3.5 text-emerald-400" />
          </span>
        );
      case "journal":
        return (
          <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/15">
            <PenLine className="h-3.5 w-3.5 text-amber-400" />
          </span>
        );
      case "lesson":
        return (
          <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/15">
            <BookOpen className="h-3.5 w-3.5 text-blue-400" />
          </span>
        );
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] px-4 py-3"
      style={{
        background: "radial-gradient(ellipse at top, rgba(59,130,246,0.08), transparent 70%), hsl(222,20%,10%)",
        boxShadow: "0 0 20px rgba(59,130,246,0.05), 0 10px 30px rgba(0,0,0,0.4)",
      }}
    >
      {/* Shimmer top edge */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />

      <div className="flex items-center gap-3">
        {/* Card content — crossfade */}
        <div className="flex-1 relative h-6 overflow-hidden">
          {displayItems.map((item, i) => (
            <div
              key={item.id}
              className="absolute inset-0 flex items-center gap-2 transition-all duration-500 ease-in-out"
              style={{
                opacity: i === activeIndex % displayItems.length ? 1 : 0,
                transform: i === activeIndex % displayItems.length ? "translateX(0)" : "translateX(12px)",
              }}
            >
              {icon(item.type)}
              <span className="text-xs font-medium text-white/70 truncate">{item.text}</span>
            </div>
          ))}
        </div>

        {/* Dot indicators */}
        {displayItems.length > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            {displayItems.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                  i === activeIndex % displayItems.length
                    ? "bg-primary"
                    : "bg-white/20"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
