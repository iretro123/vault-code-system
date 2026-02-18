import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, Loader2, Crown, Shield, Zap, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { formatDateWithYear } from "@/lib/formatTime";
import { toast } from "sonner";
import { format } from "date-fns";
import { AcademyRoleBadge } from "@/components/academy/AcademyRoleBadge";

interface UserRow {
  user_id: string;
  display_name: string | null;
  username: string | null;
  email: string | null;
  phone_number: string | null;
  timezone: string;
  academy_experience: string;
  access_status: string;
  created_at: string;
  updated_at: string;
}

interface AcademyUserRole {
  user_id: string;
  role_id: string;
  academy_roles: { name: string } | null;
}

interface AcademyRole {
  id: string;
  name: string;
}

export function AdminMembersTab() {
  const { isCEO } = useAcademyPermissions();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userRoles, setUserRoles] = useState<Map<string, string>>(new Map());
  const [roles, setRoles] = useState<AcademyRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    const [{ data: usersData }, { data: rolesData }, { data: userRolesData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, display_name, username, email, phone_number, timezone, academy_experience, access_status, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("academy_roles").select("id, name").order("sort_order"),
      supabase.from("academy_user_roles").select("user_id, role_id, academy_roles(name)"),
    ]);

    setUsers((usersData as UserRow[]) || []);
    setRoles((rolesData as AcademyRole[]) || []);

    const map = new Map<string, string>();
    if (userRolesData) {
      for (const r of userRolesData) {
        map.set(r.user_id, (r as any).academy_roles?.name ?? "Member");
      }
    }
    setUserRoles(map);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRoleChange = async (userId: string, newRoleName: string) => {
    const role = roles.find((r) => r.name === newRoleName);
    if (!role) return;
    setUpdatingUser(userId);

    const { error } = await supabase
      .from("academy_user_roles")
      .upsert({ user_id: userId, role_id: role.id } as any, { onConflict: "user_id" });

    if (error) {
      toast.error("Failed to update role: " + error.message);
    } else {
      setUserRoles((prev) => new Map(prev).set(userId, newRoleName));
      toast.success(`Role updated to ${newRoleName}`);
    }
    setUpdatingUser(null);
  };

  const handleAccessChange = async (userId: string, newStatus: string) => {
    setUpdatingUser(userId);
    const { error } = await supabase.from("profiles").update({ access_status: newStatus }).eq("user_id", userId);
    if (error) toast.error("Failed to update access");
    else {
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, access_status: newStatus } : u));
      toast.success(`Access updated to ${newStatus}`);
    }
    setUpdatingUser(null);
  };

  const handleExport = () => {
    const header = ["Display Name", "Email", "Role", "Access", "Experience", "Joined"];
    const rows = filteredUsers.map((u) => [
      u.display_name || "",
      u.email || "",
      userRoles.get(u.user_id) || "Member",
      u.access_status,
      u.academy_experience,
      u.created_at ? format(new Date(u.created_at), "yyyy-MM-dd") : "",
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `academy-members-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.display_name?.toLowerCase().includes(q)) ||
      (u.email?.toLowerCase().includes(q)) ||
      (u.username?.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Button onClick={handleExport} variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
        <span className="text-xs text-muted-foreground">{filteredUsers.length} members</span>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => {
                const roleName = userRoles.get(u.user_id) || "Member";
                return (
                  <TableRow key={u.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.display_name || "—"}</span>
                        <AcademyRoleBadge roleName={roleName} />
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email || "—"}</TableCell>
                    <TableCell>
                      {isCEO ? (
                        <Select
                          value={roleName}
                          onValueChange={(val) => handleRoleChange(u.user_id, val)}
                          disabled={updatingUser === u.user_id}
                        >
                          <SelectTrigger className="w-[110px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((r) => (
                              <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm">{roleName}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isCEO ? (
                        <Select
                          value={u.access_status}
                          onValueChange={(val) => handleAccessChange(u.user_id, val)}
                          disabled={updatingUser === u.user_id}
                        >
                          <SelectTrigger className="w-[100px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trial">Trial</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="revoked">Revoked</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs capitalize bg-muted px-1.5 py-0.5 rounded">{u.access_status}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs capitalize bg-muted px-1.5 py-0.5 rounded">{u.academy_experience}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDateWithYear(u.created_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
