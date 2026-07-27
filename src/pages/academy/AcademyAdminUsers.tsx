import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Download, Loader2, Search, Users, UserCheck, CreditCard, BellRing, UserCog } from "lucide-react";
import { useAcademyRole } from "@/hooks/useAcademyRole";
import { Navigate } from "react-router-dom";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { formatDateExport, formatDateWithYear } from "@/lib/formatTime";
import { SHARED_GUEST_EMAIL } from "@/lib/membership";
import { cn } from "@/lib/utils";

type Audience = "Paid" | "Free/Basic" | "Shared Guest" | "Internal" | "Unknown";

interface UserRow {
  user_id: string;
  display_name: string | null;
  username: string | null;
  email: string | null;
  phone_number: string | null;
  timezone: string | null;
  academy_experience: string | null;
  access_status: string | null;
  is_banned: boolean | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
  role: string | null;
  subscription_status: string | null;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  device_count: number;
  device_platforms: string[];
  device_last_seen: string | null;
  audience: Audience;
}

const PAID_ROLES = new Set(["vault_access", "vault_intelligence"]);
const INTERNAL_ROLES = new Set(["vault_os_owner", "operator"]);
const FREE_ROLES = new Set(["basic_tier", "free"]);

function classify(email: string | null, role: string | null): Audience {
  if ((email ?? "").trim().toLowerCase() === SHARED_GUEST_EMAIL) return "Shared Guest";
  if (role && INTERNAL_ROLES.has(role)) return "Internal";
  if (role && PAID_ROLES.has(role)) return "Paid";
  if (role && FREE_ROLES.has(role)) return "Free/Basic";
  return "Unknown";
}

const AUDIENCE_STYLES: Record<Audience, string> = {
  Paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "Free/Basic": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Shared Guest": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Internal: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  Unknown: "bg-white/[0.06] text-muted-foreground border-white/[0.08]",
};

function escapeCsv(val: string) {
  if (/[",\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
  return val;
}

type FilterKey = "all" | "free" | "paid" | "push" | "guest";

const AcademyAdminUsers = () => {
  const { isAdmin } = useAcademyRole();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: devices }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, display_name, username, email, phone_number, timezone, academy_experience, access_status, is_banned, last_seen_at, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase
        .from("user_roles")
        .select("user_id, role, subscription_status, subscription_started_at, subscription_expires_at"),
      supabase
        .from("device_tokens")
        .select("user_id, platform, last_seen_at"),
    ]);

    const roleMap = new Map<string, { role: string; subscription_status: string | null; subscription_started_at: string | null; subscription_expires_at: string | null }>();
    (roles ?? []).forEach((r: any) => {
      // prefer highest priority role
      const prev = roleMap.get(r.user_id);
      const priority = (role: string) =>
        INTERNAL_ROLES.has(role) ? 4 : PAID_ROLES.has(role) ? 3 : FREE_ROLES.has(role) ? 2 : 1;
      if (!prev || priority(r.role) > priority(prev.role)) {
        roleMap.set(r.user_id, {
          role: r.role,
          subscription_status: r.subscription_status ?? null,
          subscription_started_at: r.subscription_started_at ?? null,
          subscription_expires_at: r.subscription_expires_at ?? null,
        });
      }
    });

    const deviceMap = new Map<string, { count: number; platforms: Set<string>; last_seen: string | null }>();
    (devices ?? []).forEach((d: any) => {
      if (!d.user_id) return;
      const entry = deviceMap.get(d.user_id) ?? { count: 0, platforms: new Set<string>(), last_seen: null };
      entry.count += 1;
      if (d.platform) entry.platforms.add(String(d.platform));
      if (d.last_seen_at && (!entry.last_seen || d.last_seen_at > entry.last_seen)) {
        entry.last_seen = d.last_seen_at;
      }
      deviceMap.set(d.user_id, entry);
    });

    const rows: UserRow[] = (profiles ?? []).map((p: any) => {
      const r = roleMap.get(p.user_id);
      const dev = deviceMap.get(p.user_id);
      const role = r?.role ?? null;
      return {
        user_id: p.user_id,
        display_name: p.display_name,
        username: p.username,
        email: p.email,
        phone_number: p.phone_number,
        timezone: p.timezone,
        academy_experience: p.academy_experience,
        access_status: p.access_status,
        is_banned: p.is_banned,
        last_seen_at: p.last_seen_at,
        created_at: p.created_at,
        updated_at: p.updated_at,
        role,
        subscription_status: r?.subscription_status ?? null,
        subscription_started_at: r?.subscription_started_at ?? null,
        subscription_expires_at: r?.subscription_expires_at ?? null,
        device_count: dev?.count ?? 0,
        device_platforms: dev ? Array.from(dev.platforms) : [],
        device_last_seen: dev?.last_seen ?? null,
        audience: classify(p.email, role),
      };
    });

    setUsers(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  const stats = useMemo(() => {
    const total = users.length;
    const free = users.filter((u) => u.audience === "Free/Basic").length;
    const paid = users.filter((u) => u.audience === "Paid").length;
    const push = users.filter((u) => u.device_count > 0).length;
    const guest = users.filter((u) => u.audience === "Shared Guest").length;
    return { total, free, paid, push, guest };
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "free" && u.audience !== "Free/Basic") return false;
      if (filter === "paid" && u.audience !== "Paid") return false;
      if (filter === "guest" && u.audience !== "Shared Guest") return false;
      if (filter === "push" && u.device_count === 0) return false;
      if (!q) return true;
      const hay = [
        u.display_name,
        u.username,
        u.email,
        u.phone_number,
        u.role,
        u.audience,
        u.timezone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [users, filter, search]);

  if (!isAdmin) return <Navigate to="/academy/home" replace />;

  const handleExport = () => {
    const header = [
      "Display Name", "Username", "Email", "Phone", "Audience", "Role",
      "Push Platforms", "Push Last Seen", "Timezone", "Experience",
      "Access Status", "Subscription Status", "Subscription Started", "Subscription Expires",
      "Joined", "Last Active",
    ];
    const rows = filtered.map((u) => [
      escapeCsv(u.display_name || ""),
      escapeCsv(u.username || ""),
      escapeCsv(u.email || ""),
      escapeCsv(u.phone_number || ""),
      escapeCsv(u.audience),
      escapeCsv(u.role || ""),
      escapeCsv(u.device_platforms.join("|")),
      escapeCsv(u.device_last_seen ? formatDateExport(u.device_last_seen) : ""),
      escapeCsv(u.timezone || ""),
      escapeCsv(u.academy_experience || ""),
      escapeCsv(u.access_status || ""),
      escapeCsv(u.subscription_status || ""),
      escapeCsv(u.subscription_started_at ? formatDateExport(u.subscription_started_at) : ""),
      escapeCsv(u.subscription_expires_at ? formatDateExport(u.subscription_expires_at) : ""),
      escapeCsv(u.created_at ? formatDateExport(u.created_at) : ""),
      escapeCsv((u.last_seen_at ?? u.updated_at) ? formatDateExport((u.last_seen_at ?? u.updated_at)!) : ""),
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `academy-users-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="Track free/basic users, paid members, push-enabled devices, and the shared guest account"
        action={
          <Button onClick={handleExport} disabled={loading || filtered.length === 0} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        }
      />
      <div className="px-4 md:px-6 pb-6 space-y-4">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={Users} label="Total Users" value={stats.total} tint="text-foreground" />
          <StatCard icon={UserCheck} label="Free/Basic" value={stats.free} tint="text-blue-400" />
          <StatCard icon={CreditCard} label="Paid Members" value={stats.paid} tint="text-emerald-400" />
          <StatCard icon={BellRing} label="Push Enabled" value={stats.push} tint="text-cyan-400" />
          <StatCard icon={UserCog} label="Shared Guest" value={stats.guest} tint="text-amber-400" />
        </div>

        {/* Amber warning */}
        <Card className="p-3 md:p-4 border-amber-500/30 bg-amber-500/[0.06]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-400 shrink-0" />
            <p className="text-xs md:text-sm text-amber-200/90 leading-relaxed">
              Free accounts are tracked individually once users create an account. Shared guest mode is visible here as one shared account, so it should not be used for identity-level lead tracking.
            </p>
          </div>
        </Card>

        {/* Filters + search */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
            <TabsList className="bg-white/[0.03] border border-white/[0.06] p-1 h-auto flex-wrap gap-1">
              <TabsTrigger value="all" className="text-xs px-3 py-1.5 data-[state=active]:bg-white/[0.08]">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="free" className="text-xs px-3 py-1.5 data-[state=active]:bg-white/[0.08]">Free/Basic ({stats.free})</TabsTrigger>
              <TabsTrigger value="paid" className="text-xs px-3 py-1.5 data-[state=active]:bg-white/[0.08]">Paid ({stats.paid})</TabsTrigger>
              <TabsTrigger value="push" className="text-xs px-3 py-1.5 data-[state=active]:bg-white/[0.08]">Push ({stats.push})</TabsTrigger>
              <TabsTrigger value="guest" className="text-xs px-3 py-1.5 data-[state=active]:bg-white/[0.08]">Shared Guest ({stats.guest})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative md:w-72">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone, role…"
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No users match your filters.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Push</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{u.display_name || u.username || "—"}</span>
                          {u.username && u.display_name && (
                            <span className="text-[11px] text-muted-foreground">@{u.username}</span>
                          )}
                          {u.role && (
                            <span className="text-[10px] text-muted-foreground mt-0.5">{u.role}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          AUDIENCE_STYLES[u.audience]
                        )}>
                          {u.audience}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex flex-col gap-0.5">
                          <span>{u.email || "—"}</span>
                          {u.phone_number && <span>{u.phone_number}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {u.device_count > 0 ? (
                          <div className="flex flex-col">
                            <span className="text-cyan-400 font-medium">
                              {u.device_count} device{u.device_count === 1 ? "" : "s"}
                            </span>
                            {u.device_platforms.length > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                {u.device_platforms.join(", ")}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not enabled</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className={cn(
                            "capitalize",
                            u.is_banned ? "text-red-400" :
                            u.access_status === "active" ? "text-emerald-400" :
                            u.access_status === "past_due" ? "text-amber-400" :
                            "text-muted-foreground"
                          )}>
                            {u.is_banned ? "banned" : (u.access_status || "—")}
                          </span>
                          {u.subscription_status && (
                            <span className="text-[10px] text-muted-foreground">{u.subscription_status}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDateWithYear(u.created_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {u.last_seen_at ? formatDateWithYear(u.last_seen_at) : formatDateWithYear(u.updated_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
};

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <Card className="p-3 md:p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("h-3.5 w-3.5", tint)} />
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <div className={cn("text-2xl font-semibold tabular-nums", tint)}>{value}</div>
    </Card>
  );
}

export default AcademyAdminUsers;
