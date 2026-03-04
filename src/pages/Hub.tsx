import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { PlayerIdentity } from "@/components/layout/PlayerIdentity";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { Shield, Lock, Loader2 } from "lucide-react";
import vaultAcademyLogo from "@/assets/vault-academy-logo.png";
import { Link } from "react-router-dom";

const Hub = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { isCEO, isOperator } = useAcademyPermissions();
  const canAccessVaultOS = isCEO || isOperator;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/hub" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-lg font-bold tracking-tight text-foreground">
              Vault<span className="text-primary">HQ</span>
            </span>
          </Link>
          <PlayerIdentity />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Select Mode
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Choose your training ground
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Vault Academy — Active */}
            <button
              onClick={() => navigate("/academy")}
              className="group relative flex flex-col items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-8 text-left transition-all hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <img src={vaultAcademyLogo} alt="Vault Academy" className="h-[72px] w-auto mb-1" />
              <div className="text-center">
                <h2 className="text-lg font-semibold text-foreground">Vault Academy</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Master the discipline side of trading
                </p>
              </div>
              <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Enter Academy →
              </span>
            </button>

            {/* Vault OS Beta — Disabled */}
            <div className="relative flex flex-col items-center gap-4 rounded-xl border border-border bg-muted/5 p-8 opacity-50 cursor-not-allowed select-none">
              {/* Coming Soon badge */}
              <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Lock className="h-3 w-3" />
                Coming Soon
              </span>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/20">
                <Shield className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-muted-foreground">Vault OS</h2>
                <p className="mt-1 text-sm text-muted-foreground/70">
                  Real-time risk operating system
                </p>
              </div>
              <span className="mt-2 inline-flex items-center rounded-full bg-muted/20 px-3 py-1 text-xs font-medium text-muted-foreground">
                Beta
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Hub;
