import { Shield, AlertTriangle, CheckCircle2, Plus, RefreshCw, Calendar, ClipboardCheck, Clock, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import type { ApprovedPlan } from "@/hooks/useApprovedPlans";
import type { VaultState } from "@/contexts/VaultStateContext";
import type { SessionStage } from "@/hooks/useSessionStage";

interface OSControlRailProps {
  activePlan: ApprovedPlan | null;
  vaultState: VaultState;
  todayTradeCount: number;
  activeStage: SessionStage;
  onQuickAction: () => void;
  onLogFromPlan?: (plan: ApprovedPlan) => void;
}

const STATUS_META: Record<string, { dot: string; label: string; text: string; bg: string }> = {
  GREEN: { dot: "bg-emerald-400", label: "text-emerald-400", text: "Clear to trade", bg: "bg-emerald-500/[0.08]" },
  YELLOW: { dot: "bg-amber-400", label: "text-amber-400", text: "Approaching limits", bg: "bg-amber-500/[0.08]" },
  RED: { dot: "bg-red-400", label: "text-red-400", text: "Trading blocked", bg: "bg-red-500/[0.08]" },
};

interface SessionTimes { start: string; cutoff: string; hardClose: string; }

function getStorageKey() {
  const d = new Date();
  return `va_session_times_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function loadTimes(): SessionTimes | null {
  try { const raw = localStorage.getItem(getStorageKey()); return raw ? JSON.parse(raw) : null; } catch { return null; }
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

export function OSControlRail({ activePlan, vaultState, todayTradeCount, activeStage, onQuickAction, onLogFromPlan }: OSControlRailProps) {
  const sm = STATUS_META[vaultState.vault_status] || STATUS_META.RED;
  const totalTrades = vaultState.trades_remaining_today + todayTradeCount;
  const tradesUsed = totalTrades - vaultState.trades_remaining_today;
  const riskPct = vaultState.daily_loss_limit > 0
    ? Math.max(0, Math.min(100, (vaultState.risk_remaining_today / vaultState.daily_loss_limit) * 100))
    : 0;

  const quickLabel = activeStage === "plan" ? "Check Trade" : activeStage === "live" ? "Log Result" : activeStage === "review" ? "Check In" : "Refresh AI";
  const QuickIcon = activeStage === "plan" ? Shield : activeStage === "live" ? Plus : activeStage === "review" ? ClipboardCheck : RefreshCw;

  const [times, setTimes] = useState<SessionTimes | null>(loadTimes);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SessionTimes>({ start: "09:30", cutoff: "11:00", hardClose: "12:00" });
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const handleSaveSession = () => { saveTimes(draft); setTimes(draft); setEditing(false); };
  const handleEditSession = () => { setDraft(times || { start: "09:30", cutoff: "11:00", hardClose: "12:00" }); setEditing(true); };

  const sessionPhase = useMemo(() => {
    if (!times) return null;
    const startMs = toMs(times.start); const cutoffMs = toMs(times.cutoff); const closeMs = toMs(times.hardClose);
    if (now < startMs) return { label: "Pre-session", color: "text-primary", countdown: fmtCountdown(startMs - now), countdownLabel: "Starts in" };
    if (now < cutoffMs) return { label: "Trading window", color: "text-emerald-400", countdown: fmtCountdown(cutoffMs - now), countdownLabel: "Cutoff in" };
    if (now < closeMs) return { label: "No new entries", color: "text-amber-400", countdown: fmtCountdown(closeMs - now), countdownLabel: "Closes in" };
    return { label: "Session closed", color: "text-red-400", countdown: null, countdownLabel: null };
  }, [times, now]);

  return (
    <div className="space-y-3">
      {/* Vault Status */}
      <div className={cn("flex items-center gap-2 px-2.5 py-2 rounded-lg", sm.bg)}>
        <span className={cn(
          "w-[6px] h-[6px] rounded-full shrink-0",
          sm.dot,
          vaultState.vault_status === "GREEN" && "shadow-[0_0_10px_rgba(52,211,153,0.5)]"
        )} />
        <span className={cn("text-[11px] font-bold uppercase tracking-wide", sm.label)}>
          {vaultState.vault_status}
        </span>
        <span className="text-[10px] text-muted-foreground/40 ml-auto font-medium">{sm.text}</span>
      </div>

      {/* Active Plan */}
      <div>
        <p className="text-[10px] tracking-[0.08em] font-semibold text-muted-foreground/60 uppercase mb-1">Active Plan</p>
        {activePlan ? (
          <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.04] p-2 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-xs font-bold text-foreground">{activePlan.ticker || "—"}</span>
              <span className="text-[10px] text-muted-foreground/60">{activePlan.direction} · {activePlan.contracts_planned}ct</span>
            </div>
            <div className="text-[10px] text-muted-foreground/40 space-y-0.5 pl-3">
              <p>Entry: <strong className="text-foreground/70">${Number(activePlan.entry_price_planned).toFixed(2)}</strong> · Max loss: <strong className="text-foreground/70">${Number(activePlan.max_loss_planned).toFixed(0)}</strong></p>
            </div>
            {onLogFromPlan && (
              <Button size="sm" className="w-full h-7 text-[10px] rounded-md gap-1" onClick={() => onLogFromPlan(activePlan)}>
                <CheckCircle2 className="h-3 w-3" /> Log Result
              </Button>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground/40">No plan active</p>
        )}
      </div>

      {/* Risk Budget */}
      <div>
        <div className="flex items-baseline justify-between mb-0.5">
          <p className="text-[10px] tracking-[0.08em] font-semibold text-muted-foreground/60 uppercase">Risk Budget</p>
          <span className="text-[10px] text-muted-foreground/40">of ${vaultState.daily_loss_limit.toFixed(0)}</span>
        </div>
        <p className={cn("text-lg font-bold tabular-nums mb-1.5", vaultState.risk_remaining_today <= 0 ? "text-red-400" : "text-foreground")}>
          ${vaultState.risk_remaining_today.toFixed(0)}
        </p>
        <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", riskPct > 50 ? "bg-emerald-400/80" : riskPct > 20 ? "bg-amber-400/80" : "bg-red-400/80")}
            style={{ width: `${riskPct}%` }}
          />
        </div>
      </div>

      {/* Trades */}
      <div>
        <p className="text-[10px] tracking-[0.08em] font-semibold text-muted-foreground/60 uppercase mb-0.5">Trades</p>
        <div className="flex items-baseline gap-1 mb-1.5">
          <span className="text-lg font-bold tabular-nums text-foreground">{tradesUsed}</span>
          <span className="text-[10px] text-muted-foreground/40">/ {totalTrades}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalTrades }).map((_, i) => (
            <div key={i} className={cn("flex-1 h-2 rounded-full", i < tradesUsed ? "bg-primary/80" : "bg-white/[0.08]")} />
          ))}
        </div>
      </div>

      {/* Session Timing */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] tracking-[0.08em] font-semibold text-muted-foreground/60 uppercase">Session</p>
          {times && !editing && (
            <button onClick={handleEditSession} className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors">Edit</button>
          )}
        </div>

        {!times && !editing ? (
          <button onClick={handleEditSession} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border border-dashed border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02] transition-all text-left">
            <Clock className="h-3 w-3 text-muted-foreground/40 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-foreground/70">Set session times</p>
              <p className="text-[9px] text-muted-foreground/40">Start, cutoff, close</p>
            </div>
          </button>
        ) : editing ? (
          <div className="space-y-1.5 rounded-lg border border-primary/15 bg-primary/[0.03] p-2">
            {(["start", "cutoff", "hardClose"] as const).map(k => (
              <div key={k} className="flex items-center justify-between gap-2">
                <label className="text-[9px] font-medium text-muted-foreground/60 uppercase w-12">{k === "hardClose" ? "Close" : k}</label>
                <input
                  type="time"
                  value={draft[k]}
                  onChange={(e) => setDraft(d => ({ ...d, [k]: e.target.value }))}
                  className="h-6 px-1.5 text-[10px] font-semibold bg-black/30 border border-white/[0.08] rounded-md text-foreground outline-none focus:border-primary/40"
                />
              </div>
            ))}
            <div className="flex gap-1.5 pt-0.5">
              <Button size="sm" className="h-6 text-[10px] rounded-md px-2.5 flex-1" onClick={handleSaveSession}>Save</Button>
              <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground/50 px-2" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : sessionPhase ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              {sessionPhase.label === "No new entries" ? <Ban className="h-3 w-3 text-amber-400" /> : <Clock className="h-3 w-3 text-primary" />}
              <span className={cn("text-[10px] font-bold uppercase tracking-wide", sessionPhase.color)}>{sessionPhase.label}</span>
            </div>
            <div className="grid grid-cols-3 gap-0.5 text-center">
              {(["start", "cutoff", "hardClose"] as const).map(k => (
                <div key={k} className="rounded-md bg-white/[0.03] py-0.5">
                  <p className="text-[8px] text-muted-foreground/40 font-medium uppercase">{k === "hardClose" ? "Close" : k}</p>
                  <p className="text-[10px] font-semibold text-foreground/70 tabular-nums">{fmt12h(times![k])}</p>
                </div>
              ))}
            </div>
            {sessionPhase.countdown && (
              <p className={cn("text-xs font-bold tabular-nums text-center", sessionPhase.color)}>
                {sessionPhase.countdownLabel}: {sessionPhase.countdown}
              </p>
            )}
          </div>
        ) : null}
      </div>

      {/* Restrictions */}
      {vaultState.last_block_reason && (
        <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-amber-500/[0.06]">
          <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-400/80 leading-snug">{vaultState.last_block_reason}</p>
        </div>
      )}

      {/* Synced */}
      <div className="flex items-center gap-1.5 px-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse" />
        <span className="text-[9px] text-muted-foreground/40">Synced</span>
      </div>

      {/* Quick Action */}
      <Button
        size="sm"
        className="w-full h-8 text-[11px] font-semibold rounded-lg gap-1.5"
        onClick={onQuickAction}
      >
        <QuickIcon className="h-3 w-3" /> {quickLabel}
      </Button>
    </div>
  );
}
