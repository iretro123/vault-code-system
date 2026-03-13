import { useState, useEffect, useMemo } from "react";
import { Clock, AlertTriangle, Ban, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SessionTimes {
  start: string;   // "HH:MM" 24h
  cutoff: string;
  hardClose: string;
}

function getStorageKey() {
  const d = new Date();
  return `va_session_times_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadTimes(): SessionTimes | null {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveTimes(t: SessionTimes) {
  localStorage.setItem(getStorageKey(), JSON.stringify(t));
}

function toMs(time: string): number {
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
  return target.getTime();
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function SessionSetupCard() {
  const [times, setTimes] = useState<SessionTimes | null>(loadTimes);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SessionTimes>({ start: "09:30", cutoff: "11:00", hardClose: "12:00" });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleSave = () => {
    saveTimes(draft);
    setTimes(draft);
    setEditing(false);
  };

  const handleEdit = () => {
    setDraft(times || { start: "09:30", cutoff: "11:00", hardClose: "12:00" });
    setEditing(true);
  };

  // No times set — show setup prompt
  if (!times && !editing) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
          <p className="text-xs font-semibold text-foreground">Set Your Session Times</p>
        </div>
        <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
          Define when your trading window starts, when to stop taking new entries, and when to close all positions.
        </p>
        <Button size="sm" className="h-8 text-[11px] gap-1.5 rounded-lg px-4" onClick={handleEdit}>
          <Settings2 className="h-3 w-3" /> Set Times
        </Button>
      </div>
    );
  }

  // Editing mode
  if (editing) {
    return (
      <div className="rounded-lg border border-primary/15 bg-primary/[0.03] p-4 space-y-3">
        <p className="text-xs font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-primary" /> Session Times
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">Start</label>
            <input
              type="time"
              value={draft.start}
              onChange={(e) => setDraft(d => ({ ...d, start: e.target.value }))}
              className="w-full h-9 px-2 text-xs font-semibold bg-black/20 border border-white/[0.06] rounded-lg text-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20 outline-none"
            />
            <p className="text-[9px] text-muted-foreground/30">Trading opens</p>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">Cutoff</label>
            <input
              type="time"
              value={draft.cutoff}
              onChange={(e) => setDraft(d => ({ ...d, cutoff: e.target.value }))}
              className="w-full h-9 px-2 text-xs font-semibold bg-black/20 border border-white/[0.06] rounded-lg text-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20 outline-none"
            />
            <p className="text-[9px] text-muted-foreground/30">No new entries</p>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">Hard Close</label>
            <input
              type="time"
              value={draft.hardClose}
              onChange={(e) => setDraft(d => ({ ...d, hardClose: e.target.value }))}
              className="w-full h-9 px-2 text-xs font-semibold bg-black/20 border border-white/[0.06] rounded-lg text-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20 outline-none"
            />
            <p className="text-[9px] text-muted-foreground/30">Close positions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="h-7 text-[11px] rounded-lg px-3" onClick={handleSave}>Save</Button>
          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground/50" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  // Live countdown display
  const startMs = toMs(times!.start);
  const cutoffMs = toMs(times!.cutoff);
  const hardCloseMs = toMs(times!.hardClose);

  const beforeStart = now < startMs;
  const inWindow = now >= startMs && now < cutoffMs;
  const pastCutoff = now >= cutoffMs && now < hardCloseMs;
  const pastClose = now >= hardCloseMs;

  const currentPhaseLabel = beforeStart ? "Pre-session" : inWindow ? "Trading window" : pastCutoff ? "No new entries" : "Session closed";
  const currentPhaseColor = beforeStart ? "text-primary" : inWindow ? "text-emerald-400" : pastCutoff ? "text-amber-400" : "text-red-400";
  const currentPhaseBg = beforeStart ? "bg-primary/[0.04]" : inWindow ? "bg-emerald-500/[0.04]" : pastCutoff ? "bg-amber-500/[0.04]" : "bg-red-500/[0.04]";

  return (
    <div className={cn("rounded-lg border border-white/[0.06] p-3.5 space-y-2.5", currentPhaseBg)}>
      {/* Phase label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {pastCutoff ? (
            <Ban className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          ) : pastClose ? (
            <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
          )}
          <span className={cn("text-xs font-bold uppercase tracking-wide", currentPhaseColor)}>
            {currentPhaseLabel}
          </span>
        </div>
        <button onClick={handleEdit} className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">
          Edit
        </button>
      </div>

      {/* Time slots with countdowns */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[9px] text-muted-foreground/40 font-medium uppercase">Start</p>
          <p className="text-[11px] font-semibold text-foreground/70 tabular-nums">{formatTime12h(times!.start)}</p>
          {beforeStart && (
            <p className="text-[10px] font-bold text-primary tabular-nums mt-0.5">
              in {formatCountdown(startMs - now)}
            </p>
          )}
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground/40 font-medium uppercase">Cutoff</p>
          <p className="text-[11px] font-semibold text-foreground/70 tabular-nums">{formatTime12h(times!.cutoff)}</p>
          {inWindow && (
            <p className="text-[10px] font-bold text-amber-400 tabular-nums mt-0.5">
              in {formatCountdown(cutoffMs - now)}
            </p>
          )}
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground/40 font-medium uppercase">Close</p>
          <p className="text-[11px] font-semibold text-foreground/70 tabular-nums">{formatTime12h(times!.hardClose)}</p>
          {(inWindow || pastCutoff) && (
            <p className="text-[10px] font-bold text-red-400 tabular-nums mt-0.5">
              in {formatCountdown(hardCloseMs - now)}
            </p>
          )}
        </div>
      </div>

      {/* Phase guidance */}
      <p className="text-[10px] text-muted-foreground/40 leading-relaxed">
        {beforeStart && "Wait for your session to begin. Use this time to prepare your plan."}
        {inWindow && "You're in the trading window. Execute your approved plan."}
        {pastCutoff && "No new positions. Manage current risk only."}
        {pastClose && "Begin closing positions. Tighten stop-loss and exit."}
      </p>
    </div>
  );
}
