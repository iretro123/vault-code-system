import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TradeIntent {
  id: string;
  created_at: string;
  direction: string;
  contracts: number;
  estimated_risk: number;
  status: string;
  closed_at: string | null;
  block_reason: string | null;
}

export default function VaultLog() {
  const { user } = useAuth();

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ["vault-log", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("trade_intents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as TradeIntent[];
    },
    enabled: !!user,
  });

  return (
    <AuthGate>
      <AppLayout>
        <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 space-y-4">
          <h1 className="text-lg font-semibold text-foreground">History</h1>
          <p className="text-xs text-muted-foreground">
            Read-only history of all trade intents processed by the Vault.
          </p>

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : trades.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No trades recorded yet.</p>
          ) : (
            <div className="vault-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Direction</TableHead>
                    <TableHead className="text-xs text-right">Contracts</TableHead>
                    <TableHead className="text-xs text-right">Risk</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((t, i) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs font-mono tabular-nums">
                        {format(new Date(t.created_at), "MM/dd HH:mm")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {trades.length - i}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-xs font-bold uppercase",
                            t.direction === "CALL" ? "text-emerald-500" : "text-rose-500"
                          )}
                        >
                          {t.direction}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono tabular-nums text-right">
                        {t.contracts}
                      </TableCell>
                      <TableCell className="text-xs font-mono tabular-nums text-right">
                        ${t.estimated_risk.toFixed(0)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-[10px] font-medium uppercase tracking-wide",
                            t.status === "approved"
                              ? "text-emerald-500"
                              : t.status === "closed"
                              ? "text-muted-foreground"
                              : "text-rose-500"
                          )}
                        >
                          {t.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </AppLayout>
    </AuthGate>
  );
}
