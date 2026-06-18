import { Card } from "@/components/ui/card";
import { DeleteAccountCard } from "@/components/settings/DeleteAccountCard";
import { useSearchParams } from "react-router-dom";

export function SettingsAccount() {
  const [searchParams] = useSearchParams();
  const autoOpenDeleteAccount = searchParams.get("focus") === "delete-account";

  return (
    <Card className="vault-card p-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Account</h3>
        <p className="text-xs text-muted-foreground">
          Manage your account access and permanently delete your account inside the app.
        </p>
      </div>

      <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Delete Account</p>
        <p className="text-xs text-muted-foreground">
          Deleting your account is permanent. This will remove your profile and app data. This action cannot be undone.
        </p>
        <DeleteAccountCard autoOpen={autoOpenDeleteAccount} />
      </div>
    </Card>
  );
}
