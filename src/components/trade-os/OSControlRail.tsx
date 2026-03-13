import { Shield, AlertTriangle, CheckCircle2, Plus, RefreshCw, ClipboardCheck, Clock, Ban } from "lucide-react";
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

export function OSControlRail({ activePlan, vaultState, todayTradeCount, activeStage, onQuickAction, onLogFromPlan }: OSControlRailProps) {
  const totalTrades = vaultState.trades_remaining_today + todayTradeCount;
  const riskPct = vaultState.daily_loss_limit > 0
    ? Math.max(0, Math.min(100, (vaultState.risk_remaining_today / vaultState.daily_loss_limit) * 100))
    : 0;

  const quickLabel = activeStage === "plan" ? "Check Trade" : activeStage === "live" ? "Log Result" : activeStage === "review" ? "Check In" : "Refresh AI";
  const QuickIcon = activeStage === "plan" ? Shield : activeStage === "live" ? Plus : activeStage === "review" ? ClipboardCheck : RefreshCw;

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

  const statusDot = vaultState.vault_status === "GREEN" ? "bg-emerald-400" : vaultState.vault_status === "YELLOW" ? "bg-amber-400" : "bg-red-400";
  const statusText = vaultState.vault_status === "GREEN" ? "Clear" : vaultState.vault_status === "YELLOW" ? "Caution" : "Blocked";
  const statusColor = vaultState.vault_status === "GREEN" ? "text-emerald-400" : vaultState.vault_status === "YELLOW" ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-2.5">
      {/* Status */}
      <div className="flex items-center gap-2">
        <span className={cn("w-[6px] h-[6px] rounded-full shrink-0", statusDot, vaultState.vault_status === "GREEN" && "shadow-[0_0_8px_rgba(52,211,153,0.5)]")} />
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
          {onLogFromPlan && (
            <Button size="sm" className="w-full h-7 text-[10px] rounded-lg gap-1" onClick={() => onLogFromPlan(activePlan)}>
              <CheckCircle2 className="h-3 w-3" /> Log Result
            </Button>
          )}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground/40 italic">No active plan</p>
      )}

      <div className="h-px bg-white/[0.04]" />

      {/* Risk */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className={cn("text-base font-bold tabular-nums", vaultState.risk_remaining_today <= 0 ? "text-red-400" : "text-foreground")}>
            ${vaultState.risk_remaining_today.toFixed(0)}
          </span>
          <span className="text-[9px] text-muted-foreground/40">/ ${vaultState.daily_loss_limit.toFixed(0)}</span>
        </div>
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mt-1">
          <div
            className={cn("h-full rounded-full transition-all", riskPct > 50 ? "bg-emerald-400/70" : riskPct > 20 ? "bg-amber-400/70" : "bg-red-400/70")}
            style={{ width: `${riskPct}%` }}
          />
        </div>
      </div>

      {/* Trades */}
      <div className="flex items-baseline gap-1">
        <span className="text-base font-bold tabular-nums text-foreground">{todayTradeCount}</span>
        <span className="text-[10px] text-muted-foreground/40">/ {totalTrades} trades</span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: totalTrades }).map((_, i) => (
          <div key={i} className={cn("flex-1 h-1.5 rounded-full", i < todayTradeCount ? "bg-primary/70" : "bg-white/[0.06]")} />
        ))}
      </div>

      <div className="h-px bg-white/[0.04]" />

      {/* Compact Session Timer (read-only, set from Live stage) */}
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
      {vaultState.last_block_reason && (
        <div className="flex items-start gap-1.5 py-1">
          <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-400/70 leading-snug">{vaultState.last_block_reason}</p>
        </div>
      )}

      {/* Quick Action */}
      <Button
        size="sm"
        className="w-full h-7 text-[10px] font-semibold rounded-lg gap-1.5"
        onClick={onQuickAction}
      >
        <QuickIcon className="h-3 w-3" /> {quickLabel}
      </Button>
    </div>
  );
}
