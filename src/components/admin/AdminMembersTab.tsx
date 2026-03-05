import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Download, Loader2, Search, UserX, Ban, RotateCcw, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { useAuth } from "@/hooks/useAuth";
import { formatDateWithYear, formatDateTimeFull } from "@/lib/formatTime";
import { toast } from "sonner";
import { format } from "date-fns";
import { AcademyRoleBadge } from "@/components/academy/AcademyRoleBadge";

interface UserRow {
  user_id: string;
  display_name: string | null;
  username: string | null;
  email: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  timezone: string;
  academy_experience: string;
  access_status: string;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

interface AcademyRole {
  id: string;
  name: string;
}

type ConfirmAction = {
  type: "kick" | "ban" | "reset";
  userId: string;
  displayName: string;
};

export function AdminMembersTab() {
  const { isCEO, isAdmin } = useAcademyPermissions();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userRoles, setUserRoles] = useState<Map<string, string>>(new Map());
  const [roles, setRoles] = useState<AcademyRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addStripeId, setAddStripeId] = useState("");
  const [addingUser, setAddingUser] = useState(false);

  const fetchData = useCallback(async () => {
    const [{ data: usersData }, { data: rolesData }, { data: userRolesData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, display_name, username, email, phone_number, avatar_url, timezone, academy_experience, access_status, is_banned, created_at, updated_at")
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

  const logAuditAction = async (action: string, targetUserId: string, metadata: Record<string, unknown> = {}) => {
    if (!user?.id) return;
    await supabase.from("audit_logs" as any).insert({
      admin_id: user.id,
      action,
      target_user_id: targetUserId,
      metadata,
    } as any);
  };

  const handleRoleChange = async (userId: string, newRoleName: string) => {
    const role = roles.find((r) => r.name === newRoleName);
    if (!role) return;
    const oldRole = userRoles.get(userId) || "Member";
    setUpdatingUser(userId);

    const { error } = await supabase
      .from("academy_user_roles")
      .upsert({ user_id: userId, role_id: role.id } as any, { onConflict: "user_id" });

    if (error) {
      toast.error("Failed to update role: " + error.message);
    } else {
      setUserRoles((prev) => new Map(prev).set(userId, newRoleName));
      toast.success(`Role updated to ${newRoleName}`);
      await logAuditAction("role_change", userId, { from: oldRole, to: newRoleName });
    }
    setUpdatingUser(null);
  };

  const handleKick = async () => {
    if (!confirmAction || confirmAction.type !== "kick") return;
    const { userId, displayName } = confirmAction;
    setUpdatingUser(userId);
    setConfirmAction(null);

    const { error } = await supabase.from("profiles").update({ access_status: "revoked" }).eq("user_id", userId);
    if (error) {
      toast.error("Failed to kick user");
    } else {
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, access_status: "revoked" } : u));
      toast.success(`${displayName || "User"} removed from Academy`);
      await logAuditAction("kick", userId, { display_name: displayName });
    }
    setUpdatingUser(null);
  };

  const handleBan = async () => {
    if (!confirmAction || confirmAction.type !== "ban") return;
    const { userId, displayName } = confirmAction;
    setUpdatingUser(userId);
    setConfirmAction(null);

    const { error } = await supabase.from("profiles").update({
      access_status: "revoked",
      is_banned: true,
    } as any).eq("user_id", userId);

    if (error) {
      toast.error("Failed to ban user");
    } else {
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, access_status: "revoked", is_banned: true } : u));
      toast.success(`${displayName || "User"} banned`);
      await logAuditAction("ban", userId, { display_name: displayName });
    }
    setUpdatingUser(null);
  };

  const handleResetProgress = async () => {
    if (!confirmAction || confirmAction.type !== "reset") return;
    const { userId, displayName } = confirmAction;
    setUpdatingUser(userId);
    setConfirmAction(null);

    const { error } = await supabase.from("lesson_progress").delete().eq("user_id", userId);
    if (error) {
      toast.error("Failed to reset progress");
    } else {
      toast.success(`Progress reset for ${displayName || "user"}`);
      await logAuditAction("reset_progress", userId, { display_name: displayName });
    }
    setUpdatingUser(null);
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "kick") handleKick();
    else if (confirmAction.type === "ban") handleBan();
    else if (confirmAction.type === "reset") handleResetProgress();
  };

  const handleExport = () => {
    const header = ["Display Name", "Email", "Phone", "Role", "Access", "Banned", "Experience", "Joined"];
    const rows = filteredUsers.map((u) => [
      u.display_name || "",
      u.email || "",
      u.phone_number || "",
      userRoles.get(u.user_id) || "Member",
      u.access_status,
      u.is_banned ? "Yes" : "No",
      u.academy_experience,
      u.created_at ? format(new Date(u.created_at), "yyyy-MM-dd") : "",
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `academy-members-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredUsers = users
    .filter((u) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (u.display_name?.toLowerCase().includes(q)) ||
        (u.email?.toLowerCase().includes(q)) ||
        (u.username?.toLowerCase().includes(q)) ||
        (u.phone_number?.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      // Pin CEO/Admin/Coach to top
      const roleOrder = (userId: string) => {
        const r = userRoles.get(userId);
        if (r === "CEO") return 0;
        if (r === "Admin") return 1;
        if (r === "Coach") return 2;
        return 3;
      };
      return roleOrder(a.user_id) - roleOrder(b.user_id);
    });

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  const confirmMessages: Record<string, { title: string; description: string; actionLabel: string }> = {
    kick: {
      title: "Remove from Academy",
      description: `This will revoke access for "${confirmAction?.displayName || "this user"}". They won't be able to access Academy routes until reinstated.`,
      actionLabel: "Remove",
    },
    ban: {
      title: "Ban User",
      description: `This will permanently ban "${confirmAction?.displayName || "this user"}" and prevent them from logging into Academy. This is a serious action.`,
      actionLabel: "Ban User",
    },
    reset: {
      title: "Reset User Progress",
      description: `This will delete all lesson progress for "${confirmAction?.displayName || "this user"}". This cannot be undone.`,
      actionLabel: "Reset Progress",
    },
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentConfirm = confirmAction ? confirmMessages[confirmAction.type] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Button onClick={() => setAddUserOpen(true)} variant="default" size="sm" className="gap-1.5">
          <UserPlus className="h-3.5 w-3.5" /> Add User
        </Button>
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
                <TableHead>Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Active</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => {
                const roleName = userRoles.get(u.user_id) || "Member";
                return (
                  <TableRow key={u.user_id} className={u.is_banned ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] font-medium bg-muted">
                            {getInitials(u.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm truncate">{u.display_name || "—"}</span>
                            <AcademyRoleBadge roleName={roleName} />
                            {u.is_banned && (
                              <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded font-medium">
                                BANNED
                              </span>
                            )}
                          </div>
                          {u.username && (
                            <span className="text-xs text-muted-foreground">@{u.username}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.phone_number || "—"}</TableCell>
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
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDateWithYear(u.created_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {u.updated_at ? formatDateTimeFull(u.updated_at) : "—"}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Remove from Academy"
                            disabled={updatingUser === u.user_id || u.access_status === "revoked"}
                            onClick={() => setConfirmAction({ type: "kick", userId: u.user_id, displayName: u.display_name || "Unknown" })}
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Ban user"
                            disabled={updatingUser === u.user_id || u.is_banned}
                            onClick={() => setConfirmAction({ type: "ban", userId: u.user_id, displayName: u.display_name || "Unknown" })}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Reset progress"
                            disabled={updatingUser === u.user_id}
                            onClick={() => setConfirmAction({ type: "reset", userId: u.user_id, displayName: u.display_name || "Unknown" })}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Confirmation Modal */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{currentConfirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{currentConfirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={confirmAction?.type === "ban" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {currentConfirm?.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add User Dialog */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add User to Whitelist</DialogTitle>
            <DialogDescription>
              Pre-authorize an email so they can create an account — even without an existing membership.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!addEmail.trim() || !user?.id) return;
              setAddingUser(true);
              const { error } = await supabase.from("allowed_signups" as any).insert({
                email: addEmail.trim().toLowerCase(),
                stripe_customer_id: addStripeId.trim() || null,
                added_by: user.id,
              } as any);
              if (error) {
                if (error.code === "23505") {
                  toast.error("This email is already on the whitelist.");
                } else {
                  toast.error("Failed to add user: " + error.message);
                }
              } else {
                toast.success(`${addEmail.trim()} added to whitelist.`);
                await logAuditAction("whitelist_add", user.id, { email: addEmail.trim().toLowerCase(), stripe_customer_id: addStripeId.trim() || null });
                setAddEmail("");
                setAddStripeId("");
                setAddUserOpen(false);
              }
              setAddingUser(false);
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="add-email" className="text-sm">Email <span className="text-destructive">*</span></Label>
              <Input
                id="add-email"
                type="email"
                placeholder="user@example.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="add-stripe" className="text-sm">
                Stripe Customer ID <span className="text-muted-foreground/50">(optional)</span>
              </Label>
              <Input
                id="add-stripe"
                placeholder="cus_xxxxxxxxxx"
                value={addStripeId}
                onChange={(e) => setAddStripeId(e.target.value)}
                className="mt-1.5"
              />
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Paste from Stripe dashboard to link billing for this user.
              </p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={addingUser || !addEmail.trim()} className="gap-1.5">
                {addingUser ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                Add User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
