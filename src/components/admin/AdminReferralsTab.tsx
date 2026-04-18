import { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2, Search, RefreshCw, Copy, UserPlus, Users, MousePointerClick,
  UserCheck, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTimeFull, formatDateShort } from "@/lib/formatTime";
import { toast } from "sonner";

// ─── Types ───

interface ReferralRow {
  id: string;
  referrer_user_id: string;
  referred_user_id: string | null;
  referred_email: string | null;
  status: string;
  created_at: string;
  referrer_email?: string | null;
  referrer_name?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  clicked: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  signed_up: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  converted: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const copyToClip = async (text: string) => {
  const { copyToClipboard } = await import("@/lib/copyToClipboard");
  const ok = await copyToClipboard(text);
  if (ok) {
    toast.success("Copied");
  } else {
    toast.error("Failed to copy");
  }
};

// ─── Main Component ───

export function AdminReferralsTab() {
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRow, setSelectedRow] = useState<ReferralRow | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch referrals
      const { data: referrals, error } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        console.error("[AdminReferrals] query error", error);
        setRows([]);
        setLoading(false);
        return;
      }

      // Fetch referrer profiles for display names/emails
      const referralRows = (referrals || []) as ReferralRow[];
      const referrerIds = [...new Set(referralRows.map((r) => r.referrer_user_id))].filter(Boolean) as string[];
      const profileMap: Record<string, { email: string | null; display_name: string | null }> = {};

      if (referrerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email, display_name")
          .in("user_id", referrerIds);

        if (profiles) {
          for (const p of profiles as { user_id: string; email: string | null; display_name: string | null }[]) {
            profileMap[p.user_id] = { email: p.email, display_name: p.display_name };
          }
        }
      }

      const enriched: ReferralRow[] = referralRows.map((r) => ({
        ...r,
        referrer_email: profileMap[r.referrer_user_id]?.email || null,
        referrer_name: profileMap[r.referrer_user_id]?.display_name || null,
      }));

      console.info("[AdminReferrals] rows loaded", enriched.length);
      setRows(enriched);
    } catch (err) {
      console.error("[AdminReferrals] fetch error", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Stats
  const stats = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const uniqueReferrers = new Set(rows.map((r) => r.referrer_user_id)).size;
    const clicked = rows.filter((r) => r.status === "clicked").length;
    const signedUp = rows.filter((r) => r.status === "signed_up").length;
    const last7d = rows.filter((r) => new Date(r.created_at).getTime() > sevenDaysAgo).length;
    const missingAttribution = rows.filter(
      (r) => r.status === "signed_up" && !r.referred_user_id
    ).length;
    const missingReferrer = rows.filter((r) => !r.referrer_user_id).length;

    return { total: rows.length, clicked, signedUp, uniqueReferrers, last7d, missingAttribution, missingReferrer };
  }, [rows]);

  // Filter
  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((r) =>
        r.referrer_email?.toLowerCase().includes(q) ||
        r.referred_email?.toLowerCase().includes(q) ||
        r.referrer_user_id.toLowerCase().includes(q) ||
        r.referred_user_id?.toLowerCase().includes(q) ||
        r.referrer_name?.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, statusFilter, debouncedSearch]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Referrals", value: stats.total, icon: UserPlus },
          { label: "Clicked", value: stats.clicked, icon: MousePointerClick, color: "text-blue-400" },
          { label: "Signed Up", value: stats.signedUp, icon: UserCheck, color: "text-emerald-400" },
          { label: "Unique Referrers", value: stats.uniqueReferrers, icon: Users, color: "text-primary" },
          { label: "Last 7 Days", value: stats.last7d, icon: RefreshCw, color: "text-amber-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-3 flex items-center gap-3">
            <Icon className={`h-4 w-4 ${color || "text-muted-foreground"}`} />
            <div>
              <p className="text-lg font-bold leading-none">{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Data Health */}
      {(stats.missingAttribution > 0 || stats.missingReferrer > 0) && (
        <Card className="p-3 border-amber-500/20 bg-amber-500/[0.04] space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" /> Data Health
          </div>
          {stats.missingAttribution > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {stats.missingAttribution} row(s) with status "signed_up" but missing referred_user_id
            </p>
          )}
          {stats.missingReferrer > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {stats.missingReferrer} row(s) with missing referrer
            </p>
          )}
          <p className="text-[11px] text-muted-foreground italic">
            Paid/converted tracking is not wired yet — V2 scope.
          </p>
        </Card>
      )}

      {/* Search + Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search referrer, referred email, user ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {["all", "clicked", "signed_up"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              className="text-xs h-8 px-3"
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "All" : s === "clicked" ? "Clicked" : "Signed Up"}
            </Button>
          ))}
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
        <span className="text-xs text-muted-foreground">{filtered.length} records</span>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Referrer</TableHead>
                <TableHead>Referred</TableHead>
                <TableHead>Referral ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                    No referral records found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-white/[0.02]"
                    onClick={() => setSelectedRow(r)}
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateShort(r.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[r.status] || ""}`}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.referrer_name || r.referrer_email || (
                        <span className="font-mono text-xs text-muted-foreground">
                          {r.referrer_user_id.slice(0, 8)}…
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.referred_email || (r.referred_user_id ? `${r.referred_user_id.slice(0, 8)}…` : "—")}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyToClip(r.id); }}
                        className="text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        {r.id.slice(0, 8)}… <Copy className="h-3 w-3" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Detail Dialog */}
      {selectedRow && (
        <ReferralDetailDialog row={selectedRow} onClose={() => setSelectedRow(null)} />
      )}
    </div>
  );
}

// ─── Detail Dialog ───

function ReferralDetailDialog({ row, onClose }: { row: ReferralRow; onClose: () => void }) {
  const fields = [
    { label: "Referral ID", value: row.id, copyable: true },
    { label: "Status", value: row.status, badge: true },
    { label: "Referrer User ID", value: row.referrer_user_id, copyable: true },
    { label: "Referrer Email", value: row.referrer_email || "—" },
    { label: "Referrer Name", value: row.referrer_name || "—" },
    { label: "Referred User ID", value: row.referred_user_id || "—", copyable: !!row.referred_user_id },
    { label: "Referred Email", value: row.referred_email || "—" },
    { label: "Created", value: formatDateTimeFull(row.created_at) },
  ];

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Referral Detail</DialogTitle>
          <DialogDescription className="text-xs">
            Full record for debugging and verification.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {fields.map(({ label, value, copyable, badge }) => (
            <div key={label} className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground text-xs shrink-0">{label}</span>
              <div className="flex items-center gap-1.5 min-w-0">
                {badge ? (
                  <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[value as string] || ""}`}>
                    {value}
                  </Badge>
                ) : (
                  <span className="text-xs font-mono truncate">{value}</span>
                )}
                {copyable && value && value !== "—" && (
                  <button onClick={() => copyToClip(value as string)} className="shrink-0">
                    <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
