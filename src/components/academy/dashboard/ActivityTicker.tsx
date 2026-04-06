import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, BookOpen, CheckCircle } from "lucide-react";

interface TickerItem {
  id: string;
  text: string;
  type: "win" | "checkin" | "lesson";
}

const CACHE_KEY = "va_activity_ticker";
const CACHE_TTL = 5 * 60_000; // 5 min

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

  useEffect(() => {
    const cached = readCache();
    if (cached && cached.length > 0) {
      setItems(cached);
      return;
    }

    const since = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();

    const fetchAll = async () => {
      const [winsRes, lessonsRes] = await Promise.all([
        supabase
          .from("academy_messages")
          .select("id, user_name, created_at")
          .eq("room_slug", "wins-proof")
          .eq("is_deleted", false)
          .is("parent_message_id", null)
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

      const result: TickerItem[] = [];

      (winsRes.data ?? []).forEach((w: any) => {
        const firstName = (w.user_name || "A trader").split(" ")[0];
        result.push({ id: `w-${w.id}`, text: `${firstName} posted a win 🏆`, type: "win" });
      });

      (lessonsRes.data ?? []).forEach((l: any) => {
        result.push({ id: `l-${l.id}`, text: `A student completed a lesson 📚`, type: "lesson" });
      });

      if (result.length === 0) return;

      const shuffled = shuffle(result).slice(0, 15);
      setItems(shuffled);
      writeCache(shuffled);
    };

    fetchAll();
  }, []);

  const doubled = useMemo(() => [...items, ...items], [items]);

  if (items.length < 2) return null;

  const icon = (type: TickerItem["type"]) => {
    switch (type) {
      case "win": return <Trophy className="h-3 w-3 text-amber-400 shrink-0" />;
      case "lesson": return <BookOpen className="h-3 w-3 text-blue-400 shrink-0" />;
      case "checkin": return <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-[hsl(220,10%,88%)] bg-[hsl(220,10%,97%)]">
      <div className="flex items-center ticker-scroll">
        {doubled.map((item, i) => (
          <span
            key={`${item.id}-${i}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs text-[hsl(220,10%,40%)] whitespace-nowrap font-medium"
          >
            {icon(item.type)}
            {item.text}
            <span className="text-[hsl(220,10%,82%)] mx-2">•</span>
          </span>
        ))}
      </div>

      <style>{`
        .ticker-scroll {
          animation: ticker-marquee ${items.length * 4}s linear infinite;
          width: max-content;
        }
        @keyframes ticker-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
