import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Shield className="h-5 w-5 animate-pulse" />
          <span className="text-sm">Loading Vault...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="vault-card w-full max-w-sm p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-6">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Sign in to use Vault OS
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Authenticate to access your trading discipline system.
          </p>
          <Button
            className="w-full h-12 text-base font-medium"
            onClick={() => navigate("/auth")}
          >
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
