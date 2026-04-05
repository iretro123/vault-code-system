import { useState, useMemo } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { formatTime } from "@/lib/formatTime";
import { cn } from "@/lib/utils";
import { Clock, ExternalLink, CalendarPlus, Radio, Coffee } from "lucide-react";

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
}

interface WeekScheduleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: LiveSession[];
  onJoin?: (session: LiveSession) => void;
  onCalendar?: (session: LiveSession) => void;
}

const SESSION_DOT_COLORS: Record<string, string> = {
  live: "bg-primary",
  "office-hours": "bg-amber-400",
  prep: "bg-emerald-400",
};

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
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const todayIndex = weekDays.findIndex((d) => isToday(d));
  const [selectedDay, setSelectedDay] = useState(todayIndex >= 0 ? todayIndex : 0);

  const daySessions = useMemo(() => {
    const target = weekDays[selectedDay];
    return sessions.filter((s) => {
      const sd = new Date(s.session_date);
      return isSameDay(sd, target) && s.status !== "completed";
    });
  }, [sessions, selectedDay, weekDays]);

  // Count sessions per day for dot indicators
  const sessionCountByDay = useMemo(() => {
    return weekDays.map((day) =>
      sessions.filter((s) => isSameDay(new Date(s.session_date), day) && s.status !== "completed").length
    );
  }, [sessions, weekDays]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-white/[0.08] bg-[hsl(214,24%,8%)] p-0 max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-0">
          <div className="mx-auto w-10 h-1 rounded-full bg-white/[0.12] mb-3" />
          <SheetTitle className="text-lg font-bold tracking-tight text-foreground">
            This Week's Schedule
          </SheetTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(weekDays[0], "MMM d")} – {format(weekDays[6], "MMM d, yyyy")}
          </p>
        </SheetHeader>

        {/* Day Picker Strip */}
        <div className="px-3 pt-4 pb-2 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1.5 min-w-max px-1">
            {weekDays.map((day, i) => {
              const active = i === selectedDay;
              const today = isToday(day);
              const hasSession = sessionCountByDay[i] > 0;

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(i)}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 px-3.5 py-2.5 rounded-2xl transition-all duration-200 min-w-[52px]",
                    active
                      ? "bg-primary/15 ring-1 ring-primary/40 shadow-[0_0_16px_-4px_hsl(217_91%_60%/0.25)]"
                      : "hover:bg-white/[0.04]"
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
                  {/* Today dot */}
                  {today && (
                    <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary" />
                  )}
                  {/* Session indicator */}
                  {hasSession && !today && (
                    <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-white/25" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Session Cards */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2 space-y-3">
          {daySessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, hsl(214 20% 16%) 0%, hsl(214 24% 10%) 100%)",
                  border: "1px solid hsl(0 0% 100% / 0.06)",
                }}
              >
                <Coffee className="h-6 w-6 text-white/25" />
              </div>
              <p className="text-sm font-semibold text-white/50">No sessions</p>
              <p className="text-xs text-white/25 mt-1">
                {isToday(weekDays[selectedDay])
                  ? "Rest day — review your trades and prep for the next session."
                  : "Nothing scheduled for this day."}
              </p>
            </div>
          ) : (
            daySessions.map((session) => {
              const dotColor = getSessionDot(session.session_type + session.title);
              const label = getSessionLabel(session.title, session.session_type);
              const startTime = new Date(session.session_date);
              const isLive =
                Date.now() >= startTime.getTime() &&
                Date.now() < startTime.getTime() + session.duration_minutes * 60_000;

              return (
                <div
                  key={session.id}
                  className={cn(
                    "rounded-2xl p-4 transition-all duration-200",
                    isLive && "ring-1 ring-red-500/25"
                  )}
                  style={{
                    background:
                      "radial-gradient(ellipse at 20% 0%, hsl(214 20% 15%) 0%, hsl(214 24% 10%) 70%)",
                    border: "1px solid hsl(0 0% 100% / 0.06)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                  }}
                >
                  {/* Top row: badge + time */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", dotColor)} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                        {label}
                      </span>
                      {isLive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-red-500/15 text-red-400 border border-red-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                          Live
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-white/40 tabular-nums">
                      {formatTime(session.session_date)} ET
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-[15px] font-bold text-foreground tracking-tight">
                    {session.title}
                  </h3>
                  {session.description && (
                    <p className="text-xs text-white/40 mt-0.5 line-clamp-2">
                      {session.description}
                    </p>
                  )}

                  {/* Duration */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <Clock className="h-3 w-3 text-white/25" />
                    <span className="text-[11px] text-white/30">
                      {session.duration_minutes} min
                    </span>
                  </div>

                  {/* Actions */}
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
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
