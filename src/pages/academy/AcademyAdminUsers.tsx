import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, Loader2 } from "lucide-react";
import { useAcademyRole } from "@/hooks/useAcademyRole";
import { Navigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { formatDateExport, formatDateWithYear } from "@/lib/formatTime";

interface UserRow {
  display_name: string | null;
  username: string | null;
  email: string | null;
  phone_number: string | null;
  timezone: string;
  academy_experience: string;
  created_at: string;
  updated_at: string;
}

function escapeCsv(val: string) {
  if (/[",\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
  return val;
}

const AcademyAdminUsers = () => {
  const { isAdmin } = useAcademyRole();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, username, email, phone_number, timezone, academy_experience, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    setUsers((data as UserRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  if (!isAdmin) return <Navigate to="/academy/home" replace />;

  const handleExport = () => {
    const header = ["Display Name", "Email", "Phone", "Timezone", "Experience Level", "Joined At", "Last Active At"];
    const rows = users.map((u) => [
      escapeCsv(u.display_name || ""),
      escapeCsv(u.email || ""),
      escapeCsv(u.phone_number || ""),
      escapeCsv(u.timezone || ""),
      escapeCsv(u.academy_experience),
      escapeCsv(u.created_at ? formatDateExport(u.created_at) : ""),
      escapeCsv(u.updated_at ? formatDateExport(u.updated_at) : ""),
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
    <AcademyLayout>
      <PageHeader
        title="User Export"
        subtitle="View and export Academy user data"
        action={
          <Button onClick={handleExport} disabled={loading || users.length === 0} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        }
      />
      <div className="px-4 md:px-6 pb-6 space-y-4">
        <p className="text-xs text-muted-foreground max-w-xl">
          Phone numbers are shown only when provided by the user. Phone is used for important account/support alerts only.
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <Card className="p-6 text-center max-w-2xl">
            <p className="text-sm text-muted-foreground">No users found.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                   <TableHead>Phone</TableHead>
                   <TableHead>Timezone</TableHead>
                   <TableHead>Experience</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{u.display_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.username || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.phone_number || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{u.timezone || "—"}</TableCell>
                    <TableCell>
                      <span className="text-xs font-medium capitalize bg-muted px-1.5 py-0.5 rounded">
                        {u.academy_experience}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDateWithYear(u.created_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDateWithYear(u.updated_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AcademyLayout>
  );
};

export default AcademyAdminUsers;
