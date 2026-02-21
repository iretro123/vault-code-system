import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface NextMove {
  title: string;
  ctaLabel: string;
  route: string;
  isCheckIn?: boolean;
}

interface Props {
  onCheckIn?: () => void;
}

export function NextStepCard({ onCheckIn }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [move, setMove] = useState<NextMove | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    resolveNextMove(user.id).then((m) => {
      if (!cancelled) {
        setMove(m);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [user]);

  if (loading || !move) {
    return (
      <div className="vault-glass-card p-8 flex items-center justify-center h-[140px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleClick = () => {
    if (move.isCheckIn && onCheckIn) {
      onCheckIn();
    } else {
      navigate(move.route);
    }
  };

  return (
    <div className="vault-glass-card p-8 space-y-5">
      <h3 className="text-xl font-bold text-[rgba(255,255,255,0.94)] leading-tight">
        {move.title}
      </h3>
      <Button
        onClick={handleClick}
        className="rounded-xl font-semibold gap-2 h-12 px-8 text-sm"
      >
        {move.ctaLabel}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

async function resolveNextMove(userId: string): Promise<NextMove> {
  const now = new Date();
  const todayDate = now.toISOString().slice(0, 10);
  const monday = new Date(now);
  monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  const mondayDate = monday.toISOString().slice(0, 10);

  const [tradesWeekRes, firstLessonRes, checkinRes, journalWeekRes] = await Promise.all([
    supabase
      .from("academy_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("room_slug", "trade-recaps")
      .gte("created_at", new Date(monday).toISOString()),
    supabase
      .from("lesson_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("completed", true),
    supabase
      .from("vault_daily_checklist")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("date", todayDate),
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("entry_date", mondayDate),
  ]);

  if ((tradesWeekRes.count ?? 0) === 0) {
    return { title: "Log 1 trade to stay on track", ctaLabel: "Log Trade", route: "/academy/trade" };
  }
  if ((firstLessonRes.count ?? 0) === 0) {
    return { title: "Watch Lesson 1 (10 min)", ctaLabel: "Watch", route: "/academy/learn" };
  }
  if ((checkinRes.count ?? 0) === 0) {
    return { title: "Check in (30s)", ctaLabel: "Check In", route: "/academy/home#checkin", isCheckIn: true };
  }
  if ((journalWeekRes.count ?? 0) === 0) {
    return { title: "Weekly Review due", ctaLabel: "Complete Review", route: "/academy/journal" };
  }
  return { title: "You're on track", ctaLabel: "Go to Trade Floor", route: "/academy/community" };
}
