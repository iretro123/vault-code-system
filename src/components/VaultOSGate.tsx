import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";

export function VaultOSGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { isCEO, isOperator } = useAcademyPermissions();

  if (isCEO || isOperator) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-sm space-y-6">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <Shield className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">Vault OS Beta</h1>
          <p className="text-sm text-muted-foreground">
            Vault OS Beta is not enabled on your account yet.
          </p>
        </div>
        <Button onClick={() => navigate("/academy")} className="gap-2">
          Back to Hub
        </Button>
      </div>
    </div>
  );
}
