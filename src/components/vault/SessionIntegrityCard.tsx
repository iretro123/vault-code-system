import { useVaultSessionIntegrity } from "@/hooks/useVaultSessionIntegrity";
import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export function SessionIntegrityCard() {
  const { trades, verified, integrity, loading, error } = useVaultSessionIntegrity();

  if (error) {
    return (
      <Card className="p-4 border-destructive/30 bg-destructive/5">
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>Error loading integrity</span>
        </div>
      </Card>
    );
  }

  const getIntegrityColor = () => {
    if (integrity >= 100) return "text-status-active";
    if (integrity >= 80) return "text-status-warning";
    return "text-destructive";
  };

  const getIntegrityIcon = () => {
    if (integrity >= 100) return <CheckCircle2 className="h-4 w-4 text-status-active" />;
    if (integrity >= 80) return <Shield className="h-4 w-4 text-status-warning" />;
    return <AlertTriangle className="h-4 w-4 text-destructive" />;
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        {getIntegrityIcon()}
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Session Integrity</span>
      </div>

      <div className="flex items-baseline gap-1 mb-2">
        <span className={cn("text-3xl font-bold font-mono", loading ? "text-muted-foreground" : getIntegrityColor())}>
          {loading ? "—" : `${integrity}%`}
        </span>
      </div>

      <div className="text-xs text-muted-foreground">
        {loading ? (
          "Loading..."
        ) : (
          <>
            <span className="font-medium text-foreground">{verified}</span> of{" "}
            <span className="font-medium text-foreground">{trades}</span> trades vault-verified today
          </>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            integrity >= 100 && "bg-status-active",
            integrity >= 80 && integrity < 100 && "bg-status-warning",
            integrity < 80 && "bg-destructive"
          )}
          style={{ width: `${loading ? 0 : integrity}%` }}
        />
      </div>
    </Card>
  );
}
