import { useState, useMemo, useRef, useCallback } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { format, startOfWeek, addDays, isSameDay, isToday, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Clock, ExternalLink, CalendarPlus, Coffee, ChevronLeft, ChevronRight } from "lucide-react";
import { playSwipeSound } from "@/lib/nativeFeedback";
import { formatTimeInTZ, getTZAbbr, getUserTimezone } from "@/lib/userTime";
import { useAuth } from "@/hooks/useAuth";

interface LiveSession {
  id: string;
  title: string;
  description: string;
  session_date: string;
  join_url: string;
  session_type: string;
  duration_minutes: number;
  status: string;
  is_replay: boolean;
  replay_url: string | null;
  created_by: string | null;
}

interface WeekScheduleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: LiveSession[];
  onJoin?: (session: LiveSession) => void;
  onCalendar?: (session: LiveSession) => void;
}

function getSessionDot(type: string) {
  if (type.includes("qa") || type.includes("office")) return "bg-amber-400";
  if (type.includes("prep")) return "bg-emerald-400";
  return "bg-primary";
}

function getSessionLabel(title: string, type: string) {
  const t = title.toLowerCase();
  if (t.includes("q&a") || t.includes("qa") || type === "office-hours") return "Q&A";
  if (t.includes("prep")) return "Market Prep";
  return "Live Trading";
}

export function WeekScheduleSheet({ open, onOpenChange, sessions, onJoin, onCalendar }: WeekScheduleSheetProps) {
  const { profile } = useAuth();
  const userTZ = getUserTimezone(profile?.timezone);
  const tzLabel = getTZAbbr(userTZ);
  const now = new Date();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(
    () => addDays(startOfWeek(now, { weekStartsOn: 1 }), weekOffset * 7),
    [weekOffset]
  );
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const todayIndex = weekOffset === 0 ? weekDays.findIndex((d) => isToday(d)) : -1;
  const [selectedDay, setSelectedDay] = useState(todayIndex >= 0 ? todayIndex : 0);

  // Touch swipe handling
  const touchStartX = useRef<number | null>(null);

  const handleWeekChange = useCallback((dir: -1 | 1) => {
    const next = weekOffset + dir;
    if (next < 0 || next > 1) return;
    setWeekOffset(next);
    if (next === 0) {
      const ti = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(now, { weekStartsOn: 1 }), i)).findIndex(d => isToday(d));
      setSelectedDay(ti >= 0 ? ti : 0);
    } else {
      setSelectedDay(0);
    }
    playSwipeSound();
  }, [weekOffset]);

  const handleDayTap = useCallback((i: number) => {
    setSelectedDay(i);
    playSwipeSound();
  }, []);

  const daySessions = useMemo(() => {
    const target = weekDays[selectedDay];
    return sessions.filter((s) => {
      const sd = new Date(s.session_date);
      if (!isSameDay(sd, target)) return false;
      if (s.status === "completed") return false;
      // Hide past sessions (before today)
      if (sd < todayStart) return false;
      return true;
    });
  }, [sessions, selectedDay, weekDays, todayStart]);

  const sessionCountByDay = useMemo(() => {
    return weekDays.map((day) =>
      sessions.filter((s) => {
        const sd = new Date(s.session_date);
        return isSameDay(sd, day) && s.status !== "completed" && sd >= todayStart;
      }).length
    );
  }, [sessions, weekDays, todayStart]);

  const weekLabel = weekOffset === 0 ? "This Week" : "Next Week";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-2xl border border-white/[0.08] bg-[hsl(214,24%,8%)] p-0 flex flex-col max-h-[70vh] mx-3 mb-[calc(env(safe-area-inset-bottom,16px)+3.5rem)] md:max-w-lg md:mx-auto md:mb-auto md:inset-x-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2"
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-0">
          <div className="mx-auto w-10 h-1 rounded-full bg-white/[0.12] mb-3" />
          <SheetTitle className="text-lg font-bold tracking-tight text-foreground">
            Weekly Schedule
          </SheetTitle>
        </SheetHeader>

        {/* Week Switcher */}
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <button
            onClick={() => handleWeekChange(-1)}
            disabled={weekOffset === 0}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              weekOffset === 0 ? "opacity-20 cursor-not-allowed" : "hover:bg-white/[0.06] text-white/60"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold uppercase tracking-widest text-white/50">
            {weekLabel} · {format(weekDays[0], "MMM d")} – {format(weekDays[6], "MMM d")}
          </span>
          <button
            onClick={() => handleWeekChange(1)}
            disabled={weekOffset === 1}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              weekOffset === 1 ? "opacity-20 cursor-not-allowed" : "hover:bg-white/[0.06] text-white/60"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day Picker Strip */}
        <div
          className="px-3 pt-2 pb-2 overflow-x-auto scrollbar-hide"
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const diff = e.changedTouches[0].clientX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(diff) > 60) {
              handleWeekChange(diff < 0 ? 1 : -1);
            }
          }}
        >
          <div className="flex gap-1.5 min-w-max px-1">
            {weekDays.map((day, i) => {
              const active = i === selectedDay;
              const today = isToday(day);
              const hasSession = sessionCountByDay[i] > 0;
              const isPast = day < todayStart && !today;

              return (
                <button
                  key={i}
                  onClick={() => handleDayTap(i)}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 px-3.5 py-2.5 rounded-2xl transition-all duration-200 min-w-[52px]",
                    active
                      ? "bg-primary/15 ring-1 ring-primary/40 shadow-[0_0_16px_-4px_hsl(217_91%_60%/0.25)]"
                      : "hover:bg-white/[0.04]",
                    isPast && !active && "opacity-40"
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      active ? "text-primary" : "text-white/35"
                    )}
                  >
                    {format(day, "EEE")}
                  </span>
                  <span
                    className={cn(
                      "text-lg font-bold tabular-nums leading-none",
                      active ? "text-white" : "text-white/60"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {today && (
                    <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary" />
                  )}
                  {hasSession && !today && (
                    <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-white/25" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Session Cards */}
        <div className="flex-1 overflow-y-auto px-4 pb-5 pt-2 space-y-3">
          {daySessions.length === 0 ? (
            <EmptyDay isToday={isToday(weekDays[selectedDay])} isPast={weekDays[selectedDay] < todayStart} />
          ) : (
            daySessions.map((session) => (
              <SessionCard key={session.id} session={session} onJoin={onJoin} onCalendar={onCalendar} userTZ={userTZ} tzLabel={tzLabel} />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ---------- Sub-components ---------- */

function EmptyDay({ isToday: today, isPast }: { isToday: boolean; isPast: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div
        className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
        style={{
          background: "radial-gradient(circle at 30% 30%, hsl(214 20% 16%) 0%, hsl(214 24% 10%) 100%)",
          border: "1px solid hsl(0 0% 100% / 0.06)",
        }}
      >
        <Coffee className="h-6 w-6 text-white/25" />
      </div>
      <p className="text-sm font-semibold text-white/50">No sessions</p>
      <p className="text-xs text-white/25 mt-1">
        {today
          ? "Rest day — review your trades and prep for the next session."
          : isPast
            ? "This day has passed."
            : "Nothing scheduled for this day."}
      </p>
    </div>
  );
}

function SessionCard({
  session,
  onJoin,
  onCalendar,
  userTZ,
  tzLabel,
}: {
  session: LiveSession;
  onJoin?: (s: LiveSession) => void;
  onCalendar?: (s: LiveSession) => void;
  userTZ: string;
  tzLabel: string;
}) {
  const dotColor = getSessionDot(session.session_type + session.title);
  const label = getSessionLabel(session.title, session.session_type);
  const startTime = new Date(session.session_date);
  const isLive =
    Date.now() >= startTime.getTime() &&
    Date.now() < startTime.getTime() + session.duration_minutes * 60_000;

  return (
    <div
      className={cn(
        "rounded-2xl p-4 transition-all duration-200",
        isLive && "ring-1 ring-red-500/25"
      )}
      style={{
        background: "radial-gradient(ellipse at 20% 0%, hsl(214 20% 15%) 0%, hsl(214 24% 10%) 70%)",
        border: "1px solid hsl(0 0% 100% / 0.06)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full shrink-0", dotColor)} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</span>
          {isLive && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-red-500/15 text-red-400 border border-red-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <span className="text-xs font-semibold text-white/40 tabular-nums">
          {formatTimeInTZ(session.session_date, userTZ)} {tzLabel}
        </span>
      </div>

      <h3 className="text-[15px] font-bold text-foreground tracking-tight">{session.title}</h3>
      {session.description && (
        <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{session.description}</p>
      )}

      <div className="flex items-center gap-1.5 mt-2">
        <Clock className="h-3 w-3 text-white/25" />
        <span className="text-[11px] text-white/30">{session.duration_minutes} min</span>
      </div>

      <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-white/[0.05]">
        {session.join_url && (
          <a
            href={session.join_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onJoin?.(session)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150",
              isLive
                ? "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[0_0_12px_-2px_rgba(239,68,68,0.3)] hover:brightness-110"
                : "bg-gradient-to-b from-primary to-[hsl(217,91%,50%)] text-primary-foreground hover:shadow-[0_0_12px_2px_hsl(217_91%_60%/0.15)] hover:brightness-110"
            )}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {isLive ? "Join Now" : "Join Zoom"}
          </a>
        )}
        <button
          onClick={() => onCalendar?.(session)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white/50 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-all duration-150"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Calendar
        </button>
      </div>
    </div>
  );
}
