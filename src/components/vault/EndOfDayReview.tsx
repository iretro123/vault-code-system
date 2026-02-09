import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Shield, ShieldAlert, ShieldOff } from "lucide-react";

interface EodData {
  trades_taken: number;
  trades_blocked: number;
  risk_used: number;
  risk_saved: number;
  final_vault_status: string;
  total_result: number;
}

interface WeeklyStability {
  stability_score: number;
}

const STATUS_ICON: Record<string, React.ElementType> = {
  GREEN: Shield,
  YELLOW: ShieldAlert,
  RED: ShieldOff,
};

export function EndOfDayReview() {
  const { user } = useAuth();
  const [data, setData] = useState<EodData | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    try {
      const { data: rows, error } = await supabase.rpc("get_eod_review", {
        _user_id: user.id,
      });
      if (!mounted.current) return;
      if (!error && rows && rows.length > 0) {
        const r = rows[0];
        setData({
          trades_taken: r.trades_taken,
          trades_blocked: r.trades_blocked,
          risk_used: Number(r.risk_used),
          risk_saved: Number(r.risk_saved),
          final_vault_status: r.final_vault_status,
          total_result: Number(r.total_result),
        });
      }
    } catch (err) {
      console.error("EOD review fetch error:", err);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    mounted.current = true;
    fetch();
    return () => { mounted.current = false; };
  }, [fetch]);

  // Subscribe to vault_state changes for live updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`eod-review-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "vault_state", filter: `user_id=eq.${user.id}` }, () => fetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "trade_intents", filter: `user_id=eq.${user.id}` }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetch]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-4 bg-muted/30 rounded w-2/3" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-muted/30 rounded" />
          <div className="h-16 bg-muted/30 rounded" />
          <div className="h-16 bg-muted/30 rounded" />
          <div className="h-16 bg-muted/30 rounded" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const Icon = STATUS_ICON[data.final_vault_status] ?? Shield;
  const hasBlocked = data.trades_blocked > 0;
  const showPrevention = hasBlocked || data.final_vault_status === "RED";

  return (
    <div className="space-y-4">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/10 border border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Trades Taken</p>
          <p className="text-lg font-mono font-semibold text-foreground tabular-nums">{data.trades_taken}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/10 border border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Trades Blocked</p>
          <p className="text-lg font-mono font-semibold text-foreground tabular-nums">{data.trades_blocked}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/10 border border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Risk Used</p>
          <p className="text-lg font-mono font-semibold text-foreground tabular-nums">${data.risk_used.toFixed(0)}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/10 border border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Risk Saved</p>
          <p className={cn(
            "text-lg font-mono font-semibold tabular-nums",
            data.risk_saved > 0 ? "text-emerald-400" : "text-foreground"
          )}>
            ${data.risk_saved.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Final Status */}
      <div className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/10 border border-border">
        <Icon className={cn("h-5 w-5", {
          "text-emerald-500": data.final_vault_status === "GREEN",
          "text-amber-500": data.final_vault_status === "YELLOW",
          "text-rose-500": data.final_vault_status === "RED",
        })} />
        <div>
          <p className="text-xs text-muted-foreground">Final Vault Status</p>
          <p className="text-sm font-bold uppercase tracking-wide text-foreground">{data.final_vault_status}</p>
        </div>
      </div>

      {/* Summary Messages */}
      {showPrevention && (
        <p className="text-xs text-muted-foreground text-center pt-1 font-medium">
          Vault OS prevented further losses today.
        </p>
      )}
      {hasBlocked && (
        <p className="text-xs text-muted-foreground text-center">
          Blocked {data.trades_blocked} trade{data.trades_blocked !== 1 ? "s" : ""} and
          prevented an estimated <span className="font-mono font-semibold text-foreground">${data.risk_saved.toFixed(0)}</span> loss.
        </p>
      )}
    </div>
  );
}
