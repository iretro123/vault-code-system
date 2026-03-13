import { AlertTriangle, CheckCircle2, Clock, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { detectTier, TIER_DEFAULTS } from "@/lib/tradePlannerCalc";
import type { ApprovedPlan } from "@/hooks/useApprovedPlans";
import type { DayState } from "@/hooks/useSessionStage";

interface OSControlRailProps {
  activePlan: ApprovedPlan | null;
  trackedBalance: number | null;
  vaultAccountBalance: number;
  todayTradeCount: number;
  maxTradesPerDay: number;
  vaultStatus: string;
  lastBlockReason: string | null;
  dayState: DayState;
  dayStateStatus: string;
  dayStateCta: string;
  onQuickAction: () => void;
  onLogFromPlan?: (plan: ApprovedPlan) => void;
}

function getStorageKey() {
  const d = new Date();
  return `va_session_times_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function loadTimes() {
  try { const raw = localStorage.getItem(getStorageKey()); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
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

export function OSControlRail({
  activePlan, trackedBalance, vaultAccountBalance, todayTradeCount, maxTradesPerDay,
  vaultStatus, lastBlockReason, dayState, dayStateStatus, dayStateCta,
  onQuickAction, onLogFromPlan,
}: OSControlRailProps) {
  // Unified risk from trackedBalance + TIER_DEFAULTS
  const bal = trackedBalance ?? vaultAccountBalance;
  const tier = detectTier(bal);
  const defaults = TIER_DEFAULTS[tier];
  const riskBudget = bal * (defaults.riskPercent / 100);

  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const times = loadTimes();
  const sessionPhase = useMemo(() => {
    if (!times) return null;
    const startMs = toMs(times.start); const cutoffMs = toMs(times.cutoff); const closeMs = toMs(times.hardClose);
    if (now < startMs) return { label: "Pre-session", color: "text-primary", countdown: fmtCountdown(startMs - now), countdownLabel: "Starts in" };
    if (now < cutoffMs) return { label: "Trading", color: "text-emerald-400", countdown: fmtCountdown(cutoffMs - now), countdownLabel: "Cutoff in" };
    if (now < closeMs) return { label: "No entries", color: "text-amber-400", countdown: fmtCountdown(closeMs - now), countdownLabel: "Closes in" };
    return { label: "Closed", color: "text-red-400", countdown: null, countdownLabel: null };
  }, [times, now]);

  const statusDot = vaultStatus === "GREEN" ? "bg-emerald-400" : vaultStatus === "YELLOW" ? "bg-amber-400" : "bg-red-400";
  const statusText = vaultStatus === "GREEN" ? "Clear" : vaultStatus === "YELLOW" ? "Caution" : "Blocked";
  const statusColor = vaultStatus === "GREEN" ? "text-emerald-400" : vaultStatus === "YELLOW" ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-2.5">
      {/* Day State Status Line */}
      <p className="text-[10px] text-muted-foreground/60 font-medium leading-snug">{dayStateStatus}</p>

      {/* Vault Status */}
      <div className="flex items-center gap-2">
        <span className={cn("w-[6px] h-[6px] rounded-full shrink-0", statusDot, vaultStatus === "GREEN" && "shadow-[0_0_8px_rgba(52,211,153,0.5)]")} />
        <span className={cn("text-[11px] font-bold", statusColor)}>{statusText}</span>
      </div>

      {/* Active Plan */}
      {activePlan ? (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[11px] font-bold text-foreground">{activePlan.ticker || "—"}</span>
            <span className="text-[10px] text-muted-foreground/50">{activePlan.direction} · {activePlan.contracts_planned}ct</span>
          </div>
          <p className="text-[10px] text-muted-foreground/50 pl-3">
            ${Number(activePlan.entry_price_planned).toFixed(2)} · Max ${Number(activePlan.max_loss_planned).toFixed(0)}
          </p>
          {onLogFromPlan && dayState === "live_session" && (
            <Button size="sm" className="w-full h-7 text-[10px] rounded-lg gap-1" onClick={() => onLogFromPlan(activePlan)}>
              <CheckCircle2 className="h-3 w-3" /> Log Result
            </Button>
          )}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground/40 italic">No active plan</p>
      )}

      <div className="h-px bg-white/[0.04]" />

      {/* Risk — unified source */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className={cn("text-base font-bold tabular-nums", riskBudget <= 0 ? "text-red-400" : "text-foreground")}>
            ${riskBudget.toFixed(0)}
          </span>
          <span className="text-[9px] text-muted-foreground/40">risk budget</span>
        </div>
        <p className="text-[9px] text-muted-foreground/30 mt-0.5">{tier} · {defaults.riskPercent}%</p>
      </div>

      {/* Trades */}
      <div className="flex items-baseline gap-1">
        <span className="text-base font-bold tabular-nums text-foreground">{todayTradeCount}</span>
        <span className="text-[10px] text-muted-foreground/40">/ {maxTradesPerDay} trades</span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: maxTradesPerDay }).map((_, i) => (
          <div key={i} className={cn("flex-1 h-1.5 rounded-full", i < todayTradeCount ? "bg-primary/70" : "bg-white/[0.06]")} />
        ))}
      </div>

      <div className="h-px bg-white/[0.04]" />

      {/* Compact Session Timer */}
      {sessionPhase ? (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            {sessionPhase.label === "No entries" ? <Ban className="h-3 w-3 text-amber-400" /> : <Clock className="h-3 w-3 text-muted-foreground/50" />}
            <span className={cn("text-[10px] font-bold uppercase tracking-wide", sessionPhase.color)}>{sessionPhase.label}</span>
          </div>
          {sessionPhase.countdown && (
            <p className={cn("text-[11px] font-bold tabular-nums", sessionPhase.color)}>
              {sessionPhase.countdownLabel}: {sessionPhase.countdown}
            </p>
          )}
          <div className="flex gap-0.5 text-center">
            {(["start", "cutoff", "hardClose"] as const).map(k => (
              <div key={k} className="flex-1 rounded-md bg-white/[0.02] py-0.5">
                <p className="text-[8px] text-muted-foreground/30 font-medium uppercase">{k === "hardClose" ? "Close" : k}</p>
                <p className="text-[10px] font-semibold text-foreground/60 tabular-nums">{fmt12h(times[k])}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground/40 italic">No session set</p>
      )}

      {/* Restrictions */}
      {lastBlockReason && (
        <div className="flex items-start gap-1.5 py-1">
          <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-400/70 leading-snug">{lastBlockReason}</p>
        </div>
      )}

      {/* Primary CTA — driven by DayState */}
      <Button
        size="sm"
        className="w-full h-7 text-[10px] font-semibold rounded-lg gap-1.5"
        onClick={onQuickAction}
      >
        {dayStateCta}
      </Button>
    </div>
  );
}
