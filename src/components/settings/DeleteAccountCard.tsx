import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type DeleteAccountCardProps = {
  autoOpen?: boolean;
};

export function DeleteAccountCard({ autoOpen = false }: DeleteAccountCardProps) {
  const navigate = useNavigate();
  const [showDeleteGate, setShowDeleteGate] = useState(autoOpen);
  const [accountDeleteInput, setAccountDeleteInput] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    if (accountDeleteInput !== "DELETE") return;
    setDeletingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: {},
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Account deletion failed");
      }

      await supabase.auth.signOut();
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        void 0;
      }

      toast.success("Your account has been deleted.");
      navigate("/auth", { replace: true });
    } catch (error: unknown) {
      console.error("Error deleting account:", error);
      toast.error(error instanceof Error ? error.message : "We couldn't delete your account. Please try again.");
    } finally {
      setDeletingAccount(false);
    }
  };

  return !showDeleteGate ? (
    <Button
      variant="outline"
      className="w-full gap-2 justify-start text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5"
      onClick={() => setShowDeleteGate(true)}
    >
      <Trash2 className="h-4 w-4" />
      Delete My Account
    </Button>
  ) : (
    <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-foreground">Delete Account</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Deleting your account is permanent. This will remove your profile and app data. This action cannot be undone.
          </p>
        </div>
      </div>
      <div>
        <p className="text-xs text-foreground mb-1.5">
          Type <span className="font-mono text-destructive font-semibold">DELETE</span> to confirm.
        </p>
        <div className="flex gap-2 items-center">
          <Input
            className="max-w-[120px] h-8 text-sm font-mono"
            placeholder="DELETE"
            value={accountDeleteInput}
            onChange={(e) => setAccountDeleteInput(e.target.value.toUpperCase())}
          />
          <Button
            size="sm"
            variant="destructive"
            disabled={accountDeleteInput !== "DELETE" || deletingAccount}
            onClick={handleDeleteAccount}
            className="h-8"
          >
            {deletingAccount ? "Deleting..." : "Confirm Delete"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => { setShowDeleteGate(false); setAccountDeleteInput(""); }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
