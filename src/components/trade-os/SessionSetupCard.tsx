import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock, Play, Ban, AlertTriangle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SessionTimes { start: string; cutoff: string; hardClose: string; }

export type SessionPhaseLabel = "Pre-session" | "Trading window" | "No new entries" | "Session closed" | null;

function getStorageKey(dateOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dateOffset);
  return `va_session_times_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function loadTimes(): SessionTimes | null {
  try { const raw = localStorage.getItem(getStorageKey()); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function loadYesterdayTimes(): SessionTimes | null {
  try { const raw = localStorage.getItem(getStorageKey(-1)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function saveTimes(t: SessionTimes) { localStorage.setItem(getStorageKey(), JSON.stringify(t)); }
function toMs(time: string): number {
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0).getTime();
}
function fmtCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}
function fmt12h(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** Compute session phase from times + now — shared helper */
function computePhase(times: SessionTimes | null, now: number) {
  if (!times) return null;
  const startMs = toMs(times.start); const cutoffMs = toMs(times.cutoff); const closeMs = toMs(times.hardClose);
  if (now < startMs) return { label: "Pre-session" as const, color: "text-primary", bg: "bg-primary/10", countdown: fmtCountdown(startMs - now), countdownLabel: "Starts in" };
  if (now < cutoffMs) return { label: "Trading window" as const, color: "text-emerald-400", bg: "bg-emerald-500/10", countdown: fmtCountdown(cutoffMs - now), countdownLabel: "Cutoff in" };
  if (now < closeMs) return { label: "No new entries" as const, color: "text-amber-400", bg: "bg-amber-500/10", countdown: fmtCountdown(closeMs - now), countdownLabel: "Hard close in" };
  return { label: "Session closed" as const, color: "text-red-400", bg: "bg-red-500/10", countdown: null, countdownLabel: null };
}

interface SessionSetupCardProps {
  onSessionStarted?: () => void;
  onPhaseChange?: (phase: SessionPhaseLabel) => void;
}

export function SessionSetupCard({ onSessionStarted, onPhaseChange }: SessionSetupCardProps) {
  const yesterday = loadYesterdayTimes();
  const [times, setTimes] = useState<SessionTimes | null>(loadTimes);
  const [draft, setDraft] = useState<SessionTimes>(yesterday || { start: "09:30", cutoff: "11:00", hardClose: "12:00" });
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const handleStart = () => {
    saveTimes(draft);
    setTimes(draft);
    onSessionStarted?.();
  };

  const handleSameAsYesterday = () => {
    if (!yesterday) return;
    saveTimes(yesterday);
    setTimes(yesterday);
    onSessionStarted?.();
  };

  const handleEdit = () => {
    setDraft(times || yesterday || { start: "09:30", cutoff: "11:00", hardClose: "12:00" });
    setTimes(null);
  };

  const sessionPhase = useMemo(() => computePhase(times, now), [times, now]);

  // Notify parent of phase changes
  useEffect(() => {
    onPhaseChange?.(sessionPhase?.label ?? null);
  }, [sessionPhase?.label]);

  // Not set — show setup form
  if (!times) {
    return (
      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 border border-primary/20">
            <Clock className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Set Your Session Window</p>
            <p className="text-[10px] text-muted-foreground/60">Define when you trade, when to stop entries, and when to close.</p>
          </div>
        </div>

        {/* Same as yesterday — one-tap */}
        {yesterday && (
          <Button
            variant="outline"
            className="w-full h-9 gap-1.5 rounded-lg text-xs font-semibold border-primary/20 text-primary hover:bg-primary/10"
            onClick={handleSameAsYesterday}
          >
            <RotateCcw className="h-3 w-3" />
            Same as yesterday ({fmt12h(yesterday.start)} – {fmt12h(yesterday.hardClose)})
          </Button>
        )}

        <div className="grid grid-cols-3 gap-2">
          {([
            { key: "start" as const, label: "Start" },
            { key: "cutoff" as const, label: "No New Entry" },
            { key: "hardClose" as const, label: "Hard Close" },
          ]).map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{label}</label>
              <input
                type="time"
                value={draft[key]}
                onChange={(e) => setDraft(d => ({ ...d, [key]: e.target.value }))}
                className="w-full h-9 px-2 text-xs font-semibold bg-black/30 border border-white/[0.08] rounded-lg text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              />
            </div>
          ))}
        </div>

        <Button className="w-full h-9 gap-1.5 rounded-lg text-xs font-semibold" onClick={handleStart}>
          <Play className="h-3 w-3" /> Start Session
        </Button>
      </div>
    );
  }

  // Session active — show live status
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      {/* Phase header */}
      <div className={cn("flex items-center justify-between px-3 py-2", sessionPhase?.bg)}>
        <div className="flex items-center gap-2">
          {sessionPhase?.label === "No new entries" ? (
            <Ban className="h-3.5 w-3.5 text-amber-400" />
          ) : sessionPhase?.label === "Session closed" ? (
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
          )}
          <span className={cn("text-xs font-bold uppercase tracking-wide", sessionPhase?.color)}>
            {sessionPhase?.label}
          </span>
        </div>
        <button onClick={handleEdit} className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">
          Edit
        </button>
      </div>

      {/* Timer + windows */}
      <div className="px-3 py-2.5 space-y-2">
        {sessionPhase?.countdown && (
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground/50 font-medium uppercase tracking-wider">{sessionPhase.countdownLabel}</p>
            <p className={cn("text-2xl font-black tabular-nums tracking-tight", sessionPhase.color)}>
              {sessionPhase.countdown}
            </p>
          </div>
        )}

        <div className="flex gap-1">
          {([
            { key: "start" as const, label: "Start" },
            { key: "cutoff" as const, label: "Cutoff" },
            { key: "hardClose" as const, label: "Close" },
          ]).map(({ key, label }) => (
            <div key={key} className="flex-1 rounded-md bg-white/[0.03] border border-white/[0.04] py-1.5 text-center">
              <p className="text-[8px] text-muted-foreground/40 font-medium uppercase">{label}</p>
              <p className="text-[11px] font-bold text-foreground/70 tabular-nums">{fmt12h(times[key])}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Compact inline countdown — for cockpit mode */
export function SessionCountdownLine({ className }: { className?: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const times = loadTimes();
  const phase = useMemo(() => computePhase(times, now), [times, now]);

  if (!phase) return <span className={cn("text-[10px] text-muted-foreground/40 italic", className)}>No session set</span>;

  return (
    <span className={cn("text-[10px] font-bold tabular-nums", phase.color, className)}>
      {phase.label}
      {phase.countdown && <> · {phase.countdownLabel}: {phase.countdown}</>}
    </span>
  );
}

export { loadTimes, type SessionTimes };
